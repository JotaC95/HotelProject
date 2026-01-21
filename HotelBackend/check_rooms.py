from housekeeping.models import Room
print(f"Total Rooms: {Room.objects.count()}")
for r in Room.objects.all().order_by('number'):
    print(f"Room {r.number}: {r.assigned_group}")
