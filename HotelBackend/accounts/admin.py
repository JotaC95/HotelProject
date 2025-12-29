from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Hotel Info', {'fields': ('role', 'group_id')}),
    )
    list_display = ('username', 'email', 'role', 'group_id', 'is_staff')
    list_filter = ('role', 'group_id', 'is_staff')

admin.site.register(CustomUser, CustomUserAdmin)
