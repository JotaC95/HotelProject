import os
import django
import json
from datetime import date, datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import Room, WorkShift
from accounts.models import CustomUser
from housekeeping.roster_views import RosterViewSet, AutoAssignRoomsViewSet
from rest_framework.test import APIRequestFactory

def debug_roster():
    print("--- Debugging Roster Forecast ---")
    today = date.today()
    print(f"Date: {today}")

    # 1. Check Staff availability/Shifts
    shifts = WorkShift.objects.filter(date=today)
    print(f"Total Shifts today: {shifts.count()}")
    for s in shifts:
        print(f"  - {s.user.username} ({s.user.groups.first() if s.user.groups.exists() else 'No Django Group'} | Custom Group: {s.user.group_id}) : {s.start_time} - {s.end_time}")

    # 2. Check Rooms
    rooms = Room.objects.all()
    assigned_rooms = rooms.filter(assigned_cleaner__isnull=False)
    print(f"Total Rooms: {rooms.count()}")
    print(f"Assigned Rooms: {assigned_rooms.count()}")
    
    # Check "Extra Team" assignments
    extra_rooms = rooms.filter(assigned_group__startswith='Extra Team')
    print(f"Rooms assigned to Extra Teams: {extra_rooms.count()}")

    # --- SIMULATE OVERLOAD ---
    print("\n--- Simulating MASSIVE OVERLOAD (Removing G1/G2 Staff) ---")
    # Delete shifts for everyone except 'cleaner' (Group 3)
    # Assuming 'cleaner' username exists.
    WorkShift.objects.exclude(user__username='cleaner').delete()
    
    # Force 62 rooms to be pending
    Room.objects.update(assigned_group='Group 3', status='PENDING', assigned_cleaner=None)
    
    # Check remaining capacity
    remaining_shifts = WorkShift.objects.all()
    print(f"Remaining Shifts: {remaining_shifts.count()}")
    for s in remaining_shifts:
        print(f"  - {s.user.username} (Group: {s.user.group_id})")

    # Call Smart Assign Logic
    print("Running Smart Assign...")
    view = AutoAssignRoomsViewSet()
    
    factory = APIRequestFactory()
    request = factory.post('/api/roster/assign-daily/')
    request.user = CustomUser.objects.filter(is_superuser=True).first()
    view.request = request
    
    try:
        response = view.assign_daily(request)
        print(f"Smart Assign Response: {response.data}")
    except Exception as e:
        print(f"Smart Assign Failed: {e}")

    # Re-check Assignments
    print("\n--- Post-Assignment State ---")
    extra_rooms = Room.objects.filter(assigned_group__startswith='Extra Team')
    print(f"Rooms assigned to Extra Teams: {extra_rooms.count()}")
    
    # Check if new staff were created/shifts added?
    # The logic adds *shifts* to existing 'CLEANER' role users if available, or creates pseudo-groups?
    # The requirement was "call in available off-duty staff".
    
    today_shifts = WorkShift.objects.filter(date=today)
    print(f"Total Shifts Now: {today_shifts.count()}")
    for s in today_shifts:
         print(f"  - {s.user.username} (Group: {s.user.group_id})")

    # 3. Simulate Forecast Call
    view = RosterViewSet()
    # Mocking request isn't easy without context, but we can call the logic directly if we extract it, 
    # or better, just inspect the data that the forecast WOULD use.
    
    # Replicating Forecast Logic manually for inspection
    group_stats = {} 
    # Group names
    all_groups = set(CustomUser.objects.filter(role='CLEANER', is_active=True).values_list('group_id', flat=True))
    all_groups.add('Ungrouped') # Ensure default exists
    
    for g in all_groups:
        if not g: continue # Skip empty/None
        
        # Calculate Capacity
        group_shifts = shifts.filter(user__group_id=g)
        capacity_minutes = 0
        staff_count = group_shifts.count()
        
        for s in group_shifts:
            # Simple diff
            # start = datetime.combine(today, s.shift_start)
            # end = datetime.combine(today, s.shift_end)
            # dur = (end - start).seconds / 60
            dur = 480 # Assume 8h for simplicity in this quick check, or calc real
            capacity_minutes += dur
            
        # Calculate Load
        # This is where it gets tricky. RosterViewSet sums up timeEstimates. 
        # Let's just check the assigned count.
        group_rooms = rooms.filter(assigned_group=g)
        room_count = group_rooms.count()
        
        print(f"Group '{g}': Staff={staff_count}, Cap={capacity_minutes/60}h, AssignedRooms={room_count}")

if __name__ == '__main__':
    debug_roster()
