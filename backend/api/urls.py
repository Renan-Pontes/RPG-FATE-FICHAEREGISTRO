from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    RegisterView, LoginView, MeView,
    CampaignViewSet, CampaignPollView,
    CharacterViewSet, CharacterNoteViewSet,
    ItemViewSet, DiceRollViewSet, NotificationViewSet,
    SkillViewSet, AbilityViewSet, AdvantageViewSet, PersonalityTraitViewSet,
    BleachSpellViewSet,
    StandViewSet, CursedTechniqueViewSet, ZanpakutoViewSet, PowerIdeaViewSet, SkillIdeaViewSet,
    SessionViewSet, MessageViewSet,
)

router = DefaultRouter()
router.register('campaigns', CampaignViewSet, basename='campaign')
router.register('characters', CharacterViewSet, basename='character')
router.register('notes', CharacterNoteViewSet, basename='note')
router.register('items', ItemViewSet, basename='item')
router.register('rolls', DiceRollViewSet, basename='roll')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('messages', MessageViewSet, basename='message')
router.register('skills', SkillViewSet, basename='skill')
router.register('skill-ideas', SkillIdeaViewSet, basename='skill-idea')
router.register('abilities', AbilityViewSet, basename='ability')
router.register('advantages', AdvantageViewSet, basename='advantage')
router.register('traits', PersonalityTraitViewSet, basename='trait')
router.register('bleach-spells', BleachSpellViewSet, basename='bleach-spell')
router.register('stands', StandViewSet, basename='stand')
router.register('power-ideas', PowerIdeaViewSet, basename='power-idea')
router.register('cursed-techniques', CursedTechniqueViewSet, basename='cursed-technique')
router.register('zanpakuto', ZanpakutoViewSet, basename='zanpakuto')
router.register('sessions', SessionViewSet, basename='session')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/me/', MeView.as_view(), name='me'),
    
    # Polling
    path('campaigns/<int:campaign_id>/poll/', CampaignPollView.as_view(), name='campaign-poll'),
    
    # Router
    path('', include(router.urls)),
]
