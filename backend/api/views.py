import random
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction, models
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Profile, Campaign, CampaignBan, Character, CharacterNote, Item, RollRequest,
    Skill, Ability, Advantage, PersonalityTrait,
    Stand, CursedTechnique, Zanpakuto, PowerIdea, SkillIdea,
    DiceRoll, Notification, ItemTrade, Session, Message
)
from .serializers import (
    RegisterSerializer, UserSerializer,
    CampaignSerializer, CampaignListSerializer, ProjectionSerializer, CampaignMapSerializer,
    CharacterPublicSerializer, CharacterMasterSerializer,
    CharacterCreateSerializer, CharacterStatsUpdateSerializer,
    CharacterNoteSerializer, ItemSerializer, ItemTransferSerializer,
    SkillSerializer, SkillPublicSerializer, AbilitySerializer, AdvantageSerializer, PersonalityTraitSerializer,
    PersonalityTraitPublicSerializer, SkillIdeaSerializer, MessageSerializer,
    StandSerializer, CursedTechniqueSerializer, CursedTechniquePublicSerializer, ZanpakutoSerializer, PowerIdeaSerializer,
    DiceRollSerializer, DiceRollMasterSerializer, DiceRollCreateSerializer, RollRequestSerializer,
    NotificationSerializer, ItemTradeSerializer, SessionSerializer,
)


def is_game_master(user):
    """Verifica se o usuário é mestre"""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    try:
        return user.profile.is_game_master
    except Profile.DoesNotExist:
        return False


def is_campaign_master(user, campaign):
    """Verifica se o usuário é o mestre da campanha específica"""
    return campaign.owner_id == user.id or is_game_master(user)


def is_user_banned_from_campaign(user, campaign):
    if not user or not user.is_authenticated:
        return False
    return CampaignBan.objects.filter(
        campaign=campaign,
        user=user,
        is_active=True,
    ).exists()


def ensure_not_banned(user, campaign):
    if not user or not user.is_authenticated:
        return
    if campaign is None:
        return
    if is_game_master(user):
        return
    if is_user_banned_from_campaign(user, campaign):
        raise PermissionDenied('Você foi banido desta campanha.')


def create_dice_roll(*, character, skill_id=None, description='', use_fate_point=False):
    """Cria uma rolagem de dados para um personagem."""
    # Rolar 4 dados FATE (-1, 0, +1)
    dice_results = [random.choice([-1, 0, 1]) for _ in range(4)]
    dice_total = sum(dice_results)

    if use_fate_point:
        if character.fate_points <= 0:
            raise ValidationError('Sem fate points disponíveis.')
        character.fate_points -= 1
        character.save()
        dice_results = [1, 1, 1, 1]
        final_total = 4
    else:
        final_total = dice_total

    skill = None
    hidden_bonus = 0
    if skill_id:
        try:
            skill = Skill.objects.get(id=skill_id)
        except Skill.DoesNotExist:
            raise ValidationError('Skill não encontrada.')
        if skill.campaign_id and skill.campaign_id != character.campaign_id:
            raise ValidationError('Skill inválida para esta campanha.')
        hidden_bonus += skill.bonus

        stat_map = {
            'forca': character.forca,
            'destreza': character.destreza,
            'vigor': character.vigor,
            'inteligencia': character.inteligencia,
            'sabedoria': character.sabedoria,
            'carisma': character.carisma,
        }
        if skill.use_status.lower() in stat_map:
            hidden_bonus += stat_map[skill.use_status.lower()]
            # Bônus de traços de personalidade
            trait_bonus = character.personality_traits.filter(
                use_status__iexact=skill.use_status
            ).aggregate(total=models.Sum('bonus'))['total'] or 0
            hidden_bonus += trait_bonus

    hidden_total = final_total + hidden_bonus

    roll = DiceRoll.objects.create(
        character=character,
        campaign=character.campaign,
        dice_1=dice_results[0],
        dice_2=dice_results[1],
        dice_3=dice_results[2],
        dice_4=dice_results[3],
        dice_total=dice_total,
        used_fate_point=use_fate_point,
        final_total=final_total,
        skill_used=skill,
        description=description or '',
        hidden_bonus=hidden_bonus,
        hidden_total=hidden_total,
    )
    return roll


def get_power_slot_info(character, idea_type):
    """Retorna (existentes, max_slots, label) para o tipo de poder."""
    if idea_type == 'stand':
        existing = Stand.objects.filter(owner_character=character).count()
        extra = max(int(character.extra_stand_slots or 0), 0)
        label = 'Stand'
    elif idea_type == 'zanpakuto':
        existing = Zanpakuto.objects.filter(owner_character=character).count()
        extra = max(int(character.extra_zanpakuto_slots or 0), 0)
        label = 'Zanpakutou'
    else:
        existing = CursedTechnique.objects.filter(owner_character=character).count()
        extra = max(int(character.extra_cursed_technique_slots or 0), 0)
        label = 'Técnica Amaldiçoada'
    max_slots = 1 + extra
    return existing, max_slots, label


# ============== AUTH ==============

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        Profile.objects.get_or_create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_game_master': is_game_master(user),
            'token': token.key,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'detail': 'Credenciais inválidas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        Profile.objects.get_or_create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_game_master': is_game_master(user),
            'token': token.key,
        })


class MeView(APIView):
    """Retorna dados do usuário logado"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_game_master': is_game_master(request.user),
        })


# ============== CAMPAIGN ==============

class CampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_game_master(user):
            return Campaign.objects.all().order_by('-created_at')
        # Jogadores podem ver todas as campanhas disponíveis (exceto banidas)
        return Campaign.objects.exclude(
            bans__user=user,
            bans__is_active=True,
        ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return CampaignListSerializer
        return CampaignSerializer

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar campanhas.')
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        if not is_campaign_master(self.request.user, self.get_object()):
            raise PermissionDenied('Apenas o mestre da campanha pode editá-la.')
        serializer.save()

    def perform_destroy(self, instance):
        if not is_campaign_master(self.request.user, instance):
            raise PermissionDenied('Apenas o mestre da campanha pode excluí-la.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def remove_player(self, request, pk=None):
        """Remove personagem do jogador (permite recriar)"""
        campaign = self.get_object()
        if not is_campaign_master(request.user, campaign):
            raise PermissionDenied('Apenas o mestre pode remover jogadores.')

        user_id = request.data.get('user_id')
        character_id = request.data.get('character_id')
        if not user_id and not character_id:
            raise ValidationError('Informe user_id ou character_id.')

        user_id_int = None
        if user_id is not None:
            try:
                user_id_int = int(user_id)
            except (TypeError, ValueError):
                raise ValidationError('user_id inválido.')

        removed_count = 0
        if character_id:
            try:
                character = Character.objects.get(
                    id=character_id,
                    campaign=campaign,
                    is_npc=False,
                )
            except Character.DoesNotExist:
                raise ValidationError('Personagem não encontrado.')
            if character.owner_id == campaign.owner_id:
                raise ValidationError('Não é possível remover o mestre.')
            character.delete()
            removed_count = 1
        else:
            if user_id_int == campaign.owner_id:
                raise ValidationError('Não é possível remover o mestre.')
            qs = Character.objects.filter(
                campaign=campaign,
                owner_id=user_id_int,
                is_npc=False,
            )
            removed_count = qs.count()
            qs.delete()

        return Response({'removed_characters': removed_count})

    @action(detail=True, methods=['post'])
    def ban_player(self, request, pk=None):
        """Bane um jogador da campanha (revogável no admin)"""
        campaign = self.get_object()
        if not is_campaign_master(request.user, campaign):
            raise PermissionDenied('Apenas o mestre pode banir jogadores.')

        user_id = request.data.get('user_id')
        character_id = request.data.get('character_id')
        reason = request.data.get('reason', '')
        if not user_id and not character_id:
            raise ValidationError('Informe user_id ou character_id.')

        user_id_int = None
        if user_id is not None:
            try:
                user_id_int = int(user_id)
            except (TypeError, ValueError):
                raise ValidationError('user_id inválido.')

        if character_id and not user_id:
            try:
                character = Character.objects.get(
                    id=character_id,
                    campaign=campaign,
                    is_npc=False,
                )
            except Character.DoesNotExist:
                raise ValidationError('Personagem não encontrado.')
            user_id_int = character.owner_id

        if user_id_int == campaign.owner_id:
            raise ValidationError('Não é possível banir o mestre.')

        try:
            user = User.objects.get(id=user_id_int)
        except User.DoesNotExist:
            raise ValidationError('Usuário não encontrado.')

        ban, created = CampaignBan.objects.get_or_create(
            campaign=campaign,
            user=user,
            defaults={'reason': reason},
        )
        if not created:
            ban.is_active = True
            if reason:
                ban.reason = reason
            ban.revoked_at = None
            ban.revoked_by = None
            ban.save()

        removed_qs = Character.objects.filter(
            campaign=campaign,
            owner=user,
            is_npc=False,
        )
        removed_count = removed_qs.count()
        removed_qs.delete()

        return Response({
            'status': 'banido',
            'removed_characters': removed_count,
        })

    @action(detail=True, methods=['post'])
    def request_roll(self, request, pk=None):
        """Mestre solicita rolagem para um jogador"""
        campaign = self.get_object()
        if not is_campaign_master(request.user, campaign):
            raise PermissionDenied('Apenas o mestre pode solicitar rolagens.')

        character_id = request.data.get('character_id')
        if not character_id:
            raise ValidationError('Informe character_id.')

        try:
            character = Character.objects.select_related('owner').get(
                id=int(character_id),
                campaign=campaign,
                is_npc=False,
            )
        except (Character.DoesNotExist, ValueError, TypeError):
            raise ValidationError('Personagem não encontrado.')

        if is_user_banned_from_campaign(character.owner, campaign):
            raise ValidationError('Este jogador está banido desta campanha.')

        skill_id = request.data.get('skill_id')
        skill = None
        if skill_id:
            try:
                skill = Skill.objects.get(id=skill_id)
            except Skill.DoesNotExist:
                raise ValidationError('Skill não encontrada.')
            if skill.campaign_id and skill.campaign_id != campaign.id:
                raise ValidationError('Skill inválida para esta campanha.')

        description = request.data.get('description', '')

        roll_request = RollRequest.objects.create(
            campaign=campaign,
            character=character,
            requested_by=request.user,
            skill=skill,
            description=description,
        )

        Notification.objects.create(
            campaign=campaign,
            recipient=character.owner,
            notification_type='system',
            title='Solicitação de rolagem',
            message=f'O mestre solicitou uma rolagem para {character.name}.',
            related_character=character,
        )

        return Response(RollRequestSerializer(roll_request).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def complete_roll(self, request, pk=None):
        """Jogador completa uma solicitação de rolagem"""
        campaign = self.get_object()
        request_id = request.data.get('request_id')
        if not request_id:
            raise ValidationError('Informe request_id.')

        try:
            roll_request = RollRequest.objects.select_related(
                'character', 'campaign', 'character__owner',
            ).get(id=int(request_id), campaign=campaign, is_open=True)
        except (RollRequest.DoesNotExist, ValueError, TypeError):
            raise ValidationError('Solicitação não encontrada ou já concluída.')

        ensure_not_banned(request.user, campaign)

        if roll_request.character.owner_id != request.user.id:
            raise PermissionDenied('Esta rolagem não é para você.')

        use_fate_point = bool(request.data.get('use_fate_point', False))
        roll = create_dice_roll(
            character=roll_request.character,
            skill_id=roll_request.skill_id,
            description=roll_request.description,
            use_fate_point=use_fate_point,
        )

        roll_request.is_open = False
        roll_request.fulfilled_at = timezone.now()
        roll_request.fulfilled_by = request.user
        roll_request.roll = roll
        roll_request.save()

        # Notificar todos os jogadores da campanha e o mestre
        participant_ids = set(
            Character.objects.filter(
                campaign=campaign,
                is_npc=False,
            ).values_list('owner_id', flat=True)
        )
        participant_ids.add(campaign.owner_id)

        for user_id in participant_ids:
            if user_id == campaign.owner_id:
                message = (
                    f'{roll.character.name} rolou: {roll.final_total} '
                    f'(Total oculto: {roll.hidden_total})'
                )
            else:
                message = f'{roll.character.name} rolou: {roll.final_total}'
            Notification.objects.create(
                campaign=campaign,
                recipient_id=user_id,
                notification_type='roll',
                title='Rolagem de Dados',
                message=message,
                related_character=roll.character,
                related_roll=roll,
            )

        return Response(DiceRollSerializer(roll).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def projection(self, request, pk=None):
        """Retorna a projeção atual da campanha"""
        campaign = self.get_object()
        return Response({
            'projection_image': campaign.projection_image.url if campaign.projection_image else None,
            'projection_title': campaign.projection_title,
            'projection_updated_at': campaign.projection_updated_at,
        })

    @action(detail=True, methods=['post'])
    def update_projection(self, request, pk=None):
        """Mestre atualiza a projeção"""
        campaign = self.get_object()
        if not is_campaign_master(request.user, campaign):
            raise PermissionDenied('Apenas o mestre pode atualizar a projeção.')
        
        serializer = ProjectionSerializer(campaign, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def map(self, request, pk=None):
        """Retorna o mapa atual da campanha"""
        campaign = self.get_object()
        ensure_not_banned(request.user, campaign)
        return Response({
            'map_image': campaign.map_image.url if campaign.map_image else None,
            'map_data': campaign.map_data or {},
            'map_updated_at': campaign.map_updated_at,
        })

    @action(detail=True, methods=['post'])
    def update_map(self, request, pk=None):
        """Mestre atualiza o mapa da campanha"""
        campaign = self.get_object()
        if not is_campaign_master(request.user, campaign):
            raise PermissionDenied('Apenas o mestre pode atualizar o mapa.')

        serializer = CampaignMapSerializer(campaign, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def party(self, request, pk=None):
        """Retorna todos os personagens da campanha"""
        campaign = self.get_object()
        characters = campaign.characters.filter(is_npc=False).order_by('name')
        
        if is_campaign_master(request.user, campaign):
            serializer = CharacterMasterSerializer(characters, many=True)
        else:
            serializer = CharacterPublicSerializer(characters, many=True)
        
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def npcs(self, request, pk=None):
        """Retorna os NPCs da campanha (apenas mestre)"""
        campaign = self.get_object()
        if not is_campaign_master(request.user, campaign):
            raise PermissionDenied('Apenas o mestre pode ver NPCs.')
        
        npcs = campaign.characters.filter(is_npc=True).order_by('name')
        serializer = CharacterMasterSerializer(npcs, many=True)
        return Response(serializer.data)


# ============== CHARACTER ==============

class CharacterViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        campaign_id = self.request.query_params.get('campaign')
        
        qs = Character.objects.select_related('campaign', 'owner').prefetch_related(
            'skills', 'abilities', 'advantages', 'personality_traits', 'items', 'notes',
            'stands', 'zanpakutos', 'cursed_techniques'
        )
        
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return qs.none()
            ensure_not_banned(user, campaign)
            qs = qs.filter(campaign_id=campaign_id)
        
        if is_game_master(user):
            return qs.order_by('-created_at')
        
        # Jogador vê apenas seus próprios personagens
        return qs.filter(owner=user, is_npc=False).exclude(
            campaign__bans__user=user,
            campaign__bans__is_active=True,
        ).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return CharacterCreateSerializer
        if is_game_master(self.request.user):
            return CharacterMasterSerializer
        return CharacterPublicSerializer

    def perform_create(self, serializer):
        raw_is_npc = self.request.data.get('is_npc', False)
        if isinstance(raw_is_npc, bool):
            is_npc = raw_is_npc
        else:
            is_npc = str(raw_is_npc).lower() in ('1', 'true', 't', 'yes', 'y')

        if is_npc and not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar NPCs.')

        if not is_npc:
            campaign = serializer.validated_data.get('campaign')
            ensure_not_banned(self.request.user, campaign)
            if campaign and Character.objects.filter(
                owner=self.request.user,
                campaign=campaign,
                is_npc=False,
            ).exists():
                raise ValidationError('Você já possui um personagem nesta campanha.')

        serializer.save(owner=self.request.user, is_npc=is_npc)

    def perform_update(self, serializer):
        character = self.get_object()
        ensure_not_banned(self.request.user, character.campaign)
        if not is_game_master(self.request.user) and character.owner_id != self.request.user.id:
            raise PermissionDenied('Você não pode editar este personagem.')
        if is_campaign_master(self.request.user, character.campaign):
            if 'shikai_active' in self.request.data or 'bankai_active' in self.request.data:
                raise ValidationError('Ativação de Shikai/Bankai é decisão do jogador.')
        serializer.save()

    def perform_destroy(self, instance):
        ensure_not_banned(self.request.user, instance.campaign)
        if not is_game_master(self.request.user) and instance.owner_id != self.request.user.id:
            raise PermissionDenied('Você não pode remover este personagem.')
        instance.delete()

    @action(detail=True, methods=['patch'])
    def update_stats(self, request, pk=None):
        """Mestre atualiza stats ocultos"""
        character = self.get_object()
        if not is_campaign_master(request.user, character.campaign):
            raise PermissionDenied('Apenas o mestre pode atualizar stats.')

        campaign_type = character.campaign.campaign_type
        if request.data.get('stand_unlocked') and campaign_type != 'jojo':
            raise ValidationError('Stand só pode ser liberado em campanha JoJo.')
        if int(request.data.get('extra_stand_slots') or 0) > 0 and campaign_type != 'jojo':
            raise ValidationError('Slots de Stand só existem em campanha JoJo.')
        if request.data.get('cursed_energy_unlocked') or int(request.data.get('cursed_energy') or 0) > 0:
            if campaign_type != 'jjk':
                raise ValidationError('Energia amaldiçoada só existe em campanha JJK.')
        if int(request.data.get('extra_cursed_technique_slots') or 0) > 0 and campaign_type != 'jjk':
            raise ValidationError('Slots de Técnica Amaldiçoada só existem em campanha JJK.')
        if (
            request.data.get('zanpakuto_unlocked')
            or request.data.get('shikai_unlocked')
            or request.data.get('bankai_unlocked')
        ):
            if campaign_type != 'bleach':
                raise ValidationError('Zanpakutou só existe em campanha Bleach.')
        if int(request.data.get('extra_zanpakuto_slots') or 0) > 0 and campaign_type != 'bleach':
            raise ValidationError('Slots de Zanpakutou só existem em campanha Bleach.')

        if request.data.get('bankai_unlocked') and not (request.data.get('shikai_unlocked') or character.shikai_unlocked):
            raise ValidationError('Liberar Bankai requer Shikai liberado.')
        if request.data.get('shikai_unlocked') and not (request.data.get('zanpakuto_unlocked') or character.zanpakuto_unlocked):
            raise ValidationError('Liberar Shikai requer Zanpakutou liberada.')

        serializer = CharacterStatsUpdateSerializer(character, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        prev = {
            'stand_unlocked': character.stand_unlocked,
            'cursed_energy_unlocked': character.cursed_energy_unlocked,
            'zanpakuto_unlocked': character.zanpakuto_unlocked,
            'shikai_unlocked': character.shikai_unlocked,
            'bankai_unlocked': character.bankai_unlocked,
        }
        serializer.save()

        # Notificações de desbloqueio
        if not prev['stand_unlocked'] and character.stand_unlocked:
            Notification.objects.create(
                campaign=character.campaign,
                recipient=character.owner,
                notification_type='system',
                title='Stand Liberado',
                message='Seu Stand foi liberado. Você já pode criá-lo.',
                related_character=character,
            )
        if not prev['cursed_energy_unlocked'] and character.cursed_energy_unlocked:
            Notification.objects.create(
                campaign=character.campaign,
                recipient=character.owner,
                notification_type='system',
                title='Tecnica Inata Liberada',
                message='Sua tecnica inata foi liberada.',
                related_character=character,
            )
        if not prev['zanpakuto_unlocked'] and character.zanpakuto_unlocked:
            Notification.objects.create(
                campaign=character.campaign,
                recipient=character.owner,
                notification_type='system',
                title='Zanpakutou Liberada',
                message='Sua Zanpakutou foi liberada.',
                related_character=character,
            )
        if not prev['shikai_unlocked'] and character.shikai_unlocked:
            Notification.objects.create(
                campaign=character.campaign,
                recipient=character.owner,
                notification_type='system',
                title='Shikai Liberada',
                message='Sua Shikai foi liberada.',
                related_character=character,
            )
        if not prev['bankai_unlocked'] and character.bankai_unlocked:
            Notification.objects.create(
                campaign=character.campaign,
                recipient=character.owner,
                notification_type='system',
                title='Bankai Liberada',
                message='Sua Bankai foi liberada.',
                related_character=character,
            )
        return Response(CharacterMasterSerializer(character).data)

    @action(detail=True, methods=['post'])
    def add_fate_point(self, request, pk=None):
        """Mestre adiciona fate point"""
        character = self.get_object()
        if not is_campaign_master(request.user, character.campaign):
            raise PermissionDenied('Apenas o mestre pode adicionar fate points.')
        
        amount = request.data.get('amount', 1)
        character.fate_points += amount
        character.save()
        return Response({'fate_points': character.fate_points})

    @action(detail=True, methods=['post'])
    def use_fate_point(self, request, pk=None):
        """Jogador usa fate point"""
        character = self.get_object()
        if character.owner_id != request.user.id and not is_campaign_master(request.user, character.campaign):
            raise PermissionDenied('Este não é seu personagem.')
        
        if character.fate_points <= 0:
            raise ValidationError('Sem fate points disponíveis.')
        
        character.fate_points -= 1
        character.save()
        
        # Notifica o mestre
        Notification.objects.create(
            campaign=character.campaign,
            recipient=character.campaign.owner,
            notification_type='fate',
            title='Fate Point Usado!',
            message=f'{character.name} usou um Fate Point para Mudar o Destino!',
            related_character=character,
        )
        
        return Response({'fate_points': character.fate_points})

    @action(detail=True, methods=['post'])
    def set_release(self, request, pk=None):
        """Jogador ativa/desativa Shikai/Bankai"""
        character = self.get_object()
        ensure_not_banned(request.user, character.campaign)

        if character.owner_id != request.user.id and not is_campaign_master(request.user, character.campaign):
            raise PermissionDenied('Este não é seu personagem.')

        if character.campaign.campaign_type != 'bleach':
            raise ValidationError('Esta ação só é válida em campanhas Bleach.')

        shikai_active = request.data.get('shikai_active', character.shikai_active)
        bankai_active = request.data.get('bankai_active', character.bankai_active)

        shikai_active = bool(shikai_active)
        bankai_active = bool(bankai_active)

        if shikai_active and not character.shikai_unlocked:
            raise ValidationError('Shikai ainda não foi liberada.')
        if bankai_active and not character.bankai_unlocked:
            raise ValidationError('Bankai ainda não foi liberada.')
        if bankai_active and not character.shikai_unlocked:
            raise ValidationError('Bankai requer Shikai liberada.')

        if bankai_active:
            shikai_active = True

        character.shikai_active = shikai_active
        character.bankai_active = bankai_active
        character.save()

        serializer = CharacterMasterSerializer(character) if is_campaign_master(request.user, character.campaign) else CharacterPublicSerializer(character)
        return Response(serializer.data)


# ============== CHARACTER NOTES ==============

class CharacterNoteViewSet(viewsets.ModelViewSet):
    serializer_class = CharacterNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        character_id = self.request.query_params.get('character')
        qs = CharacterNote.objects.select_related('character', 'author', 'character__campaign')
        if character_id:
            character = Character.objects.select_related('campaign').filter(id=character_id).first()
            if not character:
                return qs.none()
            ensure_not_banned(user, character.campaign)
            if is_campaign_master(user, character.campaign):
                return qs.filter(character_id=character_id).order_by('-created_at')
            return qs.filter(
                character_id=character_id,
                character__owner=user,
                is_master_note=False,
            ).order_by('-created_at')
        if is_game_master(user):
            return qs.order_by('-created_at')
        return qs.filter(character__owner=user, is_master_note=False).order_by('-created_at')

    def perform_create(self, serializer):
        character = serializer.validated_data['character']
        ensure_not_banned(self.request.user, character.campaign)
        if character.owner_id != self.request.user.id and not is_game_master(self.request.user):
            raise PermissionDenied('Este não é seu personagem.')
        is_master_note = bool(is_game_master(self.request.user))
        serializer.save(author=self.request.user, is_master_note=is_master_note)


# ============== ITEMS ==============

class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        campaign_id = self.request.query_params.get('campaign')
        character_id = self.request.query_params.get('character')
        
        qs = Item.objects.select_related('owner_character', 'owner_character__campaign')
        
        if character_id:
            character = Character.objects.select_related('campaign').filter(id=character_id).first()
            if not character:
                return qs.none()
            ensure_not_banned(user, character.campaign)
            qs = qs.filter(owner_character_id=character_id)
        elif campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return qs.none()
            ensure_not_banned(user, campaign)
            qs = qs.filter(owner_character__campaign_id=campaign_id)
        
        if is_game_master(user):
            return qs.order_by('-id')
        
        return qs.filter(owner_character__owner=user).order_by('-id')

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas o mestre pode criar itens.')
        serializer.save()

    def perform_update(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas o mestre pode atualizar itens.')
        serializer.save()

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        """Transfere item para outro personagem"""
        item = self.get_object()
        ensure_not_banned(request.user, item.owner_character.campaign)
        transfer_serializer = ItemTransferSerializer(data=request.data)
        transfer_serializer.is_valid(raise_exception=True)
        
        to_character_id = transfer_serializer.validated_data['to_character_id']
        quantity = transfer_serializer.validated_data['quantity']
        
        # Verificar se pode transferir
        if item.owner_character.owner_id != request.user.id and not is_campaign_master(request.user, item.owner_character.campaign):
            raise PermissionDenied('Este item não é seu.')
        
        to_character = Character.objects.get(id=to_character_id)
        ensure_not_banned(request.user, to_character.campaign)
        
        # Verificar mesma campanha
        if to_character.campaign_id != item.owner_character.campaign_id:
            raise ValidationError('Só pode transferir para personagens da mesma campanha.')
        
        # Verificar quantidade
        if quantity > item.quantity:
            raise ValidationError('Quantidade insuficiente.')
        
        from_character = item.owner_character
        
        with transaction.atomic():
            # Registrar a troca
            ItemTrade.objects.create(
                item=item,
                from_character=from_character,
                to_character=to_character,
                quantity=quantity,
            )
            
            # Transferir o item
            if quantity == item.quantity:
                item.owner_character = to_character
                item.is_equipped = False
                item.save()
            else:
                # Criar novo item para o destinatário
                item.quantity -= quantity
                item.save()
                Item.objects.create(
                    name=item.name,
                    description=item.description,
                    item_type=item.item_type,
                    durability=item.durability,
                    quantity=quantity,
                    image=item.image,
                    rarity=item.rarity,
                    tags=item.tags,
                    bonus_status=item.bonus_status,
                    bonus_value=item.bonus_value,
                    owner_character=to_character,
                )
            
            # Notificar o mestre
            Notification.objects.create(
                campaign=from_character.campaign,
                recipient=from_character.campaign.owner,
                notification_type='trade',
                title='Troca de Item',
                message=f'{from_character.name} transferiu {quantity}x {item.name} para {to_character.name}',
                related_item=item,
            )
        
        return Response({'status': 'Item transferido com sucesso.'})

    @action(detail=True, methods=['post'])
    def equip(self, request, pk=None):
        """Equipa ou desequipa um item"""
        item = self.get_object()
        ensure_not_banned(request.user, item.owner_character.campaign)
        
        if item.owner_character.owner_id != request.user.id and not is_game_master(request.user):
            raise PermissionDenied('Este item não é seu.')

        if not item.is_equipped:
            if item.item_type in ('quest', 'misc'):
                raise ValidationError('Este item não pode ser equipado.')

            limits = {
                'armor': 4,
                'weapon': 1,
                'consumable': 1,
                'accessory': 1,
            }
            limit = limits.get(item.item_type)
            if limit is None:
                raise ValidationError('Tipo de item inválido para equipar.')

            equipped_count = Item.objects.filter(
                owner_character=item.owner_character,
                item_type=item.item_type,
                is_equipped=True,
            ).count()
            if equipped_count >= limit:
                raise ValidationError('Limite de itens equipados deste tipo atingido.')
        
        item.is_equipped = not item.is_equipped
        item.save()
        
        return Response(ItemSerializer(item).data)

    @action(detail=True, methods=['post'])
    def use(self, request, pk=None):
        """Usa um item consumível"""
        item = self.get_object()
        ensure_not_banned(request.user, item.owner_character.campaign)
        
        if item.owner_character.owner_id != request.user.id and not is_game_master(request.user):
            raise PermissionDenied('Este item não é seu.')
        
        if item.item_type != 'consumable':
            raise ValidationError('Este item não é consumível.')
        
        if item.quantity <= 0:
            raise ValidationError('Não há mais deste item.')
        
        item.quantity -= 1
        if item.quantity == 0:
            item.delete()
            return Response({'status': 'Item consumido e removido.'})
        
        item.save()
        return Response(ItemSerializer(item).data)


# ============== DICE ROLL ==============

class DiceRollViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        character_id = self.request.query_params.get('character')
        
        qs = DiceRoll.objects.select_related('character', 'campaign', 'skill_used')
        
        if character_id:
            character = Character.objects.select_related('campaign').filter(id=character_id).first()
            if not character:
                return qs.none()
            ensure_not_banned(self.request.user, character.campaign)
            qs = qs.filter(character_id=character_id)
        elif campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return qs.none()
            ensure_not_banned(self.request.user, campaign)
            qs = qs.filter(campaign_id=campaign_id)
        
        return qs.order_by('-created_at')[:50]

    def get_serializer_class(self):
        if is_game_master(self.request.user):
            return DiceRollMasterSerializer
        return DiceRollSerializer

    def create(self, request, *args, **kwargs):
        """Jogador rola os dados"""
        if not is_game_master(request.user):
            raise PermissionDenied('Apenas rolagens solicitadas pelo mestre.')

        create_serializer = DiceRollCreateSerializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        
        character_id = request.data.get('character_id')
        try:
            character = Character.objects.select_related('campaign').get(id=int(character_id))
        except (Character.DoesNotExist, ValueError, TypeError):
            raise ValidationError('Personagem não encontrado.')
        ensure_not_banned(request.user, character.campaign)
        
        if character.owner_id != request.user.id and not is_game_master(request.user):
            raise PermissionDenied('Este não é seu personagem.')
        
        use_fate_point = create_serializer.validated_data.get('use_fate_point', False)
        skill_id = create_serializer.validated_data.get('skill_id')
        roll = create_dice_roll(
            character=character,
            skill_id=skill_id,
            description=create_serializer.validated_data.get('description', ''),
            use_fate_point=use_fate_point,
        )
        
        # Notificar o mestre
        Notification.objects.create(
            campaign=character.campaign,
            recipient=character.campaign.owner,
            notification_type='roll',
            title='Nova Rolagem',
            message=f'{character.name} rolou: {roll.final_total} (Total oculto: {roll.hidden_total})',
            related_character=character,
            related_roll=roll,
        )
        
        serializer = DiceRollMasterSerializer(roll)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_seen(self, request, pk=None):
        """Mestre marca rolagem como vista"""
        roll = self.get_object()
        if not is_campaign_master(request.user, roll.campaign):
            raise PermissionDenied('Apenas o mestre pode marcar como visto.')
        
        roll.seen_by_master = True
        roll.save()
        return Response({'status': 'Marcado como visto.'})


# ============== NOTIFICATIONS ==============

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        qs = Notification.objects.filter(recipient=self.request.user)
        
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return qs.none()
            ensure_not_banned(self.request.user, campaign)
            qs = qs.filter(campaign_id=campaign_id)
        
        return qs.order_by('-created_at')[:100]

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Retorna contagem de notificações não lidas"""
        campaign_id = request.query_params.get('campaign')
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return Response({'count': 0})
            ensure_not_banned(request.user, campaign)
            qs = qs.filter(campaign_id=campaign_id)
        
        return Response({'count': qs.count()})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marca notificação como lida"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'Marcada como lida.'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marca todas como lidas"""
        campaign_id = request.data.get('campaign_id')
        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return Response({'status': 'Todas marcadas como lidas.'})
            ensure_not_banned(request.user, campaign)
            qs = qs.filter(campaign_id=campaign_id)
        
        qs.update(is_read=True)
        return Response({'status': 'Todas marcadas como lidas.'})


# ============== MESSAGES ==============

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        campaign_id = self.request.query_params.get('campaign')
        qs = Message.objects.select_related('campaign', 'sender', 'recipient')

        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return qs.none()
            ensure_not_banned(user, campaign)
            if is_campaign_master(user, campaign):
                return qs.filter(campaign_id=campaign_id)
            has_character = Character.objects.filter(
                campaign=campaign,
                owner=user,
                is_npc=False,
            ).exists()
            if not has_character:
                return qs.none()
            return qs.filter(
                campaign_id=campaign_id
            ).filter(models.Q(sender=user) | models.Q(recipient=user))

        if is_game_master(user):
            return qs
        return qs.filter(models.Q(sender=user) | models.Q(recipient=user))

    def perform_create(self, serializer):
        user = self.request.user
        campaign = serializer.validated_data.get('campaign')
        recipient = serializer.validated_data.get('recipient')
        content = (serializer.validated_data.get('content') or '').strip()

        if not campaign:
            raise ValidationError('Campanha inválida.')

        ensure_not_banned(user, campaign)

        if not content:
            raise ValidationError('Mensagem não pode ser vazia.')

        if recipient.id == user.id:
            raise ValidationError('Não é possível enviar mensagem para si mesmo.')

        if is_campaign_master(user, campaign):
            has_player = Character.objects.filter(
                campaign=campaign,
                owner=recipient,
                is_npc=False,
            ).exists()
            if not has_player:
                raise ValidationError('Destinatário não pertence à campanha.')
        else:
            has_character = Character.objects.filter(
                campaign=campaign,
                owner=user,
                is_npc=False,
            ).exists()
            if not has_character:
                raise PermissionDenied('Você não participa desta campanha.')
            if recipient.id != campaign.owner_id:
                raise PermissionDenied('Jogadores só podem enviar mensagens ao mestre.')

        serializer.save(sender=user)

        preview = content[:120]
        Notification.objects.create(
            campaign=campaign,
            recipient=recipient,
            notification_type='message',
            title='Mensagem Secreta',
            message=f'Nova mensagem de {user.username}: {preview}',
        )

# ============== SKILLS, ABILITIES, ETC ==============

class SkillViewSet(viewsets.ModelViewSet):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return Skill.objects.none()
            ensure_not_banned(self.request.user, campaign)
            return Skill.objects.filter(campaign_id=campaign_id)
        return Skill.objects.all()

    def get_serializer_class(self):
        if is_game_master(self.request.user):
            return SkillSerializer
        return SkillPublicSerializer

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar skills.')
        serializer.save()


class AbilityViewSet(viewsets.ModelViewSet):
    serializer_class = AbilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return Ability.objects.none()
            ensure_not_banned(self.request.user, campaign)
            return Ability.objects.filter(campaign_id=campaign_id)
        return Ability.objects.all()

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar abilities.')
        serializer.save()


class AdvantageViewSet(viewsets.ModelViewSet):
    serializer_class = AdvantageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return Advantage.objects.none()
            ensure_not_banned(self.request.user, campaign)
            return Advantage.objects.filter(campaign_id=campaign_id)
        return Advantage.objects.all()

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar vantagens.')
        serializer.save()


class PersonalityTraitViewSet(viewsets.ModelViewSet):
    serializer_class = PersonalityTraitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return PersonalityTrait.objects.none()
            ensure_not_banned(self.request.user, campaign)
            return PersonalityTrait.objects.filter(
                models.Q(campaign_id=campaign_id) | models.Q(campaign__isnull=True)
            )
        return PersonalityTrait.objects.all()

    def get_serializer_class(self):
        if is_game_master(self.request.user):
            return PersonalityTraitSerializer
        return PersonalityTraitPublicSerializer

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar traços.')
        serializer.save()


# ============== SPECIAL POWERS ==============

class SkillIdeaViewSet(viewsets.ModelViewSet):
    serializer_class = SkillIdeaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        qs = SkillIdea.objects.select_related(
            'campaign', 'character', 'submitted_by', 'reviewed_by'
        )

        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return qs.none()
            ensure_not_banned(self.request.user, campaign)
            qs = qs.filter(campaign_id=campaign_id)
            if is_campaign_master(self.request.user, campaign):
                return qs
            return qs.filter(submitted_by=self.request.user)

        if is_game_master(self.request.user):
            return qs
        return qs.filter(submitted_by=self.request.user)

    def perform_create(self, serializer):
        character = serializer.validated_data['character']
        campaign = serializer.validated_data.get('campaign') or character.campaign
        ensure_not_banned(self.request.user, campaign)

        if campaign.id != character.campaign_id:
            raise ValidationError('Personagem nao pertence a campanha.')
        if not (character.owner_id == self.request.user.id or is_campaign_master(self.request.user, campaign)):
            raise PermissionDenied('Este nao e seu personagem.')

        idea = serializer.save(
            campaign=campaign,
            submitted_by=self.request.user,
            status='pending',
        )

        if campaign.owner_id != self.request.user.id:
            Notification.objects.create(
                campaign=campaign,
                recipient=campaign.owner,
                notification_type='system',
                title='Nova Ideia de Skill',
                message=f'{character.name} enviou uma ideia de skill: {idea.name}',
                related_character=character,
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        idea = self.get_object()
        ensure_not_banned(request.user, idea.campaign)
        if not is_campaign_master(request.user, idea.campaign):
            raise PermissionDenied('Apenas o mestre pode aprovar ideias.')
        if idea.status != 'pending':
            raise ValidationError('Esta ideia ja foi analisada.')

        mastery_raw = request.data.get('mastery')
        if mastery_raw is None:
            raise ValidationError('Informe a maestria.')
        try:
            mastery = int(mastery_raw)
        except (TypeError, ValueError):
            mastery = 0

        if mastery < 0:
            mastery = 0

        skill = Skill.objects.create(
            name=idea.name,
            description=idea.description,
            use_status='',
            bonus=mastery,
            campaign=idea.campaign,
        )
        idea.character.skills.add(skill)

        idea.status = 'approved'
        idea.mastery = mastery
        idea.reviewed_by = request.user
        idea.reviewed_at = timezone.now()
        idea.response_message = f'Ideia aprovada! Maestria: {mastery}.'
        idea.save()

        Notification.objects.create(
            campaign=idea.campaign,
            recipient=idea.character.owner,
            notification_type='system',
            title='Skill Aprovada',
            message=idea.response_message,
            related_character=idea.character,
        )

        return Response(SkillIdeaSerializer(idea).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        idea = self.get_object()
        ensure_not_banned(request.user, idea.campaign)
        if not is_campaign_master(request.user, idea.campaign):
            raise PermissionDenied('Apenas o mestre pode recusar ideias.')
        if idea.status != 'pending':
            raise ValidationError('Esta ideia ja foi analisada.')

        reason = request.data.get('reason', '').strip()
        response_message = reason or 'Ideia rejeitada.'

        idea.status = 'rejected'
        idea.reviewed_by = request.user
        idea.reviewed_at = timezone.now()
        idea.response_message = response_message
        idea.save()

        Notification.objects.create(
            campaign=idea.campaign,
            recipient=idea.character.owner,
            notification_type='system',
            title='Skill Rejeitada',
            message=response_message,
            related_character=idea.character,
        )

        return Response(SkillIdeaSerializer(idea).data)


class PowerIdeaViewSet(viewsets.ModelViewSet):
    serializer_class = PowerIdeaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        qs = PowerIdea.objects.select_related(
            'campaign', 'character', 'submitted_by', 'reviewed_by'
        )

        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return qs.none()
            ensure_not_banned(self.request.user, campaign)
            qs = qs.filter(campaign_id=campaign_id)
            if is_campaign_master(self.request.user, campaign):
                return qs
            return qs.filter(submitted_by=self.request.user)

        if is_game_master(self.request.user):
            return qs
        return qs.filter(submitted_by=self.request.user)

    def perform_create(self, serializer):
        character = serializer.validated_data['character']
        campaign = serializer.validated_data.get('campaign') or character.campaign
        ensure_not_banned(self.request.user, campaign)

        if campaign.id != character.campaign_id:
            raise ValidationError('Personagem não pertence à campanha.')

        if not (character.owner_id == self.request.user.id or is_campaign_master(self.request.user, campaign)):
            raise PermissionDenied('Este não é seu personagem.')

        idea_type = serializer.validated_data['idea_type']
        if campaign.campaign_type == 'jojo' and idea_type != 'stand':
            raise ValidationError('Esta campanha só aceita ideias de Stand.')
        if campaign.campaign_type == 'bleach' and idea_type != 'zanpakuto':
            raise ValidationError('Esta campanha só aceita ideias de Zanpakutou.')
        if campaign.campaign_type == 'jjk' and idea_type != 'cursed':
            raise ValidationError('Esta campanha só aceita ideias de Técnica Amaldiçoada.')
        if campaign.campaign_type == 'generic':
            raise ValidationError('Campanhas genéricas não usam este fluxo.')

        existing, max_slots, label = get_power_slot_info(character, idea_type)
        pending = PowerIdea.objects.filter(
            character=character,
            idea_type=idea_type,
            status='pending',
        ).count()
        if existing + pending >= max_slots:
            raise ValidationError(
                f'Limite de {label} atingido. Peça ao mestre para liberar outro.'
            )

        idea = serializer.save(
            campaign=campaign,
            submitted_by=self.request.user,
            status='pending',
        )

        # Notificar o mestre
        if campaign.owner_id != self.request.user.id:
            Notification.objects.create(
                campaign=campaign,
                recipient=campaign.owner,
                notification_type='system',
                title='Nova Ideia de Poder',
                message=f'{character.name} enviou uma ideia de {idea.get_idea_type_display()}: {idea.name}',
                related_character=character,
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        idea = self.get_object()
        ensure_not_banned(request.user, idea.campaign)
        if not is_campaign_master(request.user, idea.campaign):
            raise PermissionDenied('Apenas o mestre pode aprovar ideias.')
        if idea.status != 'pending':
            raise ValidationError('Esta ideia já foi analisada.')

        character = idea.character
        if idea.idea_type == 'stand':
            existing, max_slots, _ = get_power_slot_info(character, 'stand')
            if existing >= max_slots:
                raise ValidationError('Limite de Stand atingido.')

            required_fields = [
                'destructive_power', 'speed', 'range_stat',
                'stamina', 'precision', 'development_potential',
            ]
            missing = [f for f in required_fields if not request.data.get(f)]
            if missing:
                raise ValidationError('Informe todos os status do Stand.')

            allowed = {'F', 'E', 'D', 'C', 'B', 'A', 'S'}
            for field in required_fields:
                val = str(request.data.get(field)).upper()
                if val not in allowed:
                    raise ValidationError('Status do Stand inválido.')

            stand = Stand.objects.create(
                name=idea.name,
                description=idea.description,
                stand_type=idea.stand_type,
                notes=idea.notes,
                destructive_power=str(request.data.get('destructive_power')).upper(),
                speed=str(request.data.get('speed')).upper(),
                range_stat=str(request.data.get('range_stat')).upper(),
                stamina=str(request.data.get('stamina')).upper(),
                precision=str(request.data.get('precision')).upper(),
                development_potential=str(request.data.get('development_potential')).upper(),
                owner_character=character,
            )
            response_message = (
                'Ideia aprovada! Status do Stand: '
                f'Poder {stand.destructive_power}, Velocidade {stand.speed}, '
                f'Alcance {stand.range_stat}, Persistência {stand.stamina}, '
                f'Precisão {stand.precision}, Potencial {stand.development_potential}.'
            )
        elif idea.idea_type == 'zanpakuto':
            existing, max_slots, _ = get_power_slot_info(character, 'zanpakuto')
            if existing >= max_slots:
                raise ValidationError('Limite de Zanpakutou atingido.')

            shikai_name = request.data.get('shikai_command') or '????????'
            bankai_name = request.data.get('bankai_name') or '????????'

            Zanpakuto.objects.create(
                name=idea.name,
                sealed_form=idea.description,
                spirit_name='',
                shikai_command=shikai_name,
                shikai_description='',
                bankai_name=bankai_name,
                bankai_description='',
                notes=idea.notes,
                owner_character=character,
            )
            response_message = (
                f'Ideia aprovada! Zanpakutou: {idea.name} | '
                f'Shikai: {shikai_name} | Bankai: {bankai_name}'
            )
        else:
            existing, max_slots, _ = get_power_slot_info(character, 'cursed')
            if existing >= max_slots:
                raise ValidationError('Limite de Técnica Amaldiçoada atingido.')
            technique_type = request.data.get('technique_type') or idea.technique_type
            if not technique_type:
                raise ValidationError('Informe o tipo de técnica.')

            CursedTechnique.objects.create(
                name=idea.name,
                description=idea.description,
                technique_type=technique_type,
                owner_character=character,
            )
            response_message = f'Ideia aprovada! Técnica: {technique_type}.'

        idea.status = 'approved'
        idea.reviewed_by = request.user
        idea.reviewed_at = timezone.now()
        idea.response_message = response_message
        idea.save()

        Notification.objects.create(
            campaign=idea.campaign,
            recipient=character.owner,
            notification_type='system',
            title='Ideia Aprovada',
            message=response_message,
            related_character=character,
        )

        return Response(PowerIdeaSerializer(idea).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        idea = self.get_object()
        ensure_not_banned(request.user, idea.campaign)
        if not is_campaign_master(request.user, idea.campaign):
            raise PermissionDenied('Apenas o mestre pode recusar ideias.')
        if idea.status != 'pending':
            raise ValidationError('Esta ideia já foi analisada.')

        reason = request.data.get('reason', '').strip()
        response_message = reason or 'Ideia rejeitada.'

        idea.status = 'rejected'
        idea.reviewed_by = request.user
        idea.reviewed_at = timezone.now()
        idea.response_message = response_message
        idea.save()

        Notification.objects.create(
            campaign=idea.campaign,
            recipient=idea.character.owner,
            notification_type='system',
            title='Ideia Rejeitada',
            message=response_message,
            related_character=idea.character,
        )

        return Response(PowerIdeaSerializer(idea).data)


class StandViewSet(viewsets.ModelViewSet):
    serializer_class = StandSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        character_id = self.request.query_params.get('character')
        user = self.request.user
        if character_id:
            character = Character.objects.select_related('campaign').filter(id=character_id).first()
            if not character:
                return Stand.objects.none()
            ensure_not_banned(self.request.user, character.campaign)
            return Stand.objects.filter(owner_character_id=character_id)
        qs = Stand.objects.all()
        if not is_game_master(user):
            return qs.filter(owner_character__owner=user)
        return qs

    def perform_create(self, serializer):
        character = serializer.validated_data['owner_character']
        ensure_not_banned(self.request.user, character.campaign)

        if character.campaign.campaign_type != 'jojo':
            raise ValidationError('Stands só podem ser criados em campanhas JoJo.')

        existing, max_slots, _ = get_power_slot_info(character, 'stand')
        if existing >= max_slots:
            raise ValidationError('Este personagem já possui o limite de Stands.')

        if not character.stand_unlocked:
            raise PermissionDenied('Seu Stand ainda não foi liberado.')

        if not is_campaign_master(self.request.user, character.campaign):
            raise PermissionDenied('Apenas o mestre pode criar Stands após aprovação.')
        serializer.save()

    def perform_update(self, serializer):
        stand = self.get_object()
        ensure_not_banned(self.request.user, stand.owner_character.campaign)
        if is_game_master(self.request.user):
            serializer.save()
            return
        if stand.owner_character.owner_id != self.request.user.id:
            raise PermissionDenied('Este não é seu Stand.')
        if not stand.owner_character.stand_unlocked:
            raise PermissionDenied('Seu Stand ainda não foi liberado.')
        serializer.save()


class CursedTechniqueViewSet(viewsets.ModelViewSet):
    serializer_class = CursedTechniqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        character_id = self.request.query_params.get('character')
        if character_id:
            character = Character.objects.select_related('campaign').filter(id=character_id).first()
            if not character:
                return CursedTechnique.objects.none()
            ensure_not_banned(self.request.user, character.campaign)
            return CursedTechnique.objects.filter(owner_character_id=character_id)
        return CursedTechnique.objects.all()

    def get_serializer_class(self):
        if is_game_master(self.request.user):
            return CursedTechniqueSerializer
        return CursedTechniquePublicSerializer

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar Técnicas.')
        character = serializer.validated_data['owner_character']
        existing, max_slots, _ = get_power_slot_info(character, 'cursed')
        if existing >= max_slots:
            raise ValidationError('Este personagem já possui o limite de Técnicas.')
        serializer.save()


class ZanpakutoViewSet(viewsets.ModelViewSet):
    serializer_class = ZanpakutoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        character_id = self.request.query_params.get('character')
        if character_id:
            character = Character.objects.select_related('campaign').filter(id=character_id).first()
            if not character:
                return Zanpakuto.objects.none()
            ensure_not_banned(self.request.user, character.campaign)
            return Zanpakuto.objects.filter(owner_character_id=character_id)
        return Zanpakuto.objects.all()

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar Zanpakutou.')
        character = serializer.validated_data['owner_character']
        existing, max_slots, _ = get_power_slot_info(character, 'zanpakuto')
        if existing >= max_slots:
            raise ValidationError('Este personagem já possui o limite de Zanpakutou.')
        serializer.save()


# ============== SESSIONS ==============

class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            try:
                campaign = Campaign.objects.get(id=campaign_id)
            except Campaign.DoesNotExist:
                return Session.objects.none()
            ensure_not_banned(self.request.user, campaign)
            return Session.objects.filter(campaign_id=campaign_id).order_by('-date')
        return Session.objects.all().order_by('-date')

    def perform_create(self, serializer):
        campaign = Campaign.objects.get(id=self.request.data.get('campaign'))
        if not is_campaign_master(self.request.user, campaign):
            raise PermissionDenied('Apenas o mestre pode criar sessões.')
        serializer.save()

    @action(detail=True, methods=['post'])
    def save_map(self, request, pk=None):
        """Salva o mapa atual da campanha nesta sessão"""
        session = self.get_object()
        if not is_campaign_master(request.user, session.campaign):
            raise PermissionDenied('Apenas o mestre pode salvar o mapa da sessão.')
        campaign = session.campaign
        session.map_data = campaign.map_data or {}
        session.map_image = campaign.map_image
        session.save()
        return Response(SessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def load_map(self, request, pk=None):
        """Carrega o mapa salvo da sessão para a campanha"""
        session = self.get_object()
        if not is_campaign_master(request.user, session.campaign):
            raise PermissionDenied('Apenas o mestre pode carregar o mapa da sessão.')
        campaign = session.campaign
        campaign.map_data = session.map_data or {}
        campaign.map_image = session.map_image
        campaign.save()
        return Response({
            'map_image': campaign.map_image.url if campaign.map_image else None,
            'map_data': campaign.map_data or {},
            'map_updated_at': campaign.map_updated_at,
        })


# ============== POLLING ENDPOINT ==============

class CampaignPollView(APIView):
    """Endpoint para polling a cada 3 segundos"""
    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id):
        try:
            campaign = Campaign.objects.get(id=campaign_id)
        except Campaign.DoesNotExist:
            return Response({'detail': 'Campanha não encontrada.'}, status=404)

        ensure_not_banned(request.user, campaign)
        
        since = request.query_params.get('since')  # timestamp ISO
        
        data = {
            'projection': {
                'image': campaign.projection_image.url if campaign.projection_image else None,
                'title': campaign.projection_title,
                'updated_at': campaign.projection_updated_at,
            },
            'map': {
                'image': campaign.map_image.url if campaign.map_image else None,
                'updated_at': campaign.map_updated_at,
            },
            'notifications': [],
            'recent_rolls': [],
            'roll_requests': [],
        }
        
        # Notificações do usuário
        notifications_qs = Notification.objects.filter(
            campaign=campaign,
            recipient=request.user,
            is_read=False,
        )
        if since:
            notifications_qs = notifications_qs.filter(created_at__gt=since)
        
        data['notifications'] = NotificationSerializer(
            notifications_qs.order_by('-created_at')[:10], many=True
        ).data
        
        # Rolagens recentes (para o mestre)
        if is_campaign_master(request.user, campaign):
            rolls_qs = DiceRoll.objects.filter(campaign=campaign)
            if since:
                rolls_qs = rolls_qs.filter(created_at__gt=since)
            
            data['recent_rolls'] = DiceRollMasterSerializer(
                rolls_qs.order_by('-created_at')[:10], many=True
            ).data
        else:
            requests_qs = RollRequest.objects.filter(
                campaign=campaign,
                is_open=True,
                character__owner=request.user,
            )
            data['roll_requests'] = RollRequestSerializer(
                requests_qs.order_by('-created_at')[:10], many=True
            ).data
        
        return Response(data)
