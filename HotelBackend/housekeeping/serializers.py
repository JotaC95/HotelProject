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
    assigned_cleaner = serializers.PrimaryKeyRelatedField(read_only=True)
    assigned_cleaner_name = serializers.CharField(source='assigned_cleaner.username', read_only=True)
    floor = serializers.SerializerMethodField()

    def get_floor(self, obj):
        try:
            # Assuming simplified logic: Rooms 1-20 Floor 1, etc.
            # Mirroring the script logic: (i // 20) + 1
            num = int(obj.number)
            return ((num - 1) // 20) + 1
        except ValueError:
            return 1

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
        # Explicitly enabling supplies_used if __all__ doesn't catch it automatically (it does, but sticking to plan if I was explicit before. Wait, __all__ covers it!)
        # actually, previous attempt I tried to list fields. The file currently has fields = '__all__'.
        # So I DO NOT need to edit serializers.py if it uses __all__!
        # Let me double check the file content I read in Step 574.
        # Line 47: fields = '__all__'
        # So "supplies_used" is ALREADY included!
        # I can SKIP this step.


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

from .models import StaffAvailability, WorkShift

class StaffAvailabilitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = StaffAvailability
        fields = ['id', 'user', 'user_name', 'date', 'status', 'start_time', 'end_time']

class WorkShiftSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = WorkShift
        fields = ['id', 'user', 'user_name', 'date', 'start_time', 'end_time']
