from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoomViewSet, IncidentViewSet, InventoryItemViewSet, CleaningTypeDefinitionViewSet, CleaningSessionViewSet, LostItemViewSet, AnnouncementViewSet, StatsViewSet, AssetViewSet

router = DefaultRouter()
router.register(r'rooms', RoomViewSet)
router.register(r'incidents', IncidentViewSet)
router.register(r'inventory', InventoryItemViewSet)
router.register(r'cleaning-types', CleaningTypeDefinitionViewSet)
router.register(r'cleaning-sessions', CleaningSessionViewSet)
router.register(r'lost-items', LostItemViewSet)
router.register(r'announcements', AnnouncementViewSet)
router.register(r'assets', AssetViewSet)
router.register(r'stats', StatsViewSet, basename='stats')

urlpatterns = [
    path('', include(router.urls)),
]
