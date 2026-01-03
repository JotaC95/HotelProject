from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoomViewSet, IncidentViewSet, InventoryItemViewSet, CleaningTypeDefinitionViewSet, CleaningSessionViewSet

router = DefaultRouter()
router.register(r'rooms', RoomViewSet)
router.register(r'incidents', IncidentViewSet)
router.register(r'inventory', InventoryItemViewSet)
router.register(r'cleaning-types', CleaningTypeDefinitionViewSet)
router.register(r'cleaning-sessions', CleaningSessionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
