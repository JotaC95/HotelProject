from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = "Creates a superuser if it doesn't exist, using env vars ADMIN_USER and ADMIN_PASS"

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('ADMIN_USER')
        password = os.environ.get('ADMIN_PASS')
        email = os.environ.get('ADMIN_EMAIL', 'admin@example.com')

        if not username or not password:
            self.stdout.write(self.style.WARNING("ADMIN_USER or ADMIN_PASS not set. Skipping superuser creation."))
            return

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created successfully!"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' already exists."))
