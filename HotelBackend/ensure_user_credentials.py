import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from accounts.models import CustomUser

def ensure_user():
    username = 'Ramiro'
    password = 'password123'
    print(f"--- Ensuring User {username} ---")
    
    try:
        user = CustomUser.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"Password reset for existing user '{username}' to '{password}'")
    except CustomUser.DoesNotExist:
        print(f"User '{username}' not found! Creating...")
        CustomUser.objects.create_user(username=username, password=password, role='CLEANER', group_id='Group 1')
        print(f"Created user '{username}' with password '{password}'")

    # Also ensure a lowercase version just in case of keyboard confusion, if it doesn't conflict
    try:
        lower_user = CustomUser.objects.get(username=username.lower())
        lower_user.set_password(password)
        lower_user.save()
        print(f"Password reset for '{username.lower()}'")
    except CustomUser.DoesNotExist:
        pass

if __name__ == "__main__":
    ensure_user()
