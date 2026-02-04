from rest_framework.permissions import BasePermission

from .models import Campaign, Profile


def _get_campaign(obj):
    if isinstance(obj, Campaign):
        return obj
    if hasattr(obj, 'Campaign') and obj.Campaign is not None:
        return obj.Campaign
    if hasattr(obj, 'campaign') and obj.campaign is not None:
        return obj.campaign
    if hasattr(obj, 'owner_character') and obj.owner_character is not None:
        return getattr(obj.owner_character, 'Campaign', None)
    if hasattr(obj, 'character') and obj.character is not None:
        return getattr(obj.character, 'Campaign', None)
    return None


def _get_owner_id(obj):
    if hasattr(obj, 'owner_id') and obj.owner_id is not None:
        return obj.owner_id
    if hasattr(obj, 'author_id') and obj.author_id is not None:
        return obj.author_id
    if hasattr(obj, 'owner_character') and obj.owner_character is not None:
        return getattr(obj.owner_character, 'owner_id', None)
    return None


def _user_is_game_master(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        return False
    return bool(profile.is_game_master)


class IsGameMaster(BasePermission):
    """
    Allow only the campaign owner (mestre) or a user flagged as Game Master.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if _user_is_game_master(request.user):
            return True
        campaign = _get_campaign(obj)
        if campaign is not None:
            return campaign.owner_id == request.user.id
        return False


class IsGameMasterUser(BasePermission):
    """
    Allow only users flagged as Game Master (or staff).
    """

    def has_permission(self, request, view):
        return _user_is_game_master(request.user)


class IsOwnerOrGameMaster(BasePermission):
    """
    Allow the object owner or the campaign owner (mestre).
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if _user_is_game_master(request.user):
            return True
        owner_id = _get_owner_id(obj)
        if owner_id is not None and owner_id == request.user.id:
            return True
        campaign = _get_campaign(obj)
        if campaign is not None:
            return campaign.owner_id == request.user.id
        return False
