import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from accounts.models import CustomUser
from housekeeping.models import Room

def check_assignments():
    print("--- User Assignment Check ---")
    users = CustomUser.objects.filter(role='CLEANER')
    for u in users:
        count = Room.objects.filter(assigned_cleaner=u).count()
        print(f"User: {u.username} (ID: {u.id}) | Group: {u.group_id} | Assigned Rooms: {count}")
        if count > 0:
            rooms = Room.objects.filter(assigned_cleaner=u).values_list('number', flat=True)
            print(f"  -> Room Numbers: {list(rooms)}")

if __name__ == "__main__":
    check_assignments()
