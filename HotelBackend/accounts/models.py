from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('SUPERVISOR', 'Supervisor'),
        ('CLEANER', 'Cleaner'),
        ('MAINTENANCE', 'Maintenance'),
        ('RECEPTION', 'Reception'),
        ('HOUSEMAN', 'Houseman'),
        ('ADMIN', 'Administrator'),
    )
    GROUP_CHOICES = tuple([(f'Group {i}', f'Group {i}') for i in range(1, 11)]) # Group 1 - Group 10

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLEANER')
    group_id = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. 'Group 1'", choices=GROUP_CHOICES)

    def __str__(self):
        return f"{self.username} ({self.role})"
