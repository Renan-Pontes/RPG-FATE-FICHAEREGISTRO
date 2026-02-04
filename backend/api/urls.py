from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CampaignViewSet, CharacterViewSet, ItemViewSet, LoginView, RegisterView

router = DefaultRouter()
router.register('campaigns', CampaignViewSet, basename='campaign')
router.register('characters', CharacterViewSet, basename='character')
router.register('items', ItemViewSet, basename='item')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('', include(router.urls)),
]
