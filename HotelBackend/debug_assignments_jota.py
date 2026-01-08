import os
import django
import sys

# Setup Django environment
sys.path.append('/Users/jota1/Documents/DEV/Proyectos/HotelProject/HotelBackend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import Room
from django.contrib.auth import get_user_model

User = get_user_model()

print("--- DEBUG ROOM ASSIGNMENTS ---")
rooms = Room.objects.all()
print(f"Total Rooms: {rooms.count()}")

assigned_count = rooms.filter(assigned_cleaner__isnull=False).count()
print(f"Rooms with Assigned Cleaner: {assigned_count}")

for room in rooms.filter(assigned_cleaner__isnull=False):
    print(f"Room {room.number}: Assigned to {room.assigned_cleaner.username} (ID: {room.assigned_cleaner.id})")

print("\n--- USERS ---")
for user in User.objects.all():
    print(f"User: {user.username} (ID: {user.id}) Role: {getattr(user, 'role', 'N/A')}")
