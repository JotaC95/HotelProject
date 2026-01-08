import os
import django
import sys

sys.path.append('/Users/jota1/Documents/DEV/Proyectos/HotelProject/HotelBackend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    ramiro = User.objects.get(username="Ramiro") # Or id=2
    print(f"User: {ramiro.username}")
    print(f"ID: {ramiro.id}")
    print(f"Role: {ramiro.role}")
    print(f"Group ID: '{ramiro.group_id}'") # Check exactly what is stored
except Exception as e:
    print(f"Error: {e}")
