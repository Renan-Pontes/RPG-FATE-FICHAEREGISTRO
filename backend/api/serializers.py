from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Profile, Campaign, Character, CharacterNote, Item, RollRequest,
    Skill, Ability, Advantage, PersonalityTrait,
    Stand, CursedTechnique, Zanpakuto,
    DiceRoll, Notification, ItemTrade, Session
)


# ============== AUTH ==============

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )


class UserSerializer(serializers.ModelSerializer):
    is_game_master = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_game_master')

    def get_is_game_master(self, obj):
        try:
            return obj.profile.is_game_master
        except Profile.DoesNotExist:
            return False


# ============== CAMPAIGN ==============

class CampaignSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = (
            'id', 'name', 'description', 'campaign_type', 'created_at',
            'owner', 'owner_username', 'image', 'era_campaign', 'location_campaign',
            'projection_image', 'projection_title', 'projection_updated_at',
            'player_count',
        )
        read_only_fields = ('id', 'created_at', 'owner', 'owner_username', 'projection_updated_at')

    def get_player_count(self, obj):
        return obj.characters.filter(is_npc=False).count()


class CampaignListSerializer(serializers.ModelSerializer):
    """Versão simplificada para listagem"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = (
            'id', 'name', 'description', 'campaign_type', 'image',
            'owner', 'owner_username', 'player_count', 'created_at',
        )

    def get_player_count(self, obj):
        return obj.characters.filter(is_npc=False).count()


class ProjectionSerializer(serializers.ModelSerializer):
    """Para atualizar a projeção do mestre"""
    class Meta:
        model = Campaign
        fields = ('projection_image', 'projection_title', 'projection_updated_at')
        read_only_fields = ('projection_updated_at',)


# ============== SKILLS & ABILITIES ==============

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'name', 'description', 'use_status', 'bonus', 'campaign')
        read_only_fields = ('id',)


class AbilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Ability
        fields = ('id', 'name', 'description', 'use_status', 'damage_base', 'campaign')
        read_only_fields = ('id',)


class AdvantageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Advantage
        fields = ('id', 'name', 'description', 'status_type', 'campaign')
        read_only_fields = ('id',)


class PersonalityTraitSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalityTrait
        fields = ('id', 'name', 'description', 'use_status', 'bonus', 'campaign')
        read_only_fields = ('id',)


# ============== ITEMS ==============

class ItemSerializer(serializers.ModelSerializer):
    owner_character_name = serializers.CharField(source='owner_character.name', read_only=True)
    campaign_id = serializers.IntegerField(source='owner_character.campaign_id', read_only=True)

    class Meta:
        model = Item
        fields = (
            'id', 'name', 'description', 'item_type', 'durability',
            'is_equipped', 'quantity', 'bonus_status', 'bonus_value',
            'owner_character', 'owner_character_name', 'campaign_id',
        )
        read_only_fields = ('id', 'owner_character_name', 'campaign_id')


class ItemTransferSerializer(serializers.Serializer):
    """Para transferir item entre personagens"""
    to_character_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)


# ============== SPECIAL POWERS ==============

class StandSerializer(serializers.ModelSerializer):
    abilities = AbilitySerializer(many=True, read_only=True)
    ability_ids = serializers.PrimaryKeyRelatedField(
        queryset=Ability.objects.all(), many=True, write_only=True, source='abilities', required=False
    )

    class Meta:
        model = Stand
        fields = (
            'id', 'name', 'description', 'stand_type', 'stand_image',
            'destructive_power', 'speed', 'range_stat', 'stamina',
            'precision', 'development_potential', 'abilities', 'ability_ids',
            'notes', 'owner_character',
        )
        read_only_fields = ('id',)


class CursedTechniqueSerializer(serializers.ModelSerializer):
    abilities = AbilitySerializer(many=True, read_only=True)

    class Meta:
        model = CursedTechnique
        fields = (
            'id', 'name', 'description', 'technique_type', 'image',
            'cursed_energy_cost', 'damage_base', 'abilities', 'notes',
            'owner_character',
        )
        read_only_fields = ('id',)


class ZanpakutoSerializer(serializers.ModelSerializer):
    shikai_abilities = AbilitySerializer(many=True, read_only=True)
    bankai_abilities = AbilitySerializer(many=True, read_only=True)

    class Meta:
        model = Zanpakuto
        fields = (
            'id', 'name', 'sealed_form', 'spirit_name', 'image',
            'shikai_command', 'shikai_description', 'shikai_abilities',
            'bankai_name', 'bankai_description', 'bankai_abilities',
            'notes', 'owner_character',
        )
        read_only_fields = ('id',)


# ============== CHARACTER ==============

class CharacterNoteSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    class Meta:
        model = CharacterNote
        fields = (
            'id', 'content', 'created_at', 'updated_at', 'character',
            'author', 'author_username', 'is_master_note',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'author', 'author_username')


class CharacterPublicSerializer(serializers.ModelSerializer):
    """Versão para JOGADORES - sem stats ocultos"""
    skills = SkillSerializer(many=True, read_only=True)
    abilities = AbilitySerializer(many=True, read_only=True)
    advantages = AdvantageSerializer(many=True, read_only=True)
    personality_traits = PersonalityTraitSerializer(many=True, read_only=True)
    items = ItemSerializer(many=True, read_only=True)
    notes = CharacterNoteSerializer(many=True, read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    # Poderes especiais (dependendo do tipo de campanha)
    stand = StandSerializer(read_only=True)
    cursed_techniques = CursedTechniqueSerializer(many=True, read_only=True)
    zanpakuto = ZanpakutoSerializer(read_only=True)

    class Meta:
        model = Character
        fields = (
            'id', 'name', 'description', 'image', 'created_at',
            'fate_points', 'hierarchy', 'role', 'is_npc',
            'skills', 'abilities', 'advantages', 'personality_traits',
            'items', 'notes', 'stand', 'cursed_techniques', 'zanpakuto',
            'owner', 'owner_username', 'campaign',
        )
        read_only_fields = fields  # Jogador não edita direto


class CharacterMasterSerializer(serializers.ModelSerializer):
    """Versão para MESTRE - com stats ocultos"""
    skills = SkillSerializer(many=True, read_only=True)
    abilities = AbilitySerializer(many=True, read_only=True)
    advantages = AdvantageSerializer(many=True, read_only=True)
    personality_traits = PersonalityTraitSerializer(many=True, read_only=True)
    items = ItemSerializer(many=True, read_only=True)
    notes = CharacterNoteSerializer(many=True, read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    # Poderes especiais
    stand = StandSerializer(read_only=True)
    cursed_techniques = CursedTechniqueSerializer(many=True, read_only=True)
    zanpakuto = ZanpakutoSerializer(read_only=True)

    # IDs para escrita
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(), many=True, write_only=True, source='skills', required=False
    )
    ability_ids = serializers.PrimaryKeyRelatedField(
        queryset=Ability.objects.all(), many=True, write_only=True, source='abilities', required=False
    )

    class Meta:
        model = Character
        fields = (
            'id', 'name', 'description', 'image', 'created_at',
            'fate_points', 'hierarchy', 'role', 'status', 'is_npc',
            # Stats ocultos
            'forca', 'destreza', 'vigor', 'inteligencia', 'sabedoria', 'carisma',
            # Relações
            'skills', 'abilities', 'advantages', 'personality_traits',
            'skill_ids', 'ability_ids',
            'items', 'notes', 'stand', 'cursed_techniques', 'zanpakuto',
            'owner', 'owner_username', 'campaign',
        )
        read_only_fields = ('id', 'created_at', 'owner_username')


class CharacterCreateSerializer(serializers.ModelSerializer):
    """Para jogador criar seu personagem"""
    class Meta:
        model = Character
        fields = ('id', 'name', 'description', 'image', 'campaign')
        read_only_fields = ('id',)


class CharacterStatsUpdateSerializer(serializers.ModelSerializer):
    """Para mestre atualizar stats ocultos"""
    class Meta:
        model = Character
        fields = (
            'forca', 'destreza', 'vigor', 'inteligencia', 'sabedoria', 'carisma',
            'fate_points', 'status',
        )


# ============== DICE ROLL ==============

class DiceRollSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    skill_name = serializers.CharField(source='skill_used.name', read_only=True)

    class Meta:
        model = DiceRoll
        fields = (
            'id', 'character', 'character_name', 'campaign',
            'dice_1', 'dice_2', 'dice_3', 'dice_4', 'dice_total',
            'used_fate_point', 'final_total',
            'skill_used', 'skill_name', 'description',
            'created_at', 'seen_by_master',
        )
        read_only_fields = ('id', 'created_at', 'character_name', 'skill_name')


class DiceRollMasterSerializer(DiceRollSerializer):
    """Versão para mestre - inclui bônus ocultos"""
    class Meta(DiceRollSerializer.Meta):
        fields = DiceRollSerializer.Meta.fields + ('hidden_bonus', 'hidden_total')


class DiceRollCreateSerializer(serializers.Serializer):
    """Para jogador criar uma rolagem"""
    skill_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(max_length=200, required=False, default='')
    use_fate_point = serializers.BooleanField(default=False)


class RollRequestSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    owner_id = serializers.IntegerField(source='character.owner_id', read_only=True)
    skill_name = serializers.CharField(source='skill.name', read_only=True)

    class Meta:
        model = RollRequest
        fields = (
            'id', 'campaign', 'character', 'character_name', 'owner_id',
            'skill', 'skill_name', 'description',
            'is_open', 'created_at',
        )
        read_only_fields = fields


# ============== NOTIFICATIONS ==============

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'campaign', 'notification_type', 'title', 'message',
            'is_read', 'created_at', 'related_character', 'related_item', 'related_roll',
        )
        read_only_fields = ('id', 'created_at')


# ============== ITEM TRADE ==============

class ItemTradeSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    from_character_name = serializers.CharField(source='from_character.name', read_only=True)
    to_character_name = serializers.CharField(source='to_character.name', read_only=True)

    class Meta:
        model = ItemTrade
        fields = (
            'id', 'item', 'item_name', 'from_character', 'from_character_name',
            'to_character', 'to_character_name', 'quantity', 'created_at',
        )
        read_only_fields = fields


# ============== SESSION ==============

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ('id', 'campaign', 'date', 'location', 'summary')
        read_only_fields = ('id',)
