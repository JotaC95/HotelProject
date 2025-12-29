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
