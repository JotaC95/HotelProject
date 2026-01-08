from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Room, StaffAvailability, WorkShift, CleaningTypeDefinition
from accounts.models import CustomUser
from .serializers import StaffAvailabilitySerializer, WorkShiftSerializer
from django.utils.dateparse import parse_date
from datetime import timedelta, date, datetime
from django.db.models import Sum
from django.utils import timezone

class AvailabilityViewSet(viewsets.ModelViewSet):
    queryset = StaffAvailability.objects.all()
    serializer_class = StaffAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users see their own, Supervisors see all
        if self.request.user.role == 'CLEANER':
            return self.queryset.filter(user=self.request.user)
        return self.queryset

class IsAdminOrReceptionOrSupervisor(permissions.BasePermission):
    def has_permission(self, request, view):
        # Allow read-only for cleaners? Or maybe just restrict generation
        if request.user.is_superuser or request.user.role in ['ADMIN', 'RECEPTION', 'SUPERVISOR']:
            return True
        return False

from .logic.priority import get_room_priority_score

class RosterViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['generate', 'forecast']:
            return [IsAdminOrReceptionOrSupervisor()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def week(self, request):
        """ Get Roster for a specific week (start_date) """
        start_date_str = request.query_params.get('start_date')
        if not start_date_str:
            return Response({'error': 'start_date required'}, status=400)
        
        start_date = parse_date(start_date_str)
        end_date = start_date + timedelta(days=6)
        
        shifts = WorkShift.objects.filter(date__range=[start_date, end_date])
        if request.user.role == 'CLEANER':
            shifts = shifts.filter(user=request.user)
            
        data = WorkShiftSerializer(shifts, many=True).data
        return Response(data)

    @action(detail=False, methods=['get'])
    def forecast(self, request):
        """
        Returns Demand vs Capacity forecast for the week.
        """
        start_date_str = request.query_params.get('start_date')
        if not start_date_str:
             return Response({'error': 'start_date required'}, status=400)

        start_date = parse_date(start_date_str)
        forecast_data = []

        # Helper: Cleaning estimates
        estimates = {ct.name: ct.estimated_minutes for ct in CleaningTypeDefinition.objects.all()}
        STAYOVER_MINS = 20 # Fixed for stayer
        DEPARTURE_MINS = estimates.get('DEPARTURE', 30)

        for i in range(7):
            current_date = start_date + timedelta(days=i)
            
            # 1. Demand
            departures = Room.objects.filter(check_out_date=current_date).count()
            stayovers = Room.objects.filter(guest_status='GUEST_IN_ROOM').exclude(check_out_date=current_date).count()
            
            demand_mins = (departures * DEPARTURE_MINS) + (stayovers * STAYOVER_MINS)
            
            # 2. Capacity
            shifts = WorkShift.objects.filter(date=current_date).select_related('user')
            capacity_mins = 0
            group_capacity = {}

            for s in shifts:
                if s.start_time and s.end_time:
                    start_mins = s.start_time.hour * 60 + s.start_time.minute
                    end_mins = s.end_time.hour * 60 + s.end_time.minute
                    duration = max(end_mins - start_mins, 0)
                else:
                    duration = 480 # Default 8h

                capacity_mins += duration
                
                # Group Breakdown capacity
                gid = s.user.group_id or 'Ungrouped'
                group_capacity[gid] = group_capacity.get(gid, 0) + duration
                
                # Group Staff Count
                # (Initialize counts outside or use a separate dict)
                # But here is fine
                
            # Refined Group Stats
            group_counts = {}
            for s in shifts:
                gid = s.user.group_id or 'Ungrouped'
                group_counts[gid] = group_counts.get(gid, 0) + 1

            # 3. Assigned Load & Count (Only valid for Today)
            group_assignments = {} # Room count
            group_loads = {} # Minutes load
            
            if current_date == timezone.now().date():
                # Fetch assigned rooms to calculate precise load
                assigned_rooms = Room.objects.filter(assigned_cleaner__isnull=False).select_related('assigned_cleaner')
                for r in assigned_rooms:
                     gid = r.assigned_cleaner.group_id or 'Ungrouped'
                     
                     # Room Count
                     group_assignments[gid] = group_assignments.get(gid, 0) + 1
                     
                     # Minutes Load
                     est_mins = estimates.get(r.cleaning_type, 30)
                     group_loads[gid] = group_loads.get(gid, 0) + est_mins

            status = 'OPTIMAL'
            if capacity_mins < demand_mins:
                status = 'UNDERSTAFFED'
            elif capacity_mins > (demand_mins * 1.5):
                status = 'OVERSTAFFED'

            forecast_data.append({
                'date': current_date,
                'day_name': current_date.strftime('%A'),
                'demand_mins': demand_mins,
                'capacity_mins': capacity_mins,
                'status': status,
                'groups': group_capacity,
                'group_counts': group_counts,
                'assignments': group_assignments,
                'group_loads': group_loads
            })

            
        return Response(forecast_data)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """ 
        Auto-Generate Roster 
        """
        start_date_str = request.data.get('start_date')
        if not start_date_str:
             return Response({'error': 'start_date required'}, status=400)

        start_date = parse_date(start_date_str)
        generated_shifts = []
        alerts = []
        
        # Helper: Cleaning estimates
        estimates = {ct.name: ct.estimated_minutes for ct in CleaningTypeDefinition.objects.all()}
        STAYOVER_MINS = 20
        DEPARTURE_MINS = estimates.get('DEPARTURE', 30)

        total_assignments = {} # Track shifts per user for fairness

        # Pre-fetch staff to avoid DB hits in loop, but we need fresh availability check
        all_cleaners = list(CustomUser.objects.filter(role='CLEANER'))

        # CLEAR EXISTING SHIFTS for this week to avoid stale data (e.g. user changed to OFF)
        # We delete shifts for the range we are about to generate.
        end_date_gen = start_date + timedelta(days=6)
        WorkShift.objects.filter(date__range=[start_date, end_date_gen]).delete()

        for i in range(7):
            current_date = start_date + timedelta(days=i)
            # 1. Demand Calculation
            # Departures: Rooms checking out today
            departures = Room.objects.filter(check_out_date=current_date).count()
            
            # Stayovers: Occupied rooms NOT checking out today
            # Logic: Guest is IN, and checkout is NOT today (or None/Future)
            # We assume 'GUEST_IN_ROOM' means a stayover unless they are checking out.
            stayovers = Room.objects.filter(guest_status='GUEST_IN_ROOM').exclude(check_out_date=current_date).count() 
            
            total_minutes = (departures * DEPARTURE_MINS) + (stayovers * STAYOVER_MINS)
            
            # Staff Needed
            staff_needed = round(total_minutes / (7 * 60)) 
            if staff_needed < 1: 
                if total_minutes > 0:
                    staff_needed = 1
                else:
                    # Fallback for Demo/Empty Data: Ensure at least 1 cleaner is scheduled if we have ANY rooms in system?
                    # Or just return 0? 
                    # If user has no bookings, Roster SHOULD be empty.
                    # But to avoid confusion "It deletes everyone", maybe we check total rooms?
                    # Let's stick to demand-based. 
                    staff_needed = 0

            # DEBUG MODE / FALLBACK: If 0 demand, but we have cleaners, maybe schedule 1 per day for maintenance?
            # User request: "borra a todos".
            # Let's add a "Minimum Base Staff" rule: e.g. 1 staff/day always.
            if staff_needed == 0:
                staff_needed = 1 # Force at least 1 person rostered per day for coverage 

            # 3. Assign Staff based on Availability
            # Sort by least assigned first (load balancing across week)
            all_cleaners.sort(key=lambda s: total_assignments.get(s.id, 0))

            assigned_count = 0
            
            for staff in all_cleaners:
                # Check specific availability for this date
                try:
                    av = StaffAvailability.objects.filter(user=staff, date=current_date).first()
                    # Use filter().first() instead of get() to match multiple potential records safely (though unique constraint exists)
                    if av and av.status in ['VACATION', 'OFF']:
                        continue 
                    
                    s_time = av.start_time if (av and av.start_time) else '09:00:00'
                    e_time = av.end_time if (av and av.end_time) else '17:00:00'
                    
                except Exception:
                    s_time = '09:00:00'
                    e_time = '17:00:00'

                if assigned_count >= staff_needed:
                    break
                
                # Create Shift
                shift, created = WorkShift.objects.get_or_create(
                    user=staff,
                    date=current_date,
                    defaults={'start_time': s_time, 'end_time': e_time}
                )
                if not created:
                    # Update times if it existed (e.g. re-running generator)
                    shift.start_time = s_time
                    shift.end_time = e_time
                    shift.save()

                generated_shifts.append(WorkShiftSerializer(shift).data)
                
                total_assignments[staff.id] = total_assignments.get(staff.id, 0) + 1
                assigned_count += 1
            
            # Check Balance
            if assigned_count < staff_needed:
                deficit = staff_needed - assigned_count
                alerts.append(f"{current_date}: Shortage! Need {deficit} more cleaners.")
            elif assigned_count > staff_needed and staff_needed > 0:
                 alerts.append(f"{current_date}: Surplus. {assigned_count - staff_needed} extra staff.")

        return Response({
            'message': 'Roster Generated',
            'shifts': generated_shifts,
            'alerts': alerts,
            'demand_summary': f"Processed week starting {start_date}"
        })

class AutoAssignRoomsViewSet(viewsets.ViewSet):
    """
    Intelligently assigns rooms to available staff based on effort and priority.
    Uses Sticky Logic (Keep assigned) + Dynamic Priority Engine.
    """
    @action(detail=False, methods=['post'])
    def assign_daily(self, request):
        target_date = date.today()
        
        # 1. Get Factors
        # Cleaning Times
        estimates = {ct.name: ct.estimated_minutes for ct in CleaningTypeDefinition.objects.all()}
        # Default fallback
        def get_estimate(cleaning_type):
            return estimates.get(cleaning_type, 30)

        # 2. Get Available Staff (Those with Shifts today)
        shifts = WorkShift.objects.filter(date=target_date)
        if not shifts.exists():
             return Response({'error': 'No staff shifts found for today. Generate roster first.'}, status=400)
        
        staff_ids = []
        staff_groups = {}
        staff_load = {} # Current load in minutes
        staff_capacity = {} # Total capacity in minutes

        for shift in shifts:
            uid = shift.user.id
            staff_ids.append(uid)
            staff_groups[uid] = shift.user.group_id
            staff_load[uid] = 0
            
            # Calculate Capacity in Minutes
            s = shift.start_time
            e = shift.end_time
            if s and e:
                # Basic duration calc
                start_mins = s.hour * 60 + s.minute
                end_mins = e.hour * 60 + e.minute
                duration = end_mins - start_mins
                staff_capacity[uid] = max(duration, 60) # Min 1 hour cap
            else:
                staff_capacity[uid] = 480 # Default 8 hours

        # 2.1 Calculate Existing Load (Live Re-balancing)
        # STABILITY LOGIC: We respect existing assignments if they are already 'IN_PROGRESS' or confirmed.
        # But 'PENDING' rooms can be moved if needed?
        # For this version, we will lock 'IN_PROGRESS' rooms to their current cleaner.
        
        active_rooms = Room.objects.filter(
            assigned_cleaner__id__in=staff_ids,
            status__in=['IN_PROGRESS', 'INSPECTION', 'COMPLETED']
        )
        
        for r in active_rooms:
            effort = get_estimate(r.cleaning_type)
            staff_load[r.assigned_cleaner.id] += effort

        # 3. Get Rooms to Assign (Only Pending)
        # We re-distribute ALL pending rooms to ensure optimal priority dispatch
        dirty_rooms = Room.objects.filter(status='PENDING') 
        
        if not dirty_rooms.exists():
            return Response({'message': 'No pending rooms to assign.'})

        # 4. Sort Rooms using PRIORITY ENGINE
        rooms_list = list(dirty_rooms)
        
        def sort_key(r):
            # Dynamic Score
            score = get_room_priority_score(r)
            
            # Tie-breaker: Effort (Larger rooms first? Or smaller? Usually larger first to fill rocks)
            effort = get_estimate(r.cleaning_type)
            return (score, effort)

        rooms_list.sort(key=sort_key, reverse=True)
        
        # 5. Distribute (Smart Load Balancing)
        assignments_count = 0
        reassigned_count = 0
        unassigned_count = 0
        
        for room in rooms_list:
            # Define Effort
            effort = get_estimate(room.cleaning_type)
            MAX_CAPACITY_RATIO = 1.0 # Strict 8 hours limit

            # Helper to check if staff can take room
            def can_take_room(uid, room_effort):
                 current = staff_load[uid]
                 cap = staff_capacity[uid]
                 projected = (current + room_effort)
                 return (projected / cap) <= MAX_CAPACITY_RATIO

            # 1. Try Sticky (Preferred)
            preferred_staff_id = None
            if room.assigned_cleaner and room.assigned_cleaner.id in staff_ids:
                if can_take_room(room.assigned_cleaner.id, effort):
                    preferred_staff_id = room.assigned_cleaner.id
            
            if preferred_staff_id:
                best_staff_id = preferred_staff_id
            else:
                # 2. Find best available staff across all
                # Sort by current load ratio
                candidates = [uid for uid in staff_ids if can_take_room(uid, effort)]
                
                if not candidates:
                    best_staff_id = None
                else:
                    # Pick the one with lowest ratio
                    best_staff_id = min(candidates, key=lambda uid: staff_load[uid] / staff_capacity[uid])
                    if room.assigned_cleaner_id != best_staff_id:
                         reassigned_count += 1
            
            if best_staff_id:
                # Assign
                room.assigned_cleaner_id = best_staff_id
                room.assigned_group = staff_groups.get(best_staff_id) # Assign Group too
                room.save()
                
                # Update Load
                effort = get_estimate(room.cleaning_type)
                staff_load[best_staff_id] += effort
                assignments_count += 1
            else:
                 # Leave Unassigned (and clear any previous assignment to prevent overload)
                 if room.assigned_cleaner:
                     room.assigned_cleaner = None
                     room.assigned_group = None
                     room.save()
                 unassigned_count += 1
        
        # 6. Emergency Call-in (Phase 2)
        if unassigned_count > 0:
            # Find off-duty cleaners
            extra_cleaners = CustomUser.objects.filter(role='CLEANER', is_active=True).exclude(id__in=staff_ids)
            
            # Counter for Extra Teams
            extra_team_idx = 1
            current_team_size = 0
            
            for extra in extra_cleaners:
                if unassigned_count == 0:
                    break
                    
                # Call-in logic
                # 1. Create Shift
                WorkShift.objects.create(user=extra, date=target_date, start_time='09:00:00', end_time='17:00:00')
                
                # 2. Init Capacity
                e_id = extra.id
                staff_load[e_id] = 0
                staff_capacity[e_id] = 480 # 8 hours
                staff_ids.append(e_id)
                
                # Check Group
                # Force assignment to Extra Team
                # Pairing Logic: 2 Cleaners per Team
                e_group = f"Extra Team {extra_team_idx}"
                extra.group_id = e_group
                extra.save() 
                
                current_team_size += 1
                if current_team_size >= 2:
                    extra_team_idx += 1
                    current_team_size = 0
                    
                staff_groups[e_id] = e_group

                # 3. Assign Unassigned Rooms
                for room in rooms_list:
                    if not room.assigned_cleaner_id: # Only target unassigned
                        effort = get_estimate(room.cleaning_type)
                        if (staff_load[e_id] + effort) <= staff_capacity[e_id]:
                             room.assigned_cleaner = extra
                             room.assigned_group = e_group
                             room.save()
                             
                             staff_load[e_id] += effort
                             assignments_count += 1
                             unassigned_count -= 1
                        
                        if unassigned_count == 0:
                            break
            
        return Response({
            'message': f'Processed. Assigned: {assignments_count}. Unassigned (Overload): {unassigned_count}. Re-optimized: {reassigned_count}.',
            'loads': staff_load,
            'capacities': staff_capacity
        })
