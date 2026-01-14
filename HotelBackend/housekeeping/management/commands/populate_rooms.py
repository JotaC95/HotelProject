import random
from django.core.management.base import BaseCommand
from housekeeping.models import Room, CleaningTypeDefinition
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'Populates the database with 62 random rooms. Skips if rooms exist.'

    def handle(self, *args, **kwargs):
        if Room.objects.exists():
            self.stdout.write(self.style.WARNING('Rooms already populate. Skipping to prevent data loss.'))
            return

        self.stdout.write('Seeding rooms 1 to 62...')
        
        # Ensure cleaning types exist
        CleaningTypeDefinition.objects.get_or_create(name='DEPARTURE', defaults={'estimated_minutes': 30})
        CleaningTypeDefinition.objects.get_or_create(name='STAYOVER', defaults={'estimated_minutes': 15})
        CleaningTypeDefinition.objects.get_or_create(name='PREARRIVAL', defaults={'estimated_minutes': 45})

        room_types = ['Single', 'Double', 'Suite']
        statuses = ['PENDING', 'IN_PROGRESS', 'INSPECTION', 'COMPLETED'] # Maintenance less frequent
        cleaning_types = ['DEPARTURE', 'STAYOVER', 'WEEKLY', 'RUBBISH'] 
        guest_statuses = ['NO_GUEST', 'GUEST_IN_ROOM', 'GUEST_OUT']

        count = 0
        for i in range(1, 63):
            room_number = str(i)
            
            r_type = random.choice(room_types)
            status = random.choice(statuses)
            
            # Consistency Logic
            g_status = random.choice(guest_statuses)
            if status == 'COMPLETED':
                c_type = 'STAYOVER' if g_status != 'NO_GUEST' else 'PREARRIVAL'
            else:
                c_type = random.choice(cleaning_types)

            if g_status == 'NO_GUEST':
                current_guest = None
                check_in = None
                check_out = None
            else:
                current_guest = f"Guest {room_number}"
                check_in = date.today() - timedelta(days=random.randint(0, 5))
                check_out = date.today() + timedelta(days=random.randint(1, 4))
            
            # Configuration
            if r_type == 'Single':
                beds = '1 Queen'
                b_count = 1
            elif r_type == 'Double':
                beds = '2 Queens'
                b_count = 1
            else:
                beds = '1 King, 1 Sofa Bed'
                b_count = 2

            Room.objects.create(
                number=room_number,
                room_type=r_type,
                status=status,
                cleaning_type=c_type,
                guest_status=g_status,
                bed_setup=beds,
                bedroom_count=b_count,
                current_guest_name=current_guest,
                check_in_date=check_in,
                check_out_date=check_out,
                priority=random.choice([True, False, False, False]) # 25% priority
            )
            count += 1
            self.stdout.write(f"Created Room {room_number}")

        self.stdout.write(self.style.SUCCESS(f'Successfully created {count} rooms.'))
