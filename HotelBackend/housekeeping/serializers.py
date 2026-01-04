from rest_framework import serializers
from .models import Room, Incident, InventoryItem, CleaningTypeDefinition, LostItem, Announcement, Asset

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
        fields = ['id', 'text', 'timestamp', 'user', 'photoUri', 'targetRole', 'status', 'room', 'category']

class RoomSerializer(serializers.ModelSerializer):
    incidents = IncidentSerializer(many=True, read_only=True)

    def validate(self, data):
        cleaning_type = data.get('cleaning_type', self.instance.cleaning_type if self.instance else None)
        current_guest = data.get('current_guest_name', self.instance.current_guest_name if self.instance else None)
        next_guest = data.get('next_guest_name', self.instance.next_guest_name if self.instance else None)

        # Rule 1: Removed mandatory guest check. Room can be empty.
        # if not current_guest:
        #      raise serializers.ValidationError({"current_guest_name": "Current Guest Name is mandatory for all cleaning types."})

        # Rule 2: Weekly, Rubbish -> No Next Guest (Departure can have next guest for Back to Back)
        if cleaning_type in ['WEEKLY', 'RUBBISH']:
            if next_guest:
                 raise serializers.ValidationError({"next_guest_name": f"Cleaning type '{cleaning_type}' cannot have a Next Guest."})
        
        return data

    class Meta:
        model = Room
        fields = '__all__'

class CleaningSessionSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import CleaningSession
        model = CleaningSession
        fields = '__all__'
        fields = '__all__'

class LostItemSerializer(serializers.ModelSerializer):
    found_by_name = serializers.CharField(source='found_by.username', read_only=True)
    class Meta:
        model = LostItem
        fields = '__all__'

class AnnouncementSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    class Meta:
        model = Announcement
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source='room.number', read_only=True)
    class Meta:
        model = Asset
        fields = '__all__'
