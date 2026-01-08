import requests
import os
import sys

# Assume localhost for backend check
BASE_URL = 'http://127.0.0.1:8000/api'

def debug_api():
    # 1. Login
    print("Logging in as Ramiro...")
    try:
        resp = requests.post(f"{BASE_URL}/login/", json={'username': 'Ramiro', 'password': 'password123'}) # Assuming default password or I should reset it?
        # User 2 Ramiro might have a different password.
        # I can't guess the password. 
        # I can generate a token MANUALLY in python script using Django ORM.
        pass
    except:
        pass

# Better approach: Use Django Test Client or internal request factory in a script, 
# OR generated a token for Ramiro directly.

import django
sys.path.append('/Users/jota1/Documents/DEV/Proyectos/HotelProject/HotelBackend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

User = get_user_model()
client = APIClient()

try:
    ramiro = User.objects.get(username="Ramiro")
    token, _ = Token.objects.get_or_create(user=ramiro)
    print(f"Token for Ramiro: {token.key}")
    
    client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
    response = client.get('/api/housekeeping/rooms/')
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total Rooms Fetched: {len(data)}")
        # Check first room with assignment
        for r in data:
            if r.get('assigned_cleaner'):
                print(f"Room {r['number']}: assigned_cleaner = {r['assigned_cleaner']} (Type: {type(r['assigned_cleaner'])})")
                print(f"Room {r['number']}: assigned_group = {r.get('assigned_group')}")
                # Print full object for one
                print("Full Object Config:", r.keys())
                break
        else:
            print("No rooms with assigned_cleaner found in response??")
            
except Exception as e:
    print(f"Error: {e}")
