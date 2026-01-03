from rest_framework import viewsets, permissions
from .models import Room, Incident, InventoryItem, CleaningTypeDefinition
from .serializers import RoomSerializer, IncidentSerializer, InventoryItemSerializer, CleaningTypeDefinitionSerializer

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
             # Option: Strict backend filtering
             # return queryset.filter(assigned_group=user.group_id)
             pass 

        return queryset

class CleaningTypeDefinitionViewSet(viewsets.ModelViewSet):
    queryset = CleaningTypeDefinition.objects.all().order_by('name')
    serializer_class = CleaningTypeDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all().order_by('-created_at')
    serializer_class = IncidentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

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
        
        # Cache definitions to avoid N+1 queries ideally, but for now simple loop
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
