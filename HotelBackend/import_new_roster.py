
import os
import json
import re
import django
from datetime import datetime, time

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from housekeeping.models import Room

DATA_FILE = 'new_data.json'

def parse_depart_date(date_str):
    """
    Parses dates like '26 Jan 2026 (4)' to 'YYYY-MM-DD'.
    The (4) likely means 4 nights remaining or similar, we ignore it for the date field.
    """
    try:
        # Remove the (N) part
        clean_str = re.sub(r'\s*\(\d+\)', '', date_str).strip()
        dt = datetime.strptime(clean_str, '%d %b %Y')
        return dt.date()
    except (ValueError, TypeError):
        return None

def normalize_cleaning_type(task_name):
    """
    Maps JSON task strings to DB cleaning types.
    """
    task_map = {
        'Departure': 'DEPARTURE',
        'Pre Arrival Check': 'PREARRIVAL',
        'Weekly Service': 'WEEKLY',
        'Rubbish Removal': 'RUBBISH',
        # Fallbacks
        'Service': 'STAYOVER',
        'Daily': 'DAYUSE'
    }
    return task_map.get(task_name, 'STAYOVER') # Default to something safe

def normalize_guest_status(in_out_str, task_name, notes=""):
    """
    Determines Guest Status.
    JSON "status_in_out": "(In)", "(Out)", or null.
    """
    if in_out_str == '(In)':
        return 'GUEST_IN_ROOM'
    elif in_out_str == '(Out)':
        return 'GUEST_OUT'
    
    # Logic if null:
    # If task is 'Departure', guest likely leaving or left.
    # If notes contain "Inhouse", maybe In.
    return 'NO_GUEST' # Default

def import_data():
    if not os.path.exists(DATA_FILE):
        print(f"File {DATA_FILE} not found!")
        return

    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    print(f"Importing data for {data.get('hotel_name')} - {data.get('date')}")

    teams = data.get('teams', [])
    updated_count = 0
    created_count = 0

    for team in teams:
        team_name = team['team_name'] # e.g. "Team 1 (1 - 19)"
        # Shorten group name? "Team 1"
        short_group = team_name.split('(')[0].strip()

        print(f"Processing {team_name}...")

        for r_data in team['rooms']:
            room_number = r_data['room_number']
            
            # Find or Create Room
            room, created = Room.objects.get_or_create(number=room_number)
            
            # Map Fields
            room.assigned_group = short_group
            
            # Cleaning Type
            room.cleaning_type = normalize_cleaning_type(r_data.get('task'))
            
            # Status Logic
            # If task is incomplete, status is pending.
            # If task_status == "Incomplete": PENDING (or IN_PROGRESS if cleaner started)
            # We reset to PENDING for new roster import mostly.
            if r_data.get('task_status') == 'Incomplete':
                 # Only reset if not already completed today? 
                 # For import, we assume this is the 'Plan' for the day.
                 room.status = 'PENDING'
            
            # Guest Status
            room.guest_status = normalize_guest_status(r_data.get('status_in_out'), r_data.get('task'))
            
            # Notes
            room.notes = r_data.get('notes', '')
            
            # Room Type & Configuration from "room_type": "1Q - 1 Bedroom - 106"
            rt_str = r_data.get('room_type', '')
            if '1 Bedroom' in rt_str:
                room.room_type = 'Single'
                room.bedroom_count = 1
            elif '2 Bedroom' in rt_str:
                room.room_type = 'Double'
                room.bedroom_count = 2
            elif '3 Bedroom' in rt_str:
                room.room_type = 'Suite'
                room.bedroom_count = 3
            
            # Bed Setup extraction (Primitive)
            # Try to grab "1Q", "2KT" etc from start string, or rely on notes
            # Defaults to 'Standard' if not parsed, but we can try.
            
            # Note parsing for Bed Setup if available
            # "unlock 2nd bedroom 2 kings"
            
            # Guest Details JSON
            guest_info = {
                'reservation_number': r_data.get('res_no'),
                'people': r_data.get('people'),
                'currentGuest': f"Guest {r_data.get('res_no')}", # We don't have names, use Res No?
                'checkOutDate': str(parse_depart_date(r_data.get('depart_date'))),
                'nextArrival': None # Not in this JSON
            }
            
            # Determine Check-out date on model field too
            d_date = parse_depart_date(r_data.get('depart_date'))
            room.check_out_date = d_date
            
            # Update guestDetails field
            if room.guest_details:
                room.guest_details.update(guest_info)
            else:
                room.guest_details = guest_info
                
            # Current Guest Name field
            room.current_guest_name = guest_info['people'] + " (" + guest_info['reservation_number'] + ")"

            room.save()
            
            if created:
                created_count += 1
            else:
                updated_count += 1

    print(f"Done. Updated {updated_count} rooms, Created {created_count} rooms.")

if __name__ == '__main__':
    import_data()
