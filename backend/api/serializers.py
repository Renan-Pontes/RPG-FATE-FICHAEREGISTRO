from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Profile, Campaign, Character, CharacterNote, Item, RollRequest,
    Skill, Ability, Advantage, PersonalityTrait,
    BleachSpell, CharacterBleachSpell, BleachSpellOffer,
    Stand, CursedTechnique, Zanpakuto, PowerIdea, SkillIdea,
    DiceRoll, Notification, ItemTrade, Session, Message
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


class CampaignMapSerializer(serializers.ModelSerializer):
    """Para atualizar o mapa da campanha"""
    class Meta:
        model = Campaign
        fields = ('map_image', 'map_data', 'map_updated_at')
        read_only_fields = ('map_updated_at',)


# ============== SKILLS & ABILITIES ==============

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'name', 'description', 'use_status', 'bonus', 'campaign')
        read_only_fields = ('id',)


class SkillPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'name', 'description', 'bonus', 'campaign')
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


class PersonalityTraitPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalityTrait
        fields = ('id', 'name', 'description', 'campaign')
        read_only_fields = ('id',)


# ============== BLEACH SPELLS ==============

class BleachSpellSerializer(serializers.ModelSerializer):
    class Meta:
        model = BleachSpell
        fields = ('id', 'name', 'number', 'spell_type', 'tier', 'pa_cost', 'effect', 'incantation')
        read_only_fields = ('id',)


class CharacterBleachSpellSerializer(serializers.ModelSerializer):
    spell = BleachSpellSerializer(read_only=True)

    class Meta:
        model = CharacterBleachSpell
        fields = ('id', 'spell', 'mastery', 'acquired_at')
        read_only_fields = fields


class BleachSpellOfferSerializer(serializers.ModelSerializer):
    options = BleachSpellSerializer(many=True, read_only=True)
    chosen_spell = BleachSpellSerializer(read_only=True)

    class Meta:
        model = BleachSpellOffer
        fields = ('id', 'tier', 'is_open', 'created_at', 'options', 'chosen_spell', 'chosen_at')
        read_only_fields = fields


# ============== SKILL IDEAS ==============

class SkillIdeaSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = SkillIdea
        fields = (
            'id', 'campaign', 'character', 'character_name',
            'submitted_by', 'submitted_by_username',
            'name', 'description', 'status',
            'response_message', 'mastery',
            'created_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_username',
        )
        read_only_fields = (
            'id', 'submitted_by', 'submitted_by_username', 'character_name',
            'status', 'response_message', 'mastery',
            'created_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_username',
        )

    def validate(self, attrs):
        campaign = attrs.get('campaign')
        character = attrs.get('character')
        if campaign and character and character.campaign_id != campaign.id:
            raise serializers.ValidationError('Personagem nao pertence a campanha.')
        return attrs


# ============== ITEMS ==============

class ItemSerializer(serializers.ModelSerializer):
    owner_character_name = serializers.CharField(source='owner_character.name', read_only=True)
    campaign_id = serializers.IntegerField(source='owner_character.campaign_id', read_only=True)

    class Meta:
        model = Item
        fields = (
            'id', 'name', 'description', 'item_type', 'durability',
            'is_equipped', 'quantity', 'image', 'rarity', 'tags', 'bonus_status', 'bonus_value',
            'owner_character', 'owner_character_name', 'campaign_id',
        )
        read_only_fields = ('id', 'owner_character_name', 'campaign_id')


class ItemTransferSerializer(serializers.Serializer):
    """Para transferir item entre personagens"""
    to_character_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)


# ============== MESSAGES ==============

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)

    class Meta:
        model = Message
        fields = (
            'id', 'campaign', 'sender', 'sender_username',
            'recipient', 'recipient_username', 'content', 'created_at',
        )
        read_only_fields = ('id', 'sender', 'sender_username', 'created_at')


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


class CursedTechniquePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CursedTechnique
        fields = ('id', 'name')
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


# ============== POWER IDEAS ==============

class PowerIdeaSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source='character.name', read_only=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = PowerIdea
        fields = (
            'id', 'campaign', 'character', 'character_name',
            'submitted_by', 'submitted_by_username',
            'idea_type', 'name', 'description', 'notes',
            'stand_type', 'technique_type',
            'status', 'response_message',
            'created_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_username',
        )
        read_only_fields = (
            'id', 'submitted_by', 'submitted_by_username', 'character_name',
            'status', 'response_message', 'created_at', 'reviewed_at',
            'reviewed_by', 'reviewed_by_username',
        )

    def validate(self, attrs):
        campaign = attrs.get('campaign')
        character = attrs.get('character')
        if campaign and character and character.campaign_id != campaign.id:
            raise serializers.ValidationError('Personagem não pertence à campanha.')
        return attrs


# ============== CHARACTER ==============

class CharacterNoteSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    class Meta:
        model = CharacterNote
        fields = (
            'id', 'content', 'created_at', 'updated_at', 'character',
            'author', 'author_username', 'is_master_note',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'author', 'author_username', 'is_master_note')


class CharacterPublicSerializer(serializers.ModelSerializer):
    """Versão para JOGADORES - sem stats ocultos"""
    skills = SkillPublicSerializer(many=True, read_only=True)
    abilities = AbilitySerializer(many=True, read_only=True)
    advantages = AdvantageSerializer(many=True, read_only=True)
    personality_traits = PersonalityTraitPublicSerializer(many=True, read_only=True)
    items = ItemSerializer(many=True, read_only=True)
    notes = CharacterNoteSerializer(many=True, read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    bleach_spells = CharacterBleachSpellSerializer(source='bleach_spell_links', many=True, read_only=True)
    bleach_spell_offers = serializers.SerializerMethodField()

    # Poderes especiais (dependendo do tipo de campanha)
    stands = StandSerializer(many=True, read_only=True)
    cursed_techniques = CursedTechniquePublicSerializer(many=True, read_only=True)
    zanpakutos = ZanpakutoSerializer(many=True, read_only=True)

    class Meta:
        model = Character
        fields = (
            'id', 'name', 'description', 'image', 'created_at',
            'fate_points', 'hierarchy', 'role', 'is_npc',
            'stand_unlocked', 'extra_stand_slots',
            'cursed_energy_unlocked', 'extra_cursed_technique_slots',
            'zanpakuto_unlocked', 'extra_zanpakuto_slots',
            'shikai_unlocked', 'bankai_unlocked',
            'shikai_active', 'bankai_active',
            'bleach_kidou_tier', 'bleach_spells', 'bleach_spell_offers',
            'skills', 'abilities', 'advantages', 'personality_traits',
            'items', 'notes', 'stands', 'cursed_techniques', 'zanpakutos',
            'owner', 'owner_username', 'campaign',
        )
        read_only_fields = fields  # Jogador não edita direto

    def get_bleach_spell_offers(self, obj):
        offers = obj.bleach_spell_offers.filter(is_open=True).prefetch_related('options')
        return BleachSpellOfferSerializer(offers, many=True).data


class CharacterMasterSerializer(serializers.ModelSerializer):
    """Versão para MESTRE - com stats ocultos"""
    skills = SkillSerializer(many=True, read_only=True)
    abilities = AbilitySerializer(many=True, read_only=True)
    advantages = AdvantageSerializer(many=True, read_only=True)
    personality_traits = PersonalityTraitSerializer(many=True, read_only=True)
    items = ItemSerializer(many=True, read_only=True)
    notes = CharacterNoteSerializer(many=True, read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    bleach_spells = CharacterBleachSpellSerializer(source='bleach_spell_links', many=True, read_only=True)
    bleach_spell_offers = BleachSpellOfferSerializer(many=True, read_only=True)

    # Poderes especiais
    stands = StandSerializer(many=True, read_only=True)
    cursed_techniques = CursedTechniqueSerializer(many=True, read_only=True)
    zanpakutos = ZanpakutoSerializer(many=True, read_only=True)

    # IDs para escrita
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(), many=True, write_only=True, source='skills', required=False
    )
    ability_ids = serializers.PrimaryKeyRelatedField(
        queryset=Ability.objects.all(), many=True, write_only=True, source='abilities', required=False
    )
    personality_trait_ids = serializers.PrimaryKeyRelatedField(
        queryset=PersonalityTrait.objects.all(), many=True, write_only=True, source='personality_traits', required=False
    )
    advantage_ids = serializers.PrimaryKeyRelatedField(
        queryset=Advantage.objects.all(), many=True, write_only=True, source='advantages', required=False
    )

    class Meta:
        model = Character
        fields = (
            'id', 'name', 'description', 'image', 'created_at',
            'fate_points', 'hierarchy', 'role', 'status', 'is_npc',
            'stand_unlocked', 'extra_stand_slots',
            'cursed_energy_unlocked', 'cursed_energy', 'extra_cursed_technique_slots',
            'zanpakuto_unlocked', 'extra_zanpakuto_slots',
            'shikai_unlocked', 'bankai_unlocked',
            'shikai_active', 'bankai_active',
            'bleach_kidou_tier', 'bleach_spells', 'bleach_spell_offers',
            # Stats ocultos
            'forca', 'destreza', 'vigor', 'inteligencia', 'sabedoria', 'carisma',
            # Relações
            'skills', 'abilities', 'advantages', 'personality_traits',
            'skill_ids', 'ability_ids', 'advantage_ids', 'personality_trait_ids',
            'items', 'notes', 'stands', 'cursed_techniques', 'zanpakutos',
            'owner', 'owner_username', 'campaign',
        )
        read_only_fields = ('id', 'created_at', 'owner_username', 'bleach_kidou_tier')

    def validate(self, attrs):
        traits = attrs.get('personality_traits')
        if traits is not None and len(traits) < 5:
            raise serializers.ValidationError('Cada personagem deve ter no minimo 5 tracos.')
        if traits is not None and len(traits) > 10:
            raise serializers.ValidationError('Cada personagem pode ter no maximo 10 tracos.')
        if traits is not None:
            campaign = attrs.get('campaign') or getattr(self.instance, 'campaign', None)
            if campaign:
                for trait in traits:
                    if trait.campaign_id and trait.campaign_id != campaign.id:
                        raise serializers.ValidationError('Traço não pertence a esta campanha.')
        return attrs


class CharacterCreateSerializer(serializers.ModelSerializer):
    """Para jogador criar seu personagem"""
    personality_trait_ids = serializers.PrimaryKeyRelatedField(
        queryset=PersonalityTrait.objects.all(), many=True, write_only=True, source='personality_traits', required=True
    )
    class Meta:
        model = Character
        fields = ('id', 'name', 'description', 'image', 'campaign', 'personality_trait_ids')
        read_only_fields = ('id',)

    def validate(self, attrs):
        traits = attrs.get('personality_traits')
        if traits is None or len(traits) == 0:
            raise serializers.ValidationError('Selecione pelo menos 5 tracos de personalidade.')
        if traits is not None and len(traits) < 5:
            raise serializers.ValidationError('Cada personagem deve ter no minimo 5 tracos.')
        if traits is not None and len(traits) > 10:
            raise serializers.ValidationError('Cada personagem pode ter no maximo 10 tracos.')
        if traits is not None:
            campaign = attrs.get('campaign') or getattr(self.instance, 'campaign', None)
            if campaign:
                for trait in traits:
                    if trait.campaign_id and trait.campaign_id != campaign.id:
                        raise serializers.ValidationError('Traço não pertence a esta campanha.')
        return attrs


class CharacterStatsUpdateSerializer(serializers.ModelSerializer):
    """Para mestre atualizar stats ocultos"""
    class Meta:
        model = Character
        fields = (
            'forca', 'destreza', 'vigor', 'inteligencia', 'sabedoria', 'carisma',
            'fate_points', 'status',
            'stand_unlocked', 'extra_stand_slots',
            'cursed_energy_unlocked', 'cursed_energy', 'extra_cursed_technique_slots',
            'zanpakuto_unlocked', 'extra_zanpakuto_slots',
            'shikai_unlocked', 'bankai_unlocked',
        )

    def validate(self, attrs):
        for key in ('extra_stand_slots', 'extra_cursed_technique_slots', 'extra_zanpakuto_slots'):
            if key in attrs:
                try:
                    value = int(attrs.get(key) or 0)
                except (TypeError, ValueError):
                    raise serializers.ValidationError({key: 'Valor inválido.'})
                if value < 0:
                    raise serializers.ValidationError({key: 'Deve ser 0 ou maior.'})
                attrs[key] = value
        return attrs


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
        fields = ('id', 'campaign', 'date', 'location', 'summary', 'map_data', 'map_image')
        read_only_fields = ('id',)
