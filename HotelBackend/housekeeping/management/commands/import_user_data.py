import json
from django.core.management.base import BaseCommand
from housekeeping.models import Room

class Command(BaseCommand):
    help = 'Imports specific user provided room data'

    def handle(self, *args, **options):
        # Data provided by user
        data = {
          "date": "2026-02-04",
          "team": "Team 1 (1-19)",
          "rooms": [
            {
              "room": "01",
              "room_type": "1 Bedroom",
              "reservation_number": "6170317",
              "status_in_out": "Out",
              "people": "1A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "notes": "Lock second bedroom, 1 x queen"
            },
            {
              "room": "03",
              "room_type": "2 Bedroom",
              "reservation_number": "6167337",
              "status_in_out": "Out",
              "people": "2A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "notes": "Lock second bedroom, 1 x king"
            },
            {
              "room": "03",
              "room_type": "2 Bedroom",
              "reservation_number": "6172191",
              "status_in_out": "In",
              "people": "1A",
              "departure_date": "2026-02-25",
              "task": "Pre Arrival Check",
              "task_status": "Pending",
              "notes": "Unlock both bedrooms, 2 x kings, Early Arrival (In/Out)"
            },
            {
              "room": "07",
              "room_type": "1 Bedroom",
              "reservation_number": "6099321",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-06",
              "task": "Rubbish Removal",
              "task_status": "Pending",
              "notes": "Lock second bedroom, 1 x queen"
            },
            {
              "room": "11",
              "room_type": "1 Bedroom",
              "reservation_number": "6118587",
              "status_in_out": "Out",
              "people": "1A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "notes": "Lock second bedroom, 1 x queen"
            },
            {
              "room": "11",
              "room_type": "1 Bedroom",
              "reservation_number": "6124593",
              "status_in_out": "In",
              "people": "1A",
              "departure_date": "2026-02-05",
              "task": "Pre Arrival Check",
              "task_status": "Pending",
              "notes": "Lock second room, 1 x queen, Action Res Notes (In/Out)"
            },
            {
              "room": "12",
              "room_type": "3 Bedroom",
              "reservation_number": "6130172",
              "status_in_out": "Out",
              "people": "1A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "notes": "Lock second and third bedroom"
            },
            {
              "room": "12",
              "room_type": "3 Bedroom",
              "reservation_number": "6094445",
              "status_in_out": "In",
              "people": "1A",
              "departure_date": "2026-02-05",
              "task": "Pre Arrival Check",
              "task_status": "Pending",
              "notes": "Lock second and third room, ETA 5:30–6pm"
            },
            {
              "room": "15",
              "room_type": "1 Bedroom",
              "reservation_number": "5968731",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-02-06",
              "task": "Rubbish Removal",
              "task_status": "Pending",
              "notes": "Lock the second bedroom, 1 x queen"
            },
            {
              "room": "17",
              "room_type": "1 Bedroom",
              "reservation_number": "6132327",
              "status_in_out": None,
              "people": "1A",
              "departure_date": "2026-04-18",
              "task": "Weekly Service - Wednesday",
              "task_status": "Pending",
              "notes": "Lock second room, Take payment every Wednesday (Inhouse)"
            },
            {
              "room": "18",
              "room_type": "2 Bedroom",
              "reservation_number": "6118607",
              "status_in_out": "Out",
              "people": "1A",
              "departure_date": "2026-02-04",
              "task": "Departure",
              "task_status": "Pending",
              "notes": "Lock second bedroom, 1 x queen"
            },
            {
              "room": "18",
              "room_type": "2 Bedroom",
              "reservation_number": "6124729",
              "status_in_out": "In",
      "people": "1A",
      "departure_date": "2026-02-05",
      "task": "Pre Arrival Check",
      "task_status": "Pending",
      "notes": "Lock second room"
    },
    {
      "room": "19",
      "room_type": "3 Bedroom",
      "reservation_number": "6106433",
      "status_in_out": "In",
      "people": "1A",
      "departure_date": "2026-02-05",
      "task": "Pre Arrival Check",
      "task_status": "Pending",
      "notes": "Lock second and third room"
    },
    {
      "room": "20",
      "room_type": "2 Bedroom",
      "reservation_number": "6172872",
      "status_in_out": "Out",
      "people": "1A",
      "departure_date": "2026-02-04",
      "task": "Departure",
      "task_status": "Pending",
      "notes": "Unlock second room, 1 king, 2 singles"
    },
    {
      "room": "20",
      "room_type": "2 Bedroom",
      "reservation_number": "6106264",
      "status_in_out": "In",
      "people": "1A",
      "departure_date": "2026-02-05",
      "task": "Pre Arrival Check",
      "task_status": "Pending",
      "notes": "Lock the second bedroom, 1 x king"
    }
  ],
  "extra_handwritten_notes": [
    "IQ 11-106 Prearrival – lock 2nd bed",
    "Departure x19 – lock 2nd"
  ]
}

        self.stdout.write(f"Importing data for {data['team']} - {data['date']}")
        
        # Determine group name
        group_name = "Group 1" 

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
