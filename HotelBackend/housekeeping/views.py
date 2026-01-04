from rest_framework import viewsets, permissions
from .models import Room, Incident, InventoryItem, CleaningTypeDefinition, LostItem, Announcement, Asset
from .serializers import RoomSerializer, IncidentSerializer, InventoryItemSerializer, CleaningTypeDefinitionSerializer, LostItemSerializer, AnnouncementSerializer, AssetSerializer
from accounts.models import CustomUser
from .utils import send_multicast_push

class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('name')
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all().order_by('number')
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Room.objects.all().order_by('number')
        
        if user.role == 'CLEANER' and user.group_id:
             pass 
             
        return queryset 

    def perform_update(self, serializer):
        # Capture previous status
        instance = self.get_object()
        old_status = instance.status
        
        updated_room = serializer.save()
        new_status = updated_room.status
        
        # logic for notifications
        if old_status != new_status:
            if new_status == 'INSPECTION':
                self.send_notification("Room Ready for Inspection", f"Room {updated_room.number} is ready.", role='SUPERVISOR')
            elif new_status == 'COMPLETED':
                self.send_notification("Room Cleaned", f"Room {updated_room.number} is clean.", role='RECEPTION')

    def send_notification(self, title, body, role=None):
        targets = CustomUser.objects.all()
        if role:
            targets = targets.filter(role=role)
        
        send_multicast_push(targets, title, body, extra={"type": "ROOM_UPDATE"})

class CleaningTypeDefinitionViewSet(viewsets.ModelViewSet):
    queryset = CleaningTypeDefinition.objects.all().order_by('name')
    serializer_class = CleaningTypeDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all().order_by('-created_at')
    serializer_class = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        incident = serializer.save(reported_by=self.request.user)
        
        # Notify Target Role
        if incident.target_role:
            targets = CustomUser.objects.filter(role=incident.target_role)
            send_multicast_push(targets, "New Incident", f"{incident.text} ({incident.room_number if hasattr(incident, 'room_number') else 'General'})", extra={"type": "INCIDENT", "id": incident.id})

from .models import CleaningSession
from .serializers import CleaningSessionSerializer
from rest_framework.response import Response
from rest_framework.decorators import action

class CleaningSessionViewSet(viewsets.ModelViewSet):
    queryset = CleaningSession.objects.all()
    serializer_class = CleaningSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        group_id = serializer.validated_data.get('group_id')
        
        # Calculate total minutes
        rooms = Room.objects.filter(assigned_group=group_id).exclude(status='MAINTENANCE')
        total_minutes = 0
        
        # Cache definitions to avoid N+1 is ideal, simple loop for now
        cleaning_types = {ct.name: ct.estimated_minutes for ct in CleaningTypeDefinition.objects.all()}
        
        for room in rooms:
            minutes = cleaning_types.get(room.cleaning_type, 30) # Default 30
            total_minutes += minutes
            
        serializer.save(target_duration_minutes=total_minutes)

    @action(detail=False, methods=['get'])
    def current(self, request):
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response({'error': 'group_id required'}, status=400)
            
        session = CleaningSession.objects.filter(
            group_id=group_id, 
            status='IN_PROGRESS'
        ).order_by('-start_time').first()
        
        if session:
            return Response(CleaningSessionSerializer(session).data)
        return Response(None)

class LostItemViewSet(viewsets.ModelViewSet):
    queryset = LostItem.objects.all().order_by('-created_at')
    serializer_class = LostItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        item = serializer.save(found_by=self.request.user)
        # Notify Reception
        targets = CustomUser.objects.filter(role='RECEPTION')
        send_multicast_push(targets, "Lost Item Found", f"{item.description} in {item.room or 'Lobby'}", extra={"type": "LOST_ITEM", "id": item.id})

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by('-created_at')
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        ann = serializer.save(sender=self.request.user)
        # Notify All Users
        targets = CustomUser.objects.all()
        send_multicast_push(targets, f"📢 {ann.title}", ann.message, extra={"type": "ANNOUNCEMENT", "priority": ann.priority})

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Asset.objects.all()
        room_id = self.request.query_params.get('room', None)
        if room_id:
            queryset = queryset.filter(room_id=room_id)
        return queryset

class StatsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_rooms = Room.objects.count()
        cleaned_today = Room.objects.filter(status='COMPLETED').count() # Naive
        issues_open = Incident.objects.filter(status='OPEN').count()
        lost_items_found = LostItem.objects.filter(status='FOUND').count()
        
        # 1. Room Status Distribution (Pie Chart)
        status_counts = {}
        for status, _ in Room.STATUS_CHOICES:
            status_counts[status] = Room.objects.filter(status=status).count()
            
        # 2. Incidents by Role (Bar/Pie Chart)
        incident_counts = {}
        for role, _ in Incident.ROLE_CHOICES:
            incident_counts[role] = Incident.objects.filter(target_role=role, status='OPEN').count()

        # 3. Weekly Activity (Mocked for Demo - requires History Model for real data)
        # In a real app, query 'RoomHistory' or 'LogEntry' by date.
        weekly_activity = {
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "data": [12, 19, 3, 5, 2, 3, 10] 
        }

        return Response({
            'total_rooms': total_rooms,
            'cleaned_today': cleaned_today,
            'issues_open': issues_open,
            'lost_items_found': lost_items_found,
            'status_distribution': status_counts,
            'incident_distribution': incident_counts,
            'weekly_activity': weekly_activity
        })
