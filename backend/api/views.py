from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Campaign, Profile, character, item
from .permissions import IsGameMaster, IsGameMasterUser, IsOwnerOrGameMaster
from .serializers import (
    CampaignSerializer,
    CharacterCreateSerializer,
    CharacterPublicSerializer,
    CharacterSerializer,
    ItemSerializer,
    RegisterSerializer,
)


def _get_is_game_master(user):
    if user.is_staff or user.is_superuser:
        return True
    try:
        return bool(user.profile.is_game_master)
    except Profile.DoesNotExist:
        return False


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        Profile.objects.get_or_create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_game_master': _get_is_game_master(user),
                'token': token.key,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'detail': 'Credenciais invalidas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        Profile.objects.get_or_create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_game_master': _get_is_game_master(user),
                'token': token.key,
            },
            status=status.HTTP_200_OK,
        )


class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().order_by('-created_at')
    serializer_class = CampaignSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsGameMasterUser()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsGameMaster()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CharacterViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        campaign_id = self.request.query_params.get('campaign')
        qs = character.objects.all().order_by('-created_at')
        if _get_is_game_master(user):
            if campaign_id:
                return qs.filter(Campaign_id=campaign_id)
            return qs
        if campaign_id:
            return qs.filter(Campaign_id=campaign_id)
        return qs.filter(owner=user)

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsOwnerOrGameMaster()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            if _get_is_game_master(self.request.user):
                return CharacterSerializer
            return CharacterCreateSerializer
        if _get_is_game_master(self.request.user):
            return CharacterSerializer
        return CharacterPublicSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer

    def get_queryset(self):
        user = self.request.user
        campaign_id = self.request.query_params.get('campaign')
        qs = item.objects.select_related('owner_character', 'owner_character__Campaign')
        if _get_is_game_master(user):
            if campaign_id:
                return qs.filter(owner_character__Campaign_id=campaign_id).order_by('-id')
            return qs.order_by('-id')
        qs = qs.filter(owner_character__owner=user)
        if campaign_id:
            qs = qs.filter(owner_character__Campaign_id=campaign_id)
        return qs.order_by('-id')

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsOwnerOrGameMaster()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        owner_character = serializer.validated_data.get('owner_character')
        if owner_character is None:
            raise PermissionDenied('Personagem invalido.')
        if not _get_is_game_master(self.request.user) and owner_character.owner_id != self.request.user.id:
            raise PermissionDenied('Voce nao pode criar item para outro jogador.')
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        new_owner = serializer.validated_data.get('owner_character')
        if new_owner and new_owner.Campaign_id != instance.owner_character.Campaign_id:
            raise PermissionDenied('Itens so podem ser transferidos dentro da mesma campanha.')
        serializer.save()
