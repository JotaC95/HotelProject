import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from accounts.models import CustomUser

def reset_passwords():
    print("--- Resetting Passwords ---")
    users = ['Ramiro', 'Juan']
    for username in users:
        try:
            u = CustomUser.objects.get(username=username)
            u.set_password('password123')
            u.save()
            print(f"Reset password for {username} to 'password123'")
        except CustomUser.DoesNotExist:
            print(f"User {username} not found")

if __name__ == "__main__":
    reset_passwords()
