import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hotel_backend.settings")
django.setup()

from housekeeping.models import Room

count = Room.objects.count()
print(f"Total Rooms in DB: {count}")
if count > 0:
    print("Sample Room:", Room.objects.first())
else:
    print("Database is empty of rooms.")
