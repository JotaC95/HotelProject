
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from accounts.models import CustomUser
from housekeeping.models import Room

# 1. Setup Users and Groups
TEAM_1 = ["ramiro", "juan"]
TEAM_2 = ["esmine", "jamie"]

def setup_users():
    print("--- Setting up Users ---")
    # Reset all relevant users to ensure clean slate
    for username in TEAM_1 + TEAM_2:
        user, created = CustomUser.objects.get_or_create(username=username)
        if created:
            user.set_password("password123")
            user.role = 'CLEANER'
            user.save()
            print(f"Created user {username}")
    
    # Assign Groups
    for username in TEAM_1:
        u = CustomUser.objects.get(username=username)
        u.group_id = "Group 1"
        u.save()
        print(f"Assigned {username} to Group 1")

    for username in TEAM_2:
        u = CustomUser.objects.get(username=username)
        u.group_id = "Group 2"
        u.save()
        print(f"Assigned {username} to Group 2")

# 2. Setup Rooms
DATA = {
  "date": "2026-01-09",
  "team": "Group 1", # Mapped from "Team 1"
  "rooms": [
    {
      "room": "01",
      "res_no": "6014755",
      "in_out": "Out",
      "guests": "1A",
      "departure_date": "2026-01-09",
      "nights": 5,
      "task": "Departure",
      "status": "Incomplete",
      "notes": "Lock second bedroom"
    },
    {
      "room": "02",
      "res_no": "6004974",
      "in_out": None,
      "guests": "1A",
      "departure_date": "2026-01-12",
      "nights": 5,
      "task": "Rubbish Removal",
      "status": "Incomplete",
      "notes": "Lock second room – 12pm"
    },
    {
      "room": "05",
      "res_no": "5866611",
      "in_out": None,
      "guests": "2A 2C",
      "departure_date": "2026-01-14",
      "nights": 10,
      "task": "Rubbish Removal",
      "status": "Incomplete",
      "notes": "Unlock second bedroom, 2 kings, +2 cots (one in each room)"
    },
    {
      "room": "06",
      "res_no": "6049184",
      "in_out": None,
      "guests": "2A 2C",
      "departure_date": "2026-01-16",
      "nights": 10,
      "task": "Rubbish Removal",
      "status": "Incomplete",
      "notes": "Unlock second bedroom, x1 king"
    },
    {
      "room": "07",
      "res_no": "6058276",
      "in_out": "Out",
      "guests": "1A",
      "departure_date": "2026-01-09",
      "nights": 4,
      "task": "Departure",
      "status": "Incomplete",
      "notes": "Lock second room"
    },
    {
      "room": "10",
      "res_no": "6016112",
      "in_out": None,
      "guests": "2A",
      "departure_date": "2026-01-12",
      "nights": 4,
      "task": "Rubbish Removal",
      "status": "Incomplete",
      "notes": "Lock second bedroom, 1 queen"
    },
    {
      "room": "11",
      "res_no": "6057703",
      "in_out": "Out",
      "guests": "1A",
      "departure_date": "2026-01-09",
      "nights": 4,
      "task": "Departure",
      "status": "Incomplete",
      "notes": "Unlock second bedroom"
    },
    {
      "room": "15",
      "res_no": "5984674",
      "in_out": None,
      "guests": "2A",
      "departure_date": "2026-01-11",
      "nights": 3,
      "task": "Rubbish Removal",
      "status": "Incomplete",
      "notes": "Lock second bedroom, 1 queen"
    },
    {
      "room": "17",
      "res_no": "5685494",
      "in_out": "In",
      "guests": "1A",
      "departure_date": "2026-01-11",
      "nights": 2,
      "task": "Pre Arrival Check",
      "status": "Incomplete",
      "notes": "Unlock second room, 1 king + 2 singles"
    },
    {
      "room": "20",
      "res_no": "5945128",
      "in_out": "In",
      "guests": "2A 2C",
      "departure_date": "2026-01-19",
      "nights": 10,
      "task": "Pre Arrival Check",
      "status": "Incomplete",
      "notes": "Unlock second room, ETA 2pm"
    },
    {
      "room": "21",
      "res_no": "6058770",
      "in_out": None,
      "guests": "4A",
      "departure_date": "2026-01-12",
      "nights": 4,
      "task": "Rubbish Removal",
      "status": "Incomplete",
      "notes": "Unlock second bedroom, 2 kings"
    },
    {
      "room": "22",
      "res_no": "5751409",
      "in_out": "In",
      "guests": "3A",
      "departure_date": "2026-01-12",
      "nights": 3,
      "task": "Pre Arrival Check",
      "status": "Incomplete",
      "notes": "Unlock second bedroom"
    },
    {
      "room": "27",
      "res_no": "6050610",
      "in_out": None,
      "guests": "1A",
      "departure_date": "2026-01-13",
      "nights": 8,
      "task": "Weekly Service",
      "status": "Incomplete",
      "notes": "Lock 2nd bedroom, 1 king"
    }
  ]
}

TASK_MAP = {
    "Departure": "DEPARTURE",
    "Rubbish Removal": "RUBBISH",
    "Pre Arrival Check": "PREARRIVAL",
    "Weekly Service": "WEEKLY"
}

GUEST_STATUS_MAP = {
    "Out": "GUEST_OUT",
    "In": "GUEST_IN_ROOM",
    None: "NO_GUEST" # Default if null
}

def setup_rooms():
    print("--- Wipe & Recreate Rooms ---")
    # 1. Wipe ALL rooms (Per user request: "No deben tener mas cuartos")
    deleted_count, _ = Room.objects.all().delete()
    print(f"Deleted {deleted_count} existing rooms.")

    # 2. Create Rooms
    for r_data in DATA["rooms"]:
        # Map fields
        cleaning_type = TASK_MAP.get(r_data["task"], "DEPARTURE")
        guest_status = GUEST_STATUS_MAP.get(r_data["in_out"], "NO_GUEST")
        
        # Determine Room Type from Notes (heuristic)
        room_type = "Double"
        notes_lower = r_data["notes"].lower()
        if "suite" in notes_lower: room_type = "Suite"
        elif "single" in notes_lower: room_type = "Single"

        # Create
        room = Room.objects.create(
            number=r_data["room"],
            status='PENDING', # Always Start Pending
            cleaning_type=cleaning_type,
            assigned_group="Group 1", # User said Team 1 -> Group 1
            guest_status=guest_status,
            notes=r_data["notes"],
            guest_details={
                "reservation_number": r_data["res_no"],
                "guests": r_data["guests"],
                "departure_date": r_data["departure_date"],
                "nights": r_data["nights"],
                "currentGuest": "Guest " + r_data["res_no"][-4:] # Dummy Name
            }
        )
        print(f"Created Room {room.number} [{cleaning_type}] -> Group 1")

if __name__ == "__main__":
    setup_users()
    setup_rooms()
    print("--- Scenario Setup Complete ---")
