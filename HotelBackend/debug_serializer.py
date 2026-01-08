import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import Room
from housekeeping.serializers import RoomSerializer

def check_serializer():
    print("--- Serializer Output Check ---")
    # Get a room that DEFINITELY has an assignment
    room = Room.objects.filter(assigned_cleaner__isnull=False).first()
    
    if not room:
        print("CRITICAL: No assigned rooms found in DB!")
        return

    print(f"Testing Room: {room.number}")
    print(f"Assigned To (DB): {room.assigned_cleaner} (ID: {room.assigned_cleaner.id})")
    
    serializer = RoomSerializer(room)
    data = serializer.data
    
    print("\n--- Serialized Data (JSON) ---")
    print(json.dumps(data, indent=2))
    
    print("\n--- Specific Fields ---")
    print(f"assigned_cleaner: {data.get('assigned_cleaner')} (Type: {type(data.get('assigned_cleaner'))})")
    print(f"assigned_cleaner_name: {data.get('assigned_cleaner_name')}")

if __name__ == "__main__":
    check_serializer()
