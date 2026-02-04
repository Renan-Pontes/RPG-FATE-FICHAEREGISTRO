import random
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Profile, Campaign, CampaignBan, Character, CharacterNote, Item,
    Skill, Ability, Advantage, PersonalityTrait,
    Stand, CursedTechnique, Zanpakuto,
    DiceRoll, Notification, ItemTrade, Session
)
from .serializers import (
    RegisterSerializer, UserSerializer,
    CampaignSerializer, CampaignListSerializer, ProjectionSerializer,
    CharacterPublicSerializer, CharacterMasterSerializer,
    CharacterCreateSerializer, CharacterStatsUpdateSerializer,
    CharacterNoteSerializer, ItemSerializer, ItemTransferSerializer,
    SkillSerializer, AbilitySerializer, AdvantageSerializer, PersonalityTraitSerializer,
    StandSerializer, CursedTechniqueSerializer, ZanpakutoSerializer,
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
        skill = Skill.objects.get(id=skill_id)
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
            'skills', 'abilities', 'advantages', 'personality_traits', 'items', 'notes'
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
        
        serializer = CharacterStatsUpdateSerializer(character, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
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
        if item.owner_character.owner_id != request.user.id and not is_game_master(request.user):
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
        create_serializer = DiceRollCreateSerializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        
        character_id = request.data.get('character_id')
        character = Character.objects.select_related('campaign').get(id=character_id)
        ensure_not_banned(request.user, character.campaign)
        
        if character.owner_id != request.user.id and not is_game_master(request.user):
            raise PermissionDenied('Este não é seu personagem.')
        
        # Rolar 4 dados FATE (-1, 0, +1)
        dice_results = [random.choice([-1, 0, 1]) for _ in range(4)]
        dice_total = sum(dice_results)
        
        use_fate_point = create_serializer.validated_data.get('use_fate_point', False)
        
        # Se usar Fate Point, todos viram +1
        if use_fate_point:
            if character.fate_points <= 0:
                raise ValidationError('Sem fate points disponíveis.')
            character.fate_points -= 1
            character.save()
            dice_results = [1, 1, 1, 1]
            final_total = 4
        else:
            final_total = dice_total
        
        # Calcular bônus oculto (apenas mestre vê)
        skill_id = create_serializer.validated_data.get('skill_id')
        skill = None
        hidden_bonus = 0
        
        if skill_id:
            skill = Skill.objects.get(id=skill_id)
            hidden_bonus += skill.bonus
            
            # Adicionar atributo base
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
        
        hidden_total = final_total + hidden_bonus
        
        # Criar registro da rolagem
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
            description=create_serializer.validated_data.get('description', ''),
            hidden_bonus=hidden_bonus,
            hidden_total=hidden_total,
        )
        
        # Notificar o mestre
        Notification.objects.create(
            campaign=character.campaign,
            recipient=character.campaign.owner,
            notification_type='roll',
            title='Nova Rolagem',
            message=f'{character.name} rolou: {final_total} (Total oculto: {hidden_total})',
            related_character=character,
            related_roll=roll,
        )
        
        # Retornar com serializer apropriado
        if is_game_master(request.user):
            serializer = DiceRollMasterSerializer(roll)
        else:
            serializer = DiceRollSerializer(roll)
        
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
            return PersonalityTrait.objects.filter(campaign_id=campaign_id)
        return PersonalityTrait.objects.all()


# ============== SPECIAL POWERS ==============

class StandViewSet(viewsets.ModelViewSet):
    serializer_class = StandSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        character_id = self.request.query_params.get('character')
        if character_id:
            character = Character.objects.select_related('campaign').filter(id=character_id).first()
            if not character:
                return Stand.objects.none()
            ensure_not_banned(self.request.user, character.campaign)
            return Stand.objects.filter(owner_character_id=character_id)
        return Stand.objects.all()

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar Stands.')
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

    def perform_create(self, serializer):
        if not is_game_master(self.request.user):
            raise PermissionDenied('Apenas mestres podem criar Técnicas.')
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
            'notifications': [],
            'recent_rolls': [],
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
        
        return Response(data)
