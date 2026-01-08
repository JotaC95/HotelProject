import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import WorkShift, Room
from accounts.models import CustomUser

def check_state():
    today = date.today()
    print(f"--- Checking Assignments for {today} ---")

    # 1. Check Shifts
    shifts = WorkShift.objects.filter(date=today)
    print(f"Total Shifts Today: {shifts.count()}")
    for s in shifts:
        print(f" - Staff: {s.user.username} ({s.user.role})")

    if shifts.count() == 0:
        print("CRITICAL: No shifts found! 'Assign Daily' needs shifts to distribute rooms.")

    # 2. Check Room Assignments
    total_rooms = Room.objects.count()
    assigned = Room.objects.filter(assigned_cleaner__isnull=False).count()
    unassigned = total_rooms - assigned
    
    print(f"\nTotal Rooms: {total_rooms}")
    print(f"Assigned: {assigned}")
    print(f"Unassigned: {unassigned}")

    # 3. Distribution
    cleaners = CustomUser.objects.filter(role='CLEANER')
    print("\n--- Distribution per Cleaner ---")
    for c in cleaners:
        count = Room.objects.filter(assigned_cleaner=c).count()
        shift_exists = shifts.filter(user=c).exists()
        print(f" - {c.username} (Has Shift: {shift_exists}): {count} rooms")

if __name__ == "__main__":
    check_state()
