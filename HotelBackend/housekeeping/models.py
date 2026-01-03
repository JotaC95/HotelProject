from django.db import models
from django.conf import settings

class Room(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('INSPECTION', 'Inspection'),
        ('COMPLETED', 'Completed'),
        ('MAINTENANCE', 'Maintenance'),
    )
class CleaningTypeDefinition(models.Model):
    name = models.CharField(max_length=50, unique=True)
    estimated_minutes = models.IntegerField(default=30)
    
    def __str__(self):
        return f"{self.name} ({self.estimated_minutes} min)"

class Room(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('INSPECTION', 'Inspection'),
        ('COMPLETED', 'Completed'),
        ('MAINTENANCE', 'Maintenance'),
    )
    # cleaning_type is now dynamic, managed by CleaningTypeDefinition
    
    GUEST_STATUS_CHOICES = (
        ('GUEST_OUT', 'Guest Out'),
        ('GUEST_IN_ROOM', 'Guest in Room'),
        ('NO_GUEST', 'No Guest'),
        ('DND', 'Do Not Disturb'),
    )

    CLEANING_TYPE_CHOICES = (
        ('DEPARTURE', 'Departure'),
        ('PREARRIVAL', 'Pre-arrival'),
        ('WEEKLY', 'Weekly'),
        ('HOLDOVER', 'Holdover'),
        ('RUBBISH', 'Rubbish'),
        ('DAYUSE', 'Day Use'),
    )

    number = models.CharField(max_length=10, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    cleaning_type = models.CharField(max_length=50, choices=CLEANING_TYPE_CHOICES, default='DEPARTURE')
    guest_status = models.CharField(max_length=20, choices=GUEST_STATUS_CHOICES, default='NO_GUEST')
    
    GROUP_CHOICES = tuple([(f'Group {i}', f'Group {i}') for i in range(1, 11)]) # Group 1 - Group 10

    assigned_group = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. 'Group 1'", choices=GROUP_CHOICES)
    priority = models.BooleanField(default=False)
    
    # Maintenance Info
    maintenance_reason = models.TextField(blank=True, null=True, help_text="Reason for maintenance status")

    # Room Configuration
    bed_setup = models.CharField(max_length=100, default='1 King', help_text="e.g. '1 King, 2 Singles'")
    bedroom_count = models.IntegerField(default=1)
    extras_text = models.CharField(max_length=200, blank=True, help_text="Comma-separated extras (e.g. 'Crib, Towels')")
    
    # Guest Info
    current_guest_name = models.CharField(max_length=100, blank=True, null=True)
    check_in_date = models.DateField(blank=True, null=True)
    check_out_date = models.DateField(blank=True, null=True)
    
    # Next Guest (for Pre-Arrival)
    next_guest_name = models.CharField(max_length=100, blank=True, null=True)
    next_arrival_time = models.DateTimeField(blank=True, null=True)
    
    # Extra fields for timers/stats
    last_cleaned = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Room {self.number} ({self.status}) - {self.assigned_group}"

class Incident(models.Model):
    PRIORITY_CHOICES = (('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'))
    STATUS_CHOICES = (('OPEN', 'Open'), ('RESOLVED', 'Resolved'))
    ROLE_CHOICES = (('MAINTENANCE', 'Maintenance'), ('RECEPTION', 'Reception'), ('SUPERVISOR', 'Supervisor'), ('HOUSEMAN', 'Houseman'))

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='incidents', null=True, blank=True)
    text = models.TextField() # 'description' in plan, but 'text' matches frontend interface
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    target_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MAINTENANCE')
    
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reported_incidents')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    photo_uri = models.CharField(max_length=500, blank=True, null=True) # Matches frontend 'photoUri'

    def __str__(self):
        return f"Incident {self.id} - {self.room.number if self.room else 'System'} ({self.status})"

class InventoryItem(models.Model):
    CATEGORY_CHOICES = (('LINEN', 'Linen'), ('TOILETRIES', 'Toiletries'), ('CLEANING', 'Cleaning Supplies'), ('OTHER', 'Other'))

    name = models.CharField(max_length=100)
    quantity = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=10)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='OTHER')
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.quantity})"

class CleaningSession(models.Model):
    STATUS_CHOICES = (('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('OVERTIME', 'Overtime'))
    
    group_id = models.CharField(max_length=50) # The team ID
    start_time = models.DateTimeField(auto_now_add=True)
    target_duration_minutes = models.IntegerField(default=0)
    end_time = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    
    def __str__(self):
        return f"Session {self.group_id} - {self.status}"
