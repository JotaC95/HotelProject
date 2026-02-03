import json
from django.core.management.base import BaseCommand
from housekeeping.models import Room

class Command(BaseCommand):
    help = 'Imports specific user provided room data'

    def handle(self, *args, **options):
        # Data provided by user
        data = {
          "date": "2026-02-04",
          "team": "Team 2 (20-43)",
          "rooms": [
            {
              "room": "23",
              "room_type": "2 Bedroom",
              "reservation_number": "6003448",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-08",
              "task": "Weekly Extra Service - Wednesday",
              "task_status": "Pending",
              "bed_config_note_number": "23",
              "notes": "Lock second room"
            },
            {
              "room": "24",
              "room_type": "2 Bedroom",
              "reservation_number": "6163719",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-07",
              "task": "Weekly Service - Wednesday",
              "task_status": "Pending",
              "bed_config_note_number": "24",
              "notes": "Lock the second bedroom, 1 x king"
            },
            {
              "room": "29",
              "room_type": "2 Bedroom",
              "reservation_number": "6132072",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-06",
              "task": "Rubbish Removal",
              "task_status": "Pending",
              "bed_config_note_number": "29",
              "notes": "Lock second room, 1 x king"
            },
            {
              "room": "33",
              "room_type": "1 Bedroom",
              "reservation_number": "6173723",
              "status_in_out": "Out",
              "people": "2A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "bed_config_note_number": "33",
              "notes": "Lock second room"
            },
            {
              "room": "33",
              "room_type": "1 Bedroom",
              "reservation_number": "6094341",
              "status_in_out": "In",
              "people": "1A",
              "departure_date": "2026-02-05",
              "task": "Pre Arrival Check",
              "task_status": "Pending",
              "bed_config_note_number": None,
              "notes": "1 Queen bed"
            },
            {
              "room": "34B",
              "room_type": "1 Bedroom",
              "reservation_number": "6145324",
              "status_in_out": "Out",
              "people": "1A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "bed_config_note_number": "34B",
              "notes": "Lock second room"
            },
            {
              "room": "34B",
              "room_type": "1 Bedroom",
              "reservation_number": "6094379",
              "status_in_out": "In",
              "people": "1A",
              "departure_date": "2026-02-05",
              "task": "Pre Arrival Check",
              "task_status": "Pending",
              "bed_config_note_number": None,
              "notes": "Lock second bedroom"
            },
            {
              "room": "44",
              "room_type": "2 Bedroom",
              "reservation_number": "6135578",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-06",
              "task": "Rubbish Removal",
              "task_status": "Pending",
              "bed_config_note_number": "44",
              "notes": "Lock the second bedroom, 1 x king"
            },
            {
              "room": "45",
              "room_type": "2 Bedroom",
              "reservation_number": "6128196",
              "status_in_out": "Out",
              "people": "1A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "bed_config_note_number": "45",
              "notes": "Lock second bedroom, 1 x king"
            },
            {
              "room": "45",
              "room_type": "2 Bedroom",
              "reservation_number": "6126950",
              "status_in_out": "In",
              "people": "1A",
              "departure_date": "2026-02-06",
              "task": "Pre Arrival Check",
              "task_status": "Pending",
              "bed_config_note_number": None,
              "notes": "Lock second bedroom"
            },
            {
              "room": "50",
              "room_type": "1 Bedroom Executive",
              "reservation_number": "5895403",
              "status_in_out": None,
              "people": "2A",
              "departure_date": "2026-02-07",
              "task": "Weekly Service - Friday",
              "task_status": "Pending",
              "bed_config_note_number": "50",
              "notes": "Lock second room"
            },
            {
              "room": "51",
              "room_type": "1 Bedroom Executive",
              "reservation_number": "6094726",
              "status_in_out": "Out",
              "people": "1A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "bed_config_note_number": "51",
              "notes": "Lock second bedroom, 1 x king"
            },
            {
              "room": "51",
              "room_type": "1 Bedroom Executive",
              "reservation_number": "6128008",
              "status_in_out": "In",
              "people": "1A",
              "departure_date": "2026-02-06",
              "task": "Pre Arrival Check",
              "task_status": "Pending",
              "bed_config_note_number": None,
              "notes": "Lock second bedroom, 1 x king"
            },
            {
              "room": "56",
              "room_type": "1 Bedroom Executive",
              "reservation_number": "5921631",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-24",
              "task": "Weekly Extra Service - Wednesday",
              "task_status": "Pending",
              "bed_config_note_number": "56",
              "notes": "Lock second bedroom, 1 x king"
            },
            {
              "room": "57",
              "room_type": "1 Bedroom Executive",
              "reservation_number": "6013849",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-10",
              "task": "Rubbish Removal",
              "task_status": "Pending",
              "bed_config_note_number": "57",
              "notes": "Early arrival requested – 1pm"
            },
            {
              "room": "60",
              "room_type": "1 Bedroom Executive",
              "reservation_number": "6070847",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-07",
              "task": "Rubbish Removal",
              "task_status": "Pending",
              "bed_config_note_number": "60",
              "notes": "Lock the second bedroom, 1 x king"
            }
          ]
        }

        self.stdout.write(f"Importing data for {data['team']} - {data['date']}")
        
        # Determine group name
        # "Team 2 (20-43)" -> "Group 2"? Or just use the whole string. 
        # The prompt says "Team 2", likely "Group 2" in the app context if we want to assign it.
        # But '20-43' implies it might be levels 20-43.
        # Let's map "Team X" to "Group X" for simpler UI filtering if possible.
        group_name = "Group 2" 

        rooms_list = data.get('rooms', [])
        for room_data in rooms_list:
            room_number = room_data.get('room')
            
            # Cleaning Type Mapping
            task_raw = room_data.get('task', 'Departure')
            cleaning_type = 'DEPARTURE' # Default
            
            # Map loosely to known types
            task_lower = task_raw.lower()
            if 'pre arrival' in task_lower:
                cleaning_type = 'PREARRIVAL'
            elif 'rubbish' in task_lower:
                cleaning_type = 'RUBBISH'
            elif 'weekly' in task_lower: # Weekly Service / Extra Service
                cleaning_type = 'WEEKLY'
            elif 'departure' in task_lower:
                cleaning_type = 'DEPARTURE'
            
            # Upsert Room
            room, created = Room.objects.get_or_create(number=room_number)
            
            # Update fields
            room.assigned_group = group_name
            room.cleaning_type = cleaning_type
            room.room_type = room_data.get('room_type', room.room_type)
            room.notes = room_data.get('notes', '')
            
            # Guest Stats
            # In input: status_in_out -> "In" / "Out" / null
            # App connection: GUEST_IN_ROOM / GUEST_OUT / NO_GUEST?
            if room_data.get('status_in_out') == 'In':
                 room.guest_status = 'GUEST_IN_ROOM'
            elif room_data.get('status_in_out') == 'Out':
                 room.guest_status = 'GUEST_OUT'
            
            # Reset status
            room.status = 'PENDING'
            
            room.save()
            
            action = "Created" if created else "Updated"
            self.stdout.write(f"{action} Room {room_number} -> {cleaning_type} ({room_data.get('task')})")

        self.stdout.write(self.style.SUCCESS('Successfully imported user data'))
