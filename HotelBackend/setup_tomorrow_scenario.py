
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
DATA_TEAM_1 = {
  "date": "2026-01-09",
  "team": "Group 1",
  "rooms": [
    { "room": "01", "res_no": "6014755", "in_out": "Out", "guests": "1A", "departure_date": "2026-01-09", "nights": 5, "task": "Departure", "status": "Incomplete", "notes": "Lock second bedroom" },
    { "room": "02", "res_no": "6004974", "in_out": None, "guests": "1A", "departure_date": "2026-01-12", "nights": 5, "task": "Rubbish Removal", "status": "Incomplete", "notes": "Lock second room – 12pm" },
    { "room": "05", "res_no": "5866611", "in_out": None, "guests": "2A 2C", "departure_date": "2026-01-14", "nights": 10, "task": "Rubbish Removal", "status": "Incomplete", "notes": "Unlock second bedroom, 2 kings, +2 cots (one in each room)" },
    { "room": "06", "res_no": "6049184", "in_out": None, "guests": "2A 2C", "departure_date": "2026-01-16", "nights": 10, "task": "Rubbish Removal", "status": "Incomplete", "notes": "Unlock second bedroom, x1 king" },
    { "room": "07", "res_no": "6058276", "in_out": "Out", "guests": "1A", "departure_date": "2026-01-09", "nights": 4, "task": "Departure", "status": "Incomplete", "notes": "Lock second room" },
    { "room": "10", "res_no": "6016112", "in_out": None, "guests": "2A", "departure_date": "2026-01-12", "nights": 4, "task": "Rubbish Removal", "status": "Incomplete", "notes": "Lock second bedroom, 1 queen" },
    { "room": "11", "res_no": "6057703", "in_out": "Out", "guests": "1A", "departure_date": "2026-01-09", "nights": 4, "task": "Departure", "status": "Incomplete", "notes": "Unlock second bedroom" },
    { "room": "15", "res_no": "5984674", "in_out": None, "guests": "2A", "departure_date": "2026-01-11", "nights": 3, "task": "Rubbish Removal", "status": "Incomplete", "notes": "Lock second bedroom, 1 queen" },
    { "room": "17", "res_no": "5685494", "in_out": "In", "guests": "1A", "departure_date": "2026-01-11", "nights": 2, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Unlock second room, 1 king + 2 singles" },
    { "room": "20", "res_no": "5945128", "in_out": "In", "guests": "2A 2C", "departure_date": "2026-01-19", "nights": 10, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Unlock second room, ETA 2pm" },
    { "room": "21", "res_no": "6058770", "in_out": None, "guests": "4A", "departure_date": "2026-01-12", "nights": 4, "task": "Rubbish Removal", "status": "Incomplete", "notes": "Unlock second bedroom, 2 kings" },
    { "room": "22", "res_no": "5751409", "in_out": "In", "guests": "3A", "departure_date": "2026-01-12", "nights": 3, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Unlock second bedroom" },
    { "room": "27", "res_no": "6050610", "in_out": None, "guests": "1A", "departure_date": "2026-01-13", "nights": 8, "task": "Weekly Service", "status": "Incomplete", "notes": "Lock 2nd bedroom, 1 king" }
  ]
}

DATA_TEAM_2 = {
  "date": "2026-01-09",
  "team": "Group 2",
  "rooms": [
    { "room": "29", "res_no": "5979338", "in_out": "Out", "guests": "2A", "departure_date": "2026-01-09", "nights": 2, "task": "Departure", "status": "Incomplete", "notes": "Unlock second bedroom, 1 king" },
    { "room": "29", "res_no": "5998025", "in_out": "In", "guests": "3A", "departure_date": "2026-01-10", "nights": 1, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Unlock 2nd bedroom, ETA 2pm" },
    { "room": "32", "res_no": "6004765", "in_out": "Out", "guests": "1A", "departure_date": "2026-01-09", "nights": 4, "task": "Departure", "status": "Incomplete", "notes": "Lock second room, Maintenance (In)" },
    { "room": "33", "res_no": "6036946", "in_out": "Out", "guests": "2A", "departure_date": "2026-01-09", "nights": 2, "task": "Departure", "status": "Incomplete", "notes": "Lock second bedroom" },
    { "room": "39", "res_no": "6057214", "in_out": "Out", "guests": "1A", "departure_date": "2026-01-09", "nights": 3, "task": "Departure", "status": "Incomplete", "notes": "Lock the second bedroom, 1 king" },
    { "room": "43", "res_no": "6059516", "in_out": "In", "guests": "4A", "departure_date": "2026-01-12", "nights": 3, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Unlock second and third room, 2 kings + 2 singles, ETA 5pm" },
    { "room": "57", "res_no": "6028843", "in_out": "In", "guests": "1A", "departure_date": "2026-01-13", "nights": 4, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Lock second room" },
    { "room": "58", "res_no": "5850103", "in_out": "In", "guests": "2A", "departure_date": "2026-01-14", "nights": 5, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Lock second bedroom" },
    { "room": "61", "res_no": "6050758", "in_out": "In", "guests": "1A", "departure_date": "2026-01-10", "nights": 1, "task": "Pre Arrival Check", "status": "Incomplete", "notes": "Lock the 2nd bedroom, 1 king, ETA 5–6pm" }
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
    # Merge datasets
    ALL_ROOMS = []
    
    # Process Group 1
    for r in DATA_TEAM_1["rooms"]:
        r["assigned_group"] = "Group 1"
        ALL_ROOMS.append(r)
        
    # Process Group 2
    for r in DATA_TEAM_2["rooms"]:
        r["assigned_group"] = "Group 2"
        ALL_ROOMS.append(r)

    # Handle Duplicates (e.g. Room 29 turnover)
    merged_rooms = {} # Key: room_number -> room_data

    for r_data in ALL_ROOMS:
        room_num = r_data["room"]
        
        if room_num in merged_rooms:
            # Merge logic
            existing = merged_rooms[room_num]
            print(f"Merging Duplicate Room {room_num}: {existing['task']} + {r_data['task']}")
            
            # Prioritize DEPARTURE (Cleaning) over PREARRIVAL (Check)
            if r_data["task"] == "Departure":
                existing["task"] = "Departure"
                existing["in_out"] = "Out" # If dep, guest is out
            
            # Append Notes
            existing["notes"] += f" | {r_data['notes']}"
            existing["notes"] = existing["notes"].strip(" | ")
            
            # Update Guest Details (Next Guest info is valuable from PreArrival)
            if r_data["task"] == "Pre Arrival Check":
                # Assuming this contains next guest info?
                # For now just keeping the original one unless we want to complex merge
                pass
                
        else:
            merged_rooms[room_num] = r_data

    for room_num, r_data in merged_rooms.items():
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
            number=room_num,
            status='PENDING', # Always Start Pending
            cleaning_type=cleaning_type,
            assigned_group=r_data.get("assigned_group", "Group 1"),
            guest_status=guest_status,
            notes=r_data["notes"],
            guest_details={
                "reservation_number": r_data["res_no"],
                "guests": r_data["guests"],
                "departure_date": r_data["departure_date"],
                "nights": r_data["nights"],
                "currentGuest": "Guest " + str(r_data["res_no"])[-4:] # Dummy Name
            }
        )
        print(f"Created Room {room.number} [{cleaning_type}] -> {room.assigned_group}")

if __name__ == "__main__":
    setup_users()
    setup_rooms()
    print("--- Scenario Setup Complete ---")
