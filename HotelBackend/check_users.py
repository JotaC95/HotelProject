import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from accounts.models import CustomUser

def list_users():
    print("--- Users ---")
    users = CustomUser.objects.all()
    for u in users:
        print(f"User: {u.username} | Role: {u.role} | Group: {u.group_id}")

if __name__ == "__main__":
    list_users()
