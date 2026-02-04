from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Campaign, ability, character, item


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


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = (
            'id',
            'name',
            'description',
            'created_at',
            'owner',
            'image',
            'era_campaign',
            'location_campaign',
            'date_campaign',
            'time_campaign',
            'date_played',
            'location_played',
        )
        read_only_fields = ('id', 'created_at', 'owner')


class AbilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ability
        fields = (
            'id',
            'name',
            'description',
            'use_status',
            'damage_base',
        )


class CharacterSerializer(serializers.ModelSerializer):
    abilities = AbilitySerializer(many=True, read_only=True)

    class Meta:
        model = character
        fields = (
            'id',
            'name',
            'description',
            'image',
            'created_at',
            'fate_points',
            'hierarchy',
            'role',
            'notes',
            'abilities',
            'status',
            'força',
            'destreza',
            'vigor',
            'inteligência',
            'sabedoria',
            'carisma',
            'owner',
            'Campaign',
        )
        read_only_fields = (
            'id',
            'created_at',
            'owner',
            'fate_points',
        )


class CharacterCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = character
        fields = (
            'id',
            'name',
            'description',
            'image',
            'hierarchy',
            'role',
            'Campaign',
        )
        read_only_fields = ('id',)


class CharacterPublicSerializer(serializers.ModelSerializer):
    abilities = AbilitySerializer(many=True, read_only=True)

    class Meta:
        model = character
        fields = (
            'id',
            'name',
            'description',
            'image',
            'hierarchy',
            'role',
            'abilities',
            'Campaign',
        )
        read_only_fields = fields


class ItemSerializer(serializers.ModelSerializer):
    owner_character_name = serializers.CharField(
        source='owner_character.name',
        read_only=True,
    )
    campaign_id = serializers.IntegerField(
        source='owner_character.Campaign_id',
        read_only=True,
    )

    class Meta:
        model = item
        fields = (
            'id',
            'name',
            'type_item',
            'durability',
            'description',
            'owner_character',
            'owner_character_name',
            'campaign_id',
        )
        read_only_fields = ('id', 'owner_character_name', 'campaign_id')
