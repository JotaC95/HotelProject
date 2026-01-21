import json
from django.core.management.base import BaseCommand
from housekeeping.models import Room, CleaningTypeDefinition
from django.utils import timezone

class Command(BaseCommand):
    help = 'Imports rooms from a JSON file'

    def handle(self, *args, **options):
        try:
            with open('new_data.json', 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('new_data.json not found in HotelBackend root.'))
            return

        self.stdout.write(f"Importing data for {data.get('property')} - {data.get('date')}")

        teams = data.get('teams', {})
        
        # Reset current assignments first? Or keep?
        # Let's assume this is a daily load, so we might want to clear old assignments for these rooms
        # But for safety, we just upsert.

        for team_key, team_data in teams.items():
            team_name = team_key.replace('_', ' ').title() # "team_1" -> "Team 1"
            # Map "Team 1" to "Group 1" if preferred, or keep as is.
            # User uses "Group 1" in other places, maybe map or just use "Team 1" 
            # The JSON implies allocation, so we assign the group.
            
            # Simple mapping if needed, or just use the key. Let's use formatted key.
            # actually, standardizing on "Group X" might be better if the app relies on it.
            if "team_" in team_key:
                group_name = team_key.replace("team_", "Group ")
            else:
                group_name = team_name

            for room_data in team_data.get('rooms', []):
                room_number = room_data.get('room')
                
                # Check Room Status/Task
                task_raw = room_data.get('task', 'Departure')
                cleaning_type = 'DEPARTURE' # Default
                
                if 'Pre Arrival' in task_raw:
                    cleaning_type = 'PREARRIVAL'
                elif 'Rubbish' in task_raw:
                    cleaning_type = 'RUBBISH'
                elif 'Stayover' in task_raw:
                    cleaning_type = 'STAYOVER'
                # ... Add mappings as needed

                # Create or Update Room
                room, created = Room.objects.get_or_create(number=room_number)
                
                # Update fields
                room.assigned_group = group_name
                room.cleaning_type = cleaning_type
                room.notes = room_data.get('notes', '')
                
                # Status Logic based on In/Out
                in_out = room_data.get('in_out')
                if in_out == 'In':
                    room.guest_status = 'GUEST_IN_ROOM' # Or 'IN_ROOM' depending on model choices
                    # Actually model choices are GUEST_IN_ROOM, GUEST_OUT, NO_GUEST, DND
                    room.guest_status = 'GUEST_IN_ROOM'
                elif in_out == 'Out':
                    room.guest_status = 'GUEST_OUT'
                
                # Reset status to PENDING for new day load
                room.status = 'PENDING'

                room.save()
                
                action = "Created" if created else "Updated"
                self.stdout.write(f"{action} Room {room_number} -> {group_name} ({task_raw})")

        self.stdout.write(self.style.SUCCESS('Successfully imported room data'))
