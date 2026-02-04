from django.contrib import admin
from .models import (
    Profile, Campaign, CampaignBan, Character, CharacterNote, Item, RollRequest,
    Skill, Ability, Advantage, PersonalityTrait,
    Stand, CursedTechnique, Zanpakuto,
    DiceRoll, Notification, ItemTrade, Session
)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_game_master')
    list_filter = ('is_game_master',)
    search_fields = ('user__username',)


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'campaign_type', 'owner', 'created_at')
    list_filter = ('campaign_type', 'created_at')
    search_fields = ('name', 'owner__username')


@admin.register(CampaignBan)
class CampaignBanAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'user', 'is_active', 'created_at', 'revoked_at')
    list_editable = ('is_active',)
    list_filter = ('is_active', 'campaign', 'created_at')
    search_fields = ('campaign__name', 'user__username', 'reason')


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'campaign', 'owner', 'is_npc', 'fate_points')
    list_filter = ('is_npc', 'campaign')
    search_fields = ('name', 'owner__username')
    filter_horizontal = ('skills', 'abilities', 'advantages', 'personality_traits')


@admin.register(CharacterNote)
class CharacterNoteAdmin(admin.ModelAdmin):
    list_display = ('character', 'author', 'is_master_note', 'created_at')
    list_filter = ('is_master_note',)
    search_fields = ('character__name', 'content', 'author__username')


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_type', 'owner_character', 'is_equipped', 'quantity')
    list_filter = ('item_type', 'is_equipped')
    search_fields = ('name', 'owner_character__name')


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'use_status', 'bonus', 'campaign')
    list_filter = ('use_status', 'campaign')
    search_fields = ('name',)


@admin.register(Ability)
class AbilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'use_status', 'damage_base', 'campaign')
    search_fields = ('name',)


@admin.register(Advantage)
class AdvantageAdmin(admin.ModelAdmin):
    list_display = ('name', 'status_type', 'campaign')
    search_fields = ('name',)


@admin.register(PersonalityTrait)
class PersonalityTraitAdmin(admin.ModelAdmin):
    list_display = ('name', 'use_status', 'bonus', 'campaign')
    search_fields = ('name',)


@admin.register(Stand)
class StandAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_character', 'stand_type')
    search_fields = ('name', 'owner_character__name')


@admin.register(CursedTechnique)
class CursedTechniqueAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_character', 'technique_type', 'cursed_energy_cost')
    search_fields = ('name', 'owner_character__name')


@admin.register(Zanpakuto)
class ZanpakutoAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_character', 'spirit_name')
    search_fields = ('name', 'owner_character__name')


@admin.register(DiceRoll)
class DiceRollAdmin(admin.ModelAdmin):
    list_display = ('character', 'final_total', 'hidden_total', 'used_fate_point', 'seen_by_master', 'created_at')
    list_filter = ('used_fate_point', 'seen_by_master', 'campaign')
    search_fields = ('character__name',)


@admin.register(RollRequest)
class RollRequestAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'character', 'requested_by', 'is_open', 'created_at', 'fulfilled_at')
    list_filter = ('is_open', 'campaign', 'created_at')
    search_fields = ('campaign__name', 'character__name', 'requested_by__username')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'notification_type', 'recipient', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'campaign')
    search_fields = ('title', 'recipient__username')


@admin.register(ItemTrade)
class ItemTradeAdmin(admin.ModelAdmin):
    list_display = ('item', 'from_character', 'to_character', 'quantity', 'created_at')
    search_fields = ('item__name',)


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'date', 'location')
    list_filter = ('campaign', 'date')
