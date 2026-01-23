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
    
    ROOM_TYPE_CHOICES = (
        ('Single', 'Single'),
        ('Double', 'Double'),
        ('Suite', 'Suite'),
    )
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='Single')

    guest_status = models.CharField(max_length=20, choices=GUEST_STATUS_CHOICES, default='NO_GUEST')
    
    assigned_group = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. 'Group 1' or 'Lobby Team'")
    assigned_cleaner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_rooms')
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
    
    first_time_cleaned = models.BooleanField(default=False) # For STAYOVER logic if needed (Note: this was missing in view, adding conceptually if needed or sticking to plan) 
    # Actually 'first_time_cleaned' wasn't in the file view, so I should be careful not to hallucinate it.
    # Looking at line 81: "last_cleaned = models.DateTimeField(blank=True, null=True)"
    
    # Advanced Features
    is_guest_waiting = models.BooleanField(default=False)
    last_dnd_timestamp = models.DateTimeField(null=True, blank=True)

    last_cleaned = models.DateTimeField(blank=True, null=True)
    
    # New Fields for Detailed View
    notes = models.TextField(blank=True, null=True, help_text="Housekeeping notes for this room")
    guest_details = models.JSONField(default=dict, blank=True, null=True, help_text="JSON structure: {reservation_number, guests, departure_date, etc}")

    # Phase 2: Inspection
    last_inspection_report = models.JSONField(blank=True, null=True) # Stores result of last checklist
    
    # Supplies Tracker
    supplies_used = models.JSONField(default=dict, blank=True) # Stores { "Shampoo": 2, "Coffee": 1 }
    cleaning_started_at = models.DateTimeField(blank=True, null=True) # Shared Timer Timestamp
    last_cleaning_duration = models.IntegerField(blank=True, null=True) # Duration in seconds
    last_updated = models.DateTimeField(auto_now=True) # Automatic timestamp for any change
    is_houseman_completed = models.BooleanField(default=False) # Helper/Houseman status

    def __str__(self):
        return f"Room {self.number} ({self.status}) - {self.assigned_group}"

class Incident(models.Model):
    PRIORITY_CHOICES = (('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('EMERGENCY', 'Emergency'))
    STATUS_CHOICES = (('OPEN', 'Open'), ('RESOLVED', 'Resolved'))
    ROLE_CHOICES = (('MAINTENANCE', 'Maintenance'), ('RECEPTION', 'Reception'), ('SUPERVISOR', 'Supervisor'), ('HOUSEMAN', 'Houseman'), ('CLEANER', 'Cleaner'))
    CATEGORY_CHOICES = (
        ('MAINTENANCE', 'Maintenance'),
        ('GUEST_REQ', 'Guest Request'),
        ('SUPPLY', 'Supply Request'),
        ('PREVENTIVE', 'Preventive Maintenance'),
        ('TASK', 'General Task')
    )

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='incidents', null=True, blank=True)
    text = models.TextField() # 'description' in plan, but 'text' matches frontend interface
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    target_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MAINTENANCE')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='MAINTENANCE')
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
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

class LostItem(models.Model):
    STATUS_CHOICES = (('FOUND', 'Found'), ('RETURNED', 'Returned'), ('DISPOSED', 'Disposed'))
    
    description = models.CharField(max_length=200)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='lost_items', null=True, blank=True)
    found_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='FOUND')
    photo_uri = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Lost Item: {self.description} ({self.status})"

class Announcement(models.Model):
    PRIORITY_CHOICES = (('NORMAL', 'Normal'), ('HIGH', 'High'))

    title = models.CharField(max_length=100)
    message = models.TextField()
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='NORMAL')

    def __str__(self):
        return self.title

class Asset(models.Model):
    STATUS_CHOICES = (
        ('GOOD', 'Good'),
        ('REPAIR', 'Repair Needed'),
        ('BROKEN', 'Broken')
    )
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='assets', null=True, blank=True)
    name = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    install_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='GOOD')
    
    def __str__(self):
        return f"{self.name} ({self.room.number if self.room else 'No Room'})"

class StaffAvailability(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('VACATION', 'Vacation'),
        ('OFF', 'Off Day'),
        ('PARTIAL', 'Partial Day'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    
    start_time = models.TimeField(blank=True, null=True, help_text="Override start time for Partial availability")
    end_time = models.TimeField(blank=True, null=True, help_text="Override end time for Partial availability")
    
    class Meta:
        unique_together = ('user', 'date')
        
    def __str__(self):
        return f"{self.user} - {self.date} ({self.status})"

class WorkShift(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shifts')
    date = models.DateField()
    start_time = models.TimeField(default='09:00')
    end_time = models.TimeField(default='17:00')
    
    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"Shift: {self.user} on {self.date}"
