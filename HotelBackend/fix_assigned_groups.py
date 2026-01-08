import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import Room

def fix_groups():
    print("--- Backfilling Room Assigned Groups ---")
    rooms = Room.objects.filter(assigned_cleaner__isnull=False)
    updated = 0
    for r in rooms:
        if r.assigned_cleaner.group_id and r.assigned_group != r.assigned_cleaner.group_id:
            r.assigned_group = r.assigned_cleaner.group_id
            r.save()
            updated += 1
            print(f"Updated Room {r.number} -> Group {r.assigned_group}")
    
    print(f"Total Updated: {updated}")

if __name__ == "__main__":
    fix_groups()
