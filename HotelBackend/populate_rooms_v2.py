import os
import django
import random
from datetime import datetime, timedelta

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import Room

def populate_rooms():
    print("Deleting existing rooms...")
    Room.objects.all().delete()

    print("Creating 62 Rooms...")
    
    room_types = ['Single', 'Double', 'Suite']
    cleaning_types = ['PREARRIVAL', 'DEPARTURE', 'HOLDOVER', 'WEEKLY', 'RUBBISH', 'DAYUSE']
    guest_statuses = ['GUEST_IN_ROOM', 'GUEST_OUT', 'NO_GUEST', 'DND']
    
    rooms_to_create = []

    for i in range(1, 63):
        number = str(i)
        floor = (i // 20) + 1
        r_type = random.choice(room_types)
        
        # Strategic Distribution for Testing Priorities
        if i <= 10:
            # High Priority - PREARRIVAL
            c_type = 'PREARRIVAL'
            # Mix of Ready vs Blocked
            g_status = 'GUEST_OUT' if i % 2 == 0 else 'GUEST_IN_ROOM' 
            status = 'PENDING'
        elif i <= 20:
            # High Priority - DEPARTURE
            c_type = 'DEPARTURE'
            g_status = 'GUEST_OUT' if i % 3 == 0 else 'GUEST_IN_ROOM'
            status = 'PENDING'
        elif i <= 30:
            # Standard - HOLDOVER
            c_type = 'HOLDOVER'
            g_status = 'GUEST_IN_ROOM'
            status = 'PENDING'
        elif i <= 40:
             # WEEKLY
            c_type = 'WEEKLY'
            g_status = 'GUEST_IN_ROOM'
            status = 'PENDING'
        else:
            # Random Mix
            c_type = random.choice(cleaning_types)
            g_status = random.choice(guest_statuses)
            status = 'PENDING'

        # Special Case: Room 62 is Maintenance
        if i == 62:
            status = 'MAINTENANCE'
            c_type = 'RUBBISH' # Irrelevant
            g_status = 'NO_GUEST'

        # Dates
        check_in = datetime.now().date()
        days_stay = random.randint(1, 5)
        check_out = check_in + timedelta(days=days_stay)

        # Create Object
        room = Room(
            number=number,
            # floor=floor, # Calculated in Serializer
            room_type=r_type,
            status=status,
            cleaning_type=c_type,
            guest_status=g_status,
            check_in_date=check_in,
            check_out_date=check_out,
            # is_dnd=(g_status == 'DND'), # No boolean field
            # last_updated=datetime.now() # No field
        )
        rooms_to_create.append(room)

    Room.objects.bulk_create(rooms_to_create)
    print(f"Successfully created {len(rooms_to_create)} rooms.")

populate_rooms()
