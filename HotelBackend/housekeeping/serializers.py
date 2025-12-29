from rest_framework import serializers
from .models import Room, Incident, InventoryItem, CleaningTypeDefinition

class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = '__all__'

class CleaningTypeDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CleaningTypeDefinition
        fields = '__all__'

class IncidentSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='reported_by.username', read_only=True) # Map reported_by to 'user' for frontend compat
    timestamp = serializers.DateTimeField(source='created_at', read_only=True) # Map created_at to 'timestamp'
    targetRole = serializers.CharField(source='target_role') # Map snake to camel
    photoUri = serializers.CharField(source='photo_uri', required=False, allow_null=True)

    class Meta:
        model = Incident
        fields = ['id', 'text', 'timestamp', 'user', 'photoUri', 'targetRole', 'status', 'room']

class RoomSerializer(serializers.ModelSerializer):
    incidents = IncidentSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = '__all__'
