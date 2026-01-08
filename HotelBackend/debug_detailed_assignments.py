import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import Room
from accounts.models import CustomUser

def check_detailed_status():
    print(f"--- Detailed Assignment Check ---")
    users = CustomUser.objects.filter(role='CLEANER')
    
    for u in users:
        rooms = Room.objects.filter(assigned_cleaner=u)
        print(f"Cleaner {u.username} (ID: {u.id}): {rooms.count()} rooms assigned.")
        if rooms.count() > 0:
             print(f"  Sample: {[r.number for r in rooms[:5]]}")

    unassigned = Room.objects.filter(assigned_cleaner__isnull=True).count()
    print(f"Unassigned Rooms: {unassigned}")
    
    # Check if there is any 'group' assignment issue
    print("\n--- Group Assignments ---")
    groups = Room.objects.values_list('assignedGroup', flat=True).distinct()
    for g in groups:
        count = Room.objects.filter(assignedGroup=g).count()
        print(f"Group '{g}': {count} rooms")

if __name__ == "__main__":
    check_detailed_status()
