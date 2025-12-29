from django.contrib import admin
from .models import Room

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('number', 'status', 'cleaning_type', 'guest_status', 'assigned_group', 'priority')
    list_filter = ('status', 'assigned_group', 'guest_status', 'cleaning_type')
    search_fields = ('number', 'assigned_group')
