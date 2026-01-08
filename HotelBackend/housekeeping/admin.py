from django.contrib import admin
from .models import (
    Room, CleaningTypeDefinition, Incident, InventoryItem, 
    CleaningSession, LostItem, Announcement, Asset, 
    StaffAvailability, WorkShift
)

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('number', 'status', 'cleaning_type', 'guest_status', 'assigned_group', 'priority')
    list_filter = ('status', 'assigned_group', 'guest_status', 'cleaning_type')
    search_fields = ('number', 'assigned_group')

@admin.register(CleaningTypeDefinition)
class CleaningTypeDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'estimated_minutes')

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'category', 'priority', 'status', 'target_role', 'created_at')
    list_filter = ('status', 'priority', 'category', 'target_role')
    search_fields = ('room__number', 'text')

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'quantity', 'min_stock', 'last_updated')
    list_filter = ('category',)
    search_fields = ('name',)

@admin.register(CleaningSession)
class CleaningSessionAdmin(admin.ModelAdmin):
    list_display = ('group_id', 'status', 'start_time', 'end_time', 'target_duration_minutes')
    list_filter = ('status',)

@admin.register(LostItem)
class LostItemAdmin(admin.ModelAdmin):
    list_display = ('description', 'room', 'status', 'found_by', 'created_at')
    list_filter = ('status',)
    search_fields = ('description', 'room__number')

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'sender', 'priority', 'created_at')
    list_filter = ('priority',)

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('name', 'room', 'status', 'install_date')
    list_filter = ('status',)
    search_fields = ('name', 'room__number', 'serial_number')

@admin.register(StaffAvailability)
class StaffAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'status')
    list_filter = ('status', 'date')

@admin.register(WorkShift)
class WorkShiftAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'start_time', 'end_time')
    list_filter = ('date',)
