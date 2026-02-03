import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')
django.setup()

from accounts.models import CustomUser

def create_users():
    users = [
        {'username': 'admin', 'password': 'admin123', 'role': 'SUPERVISOR', 'is_superuser': True, 'is_staff': True},
        {'username': 'Ramiro', 'password': 'password123', 'role': 'CLEANER', 'group': 'Group 1'},
        {'username': 'Juan', 'password': 'password123', 'role': 'CLEANER', 'group': 'Group 2'},
    ]

    for user_data in users:
        username = user_data['username']
        password = user_data['password']
        
        if CustomUser.objects.filter(username=username).exists():
            print(f"User '{username}' already exists.")
            # Optional: Reset password if needed
            # u = CustomUser.objects.get(username=username)
            # u.set_password(password)
            # u.save()
        else:
            print(f"Creating user '{username}'...")
            if user_data.get('is_superuser'):
                CustomUser.objects.create_superuser(username=username, password=password, email='admin@example.com')
            else:
                user = CustomUser.objects.create_user(username=username, password=password, role=user_data['role'])
                if 'group' in user_data:
                    user.group_id = user_data['group']
                    user.save()
            print(f"User '{username}' created.")

if __name__ == "__main__":
    create_users()
