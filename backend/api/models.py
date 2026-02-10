from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    is_game_master = models.BooleanField(default=False)
    bio = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Campaign(models.Model):
    CAMPAIGN_TYPES = [
        ('jojo', 'JoJo Bizarre Adventure'),
        ('jjk', 'Jujutsu Kaisen'),
        ('bleach', 'Bleach'),
        ('generic', 'FATE Genérico'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    campaign_type = models.CharField(max_length=20, choices=CAMPAIGN_TYPES, default='generic')
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_campaigns')

    image = models.ImageField(upload_to='campaign_images/', blank=True, null=True)
    era_campaign = models.CharField(max_length=100, blank=True, default='')
    location_campaign = models.CharField(max_length=100, blank=True, default='')

    # Projeção - imagem que o mestre mostra para todos os jogadores
    projection_image = models.ImageField(upload_to='projections/', blank=True, null=True)
    projection_title = models.CharField(max_length=200, blank=True, default='')
    projection_updated_at = models.DateTimeField(auto_now=True)

    # Mapa da campanha (visível aos jogadores)
    map_image = models.ImageField(upload_to='campaign_maps/', blank=True, null=True)
    map_data = models.JSONField(default=dict, blank=True)
    map_updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class CampaignBan(models.Model):
    """Banimentos de jogadores por campanha"""
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='bans')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='campaign_bans')
    reason = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_campaign_bans',
    )

    class Meta:
        unique_together = ('campaign', 'user')

    def __str__(self):
        status = 'ativo' if self.is_active else 'revogado'
        return f'Ban {self.user.username} em {self.campaign.name} ({status})'

    def save(self, *args, **kwargs):
        if self.is_active:
            if self.revoked_at is not None:
                self.revoked_at = None
            if self.revoked_by is not None:
                self.revoked_by = None
        else:
            if self.revoked_at is None:
                self.revoked_at = timezone.now()
        super().save(*args, **kwargs)


class PersonalityTrait(models.Model):
    """Traços de personalidade que dão bonus em situações específicas"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    use_status = models.CharField(max_length=50, blank=True, default='')  # qual atributo usa
    bonus = models.IntegerField(default=0)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='personality_traits', null=True, blank=True)

    def __str__(self):
        return self.name


class Skill(models.Model):
    """Perícias do personagem"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    use_status = models.CharField(max_length=50, blank=True, default='')  # força, destreza, etc
    bonus = models.IntegerField(default=0)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='skills', null=True, blank=True)

    def __str__(self):
        return self.name


class Ability(models.Model):
    """Habilidades especiais / poderes"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    use_status = models.CharField(max_length=50, blank=True, default='')
    damage_base = models.CharField(max_length=100, default='0')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='abilities', null=True, blank=True)

    def __str__(self):
        return self.name


class Advantage(models.Model):
    """Vantagens do personagem"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    status_type = models.CharField(max_length=100, blank=True, default='')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='advantages', null=True, blank=True)

    def __str__(self):
        return self.name


class Character(models.Model):
    """Ficha do personagem - jogador ou NPC"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='character_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Fate Points - visível ao jogador
    fate_points = models.IntegerField(default=3)

    # Atributos OCULTOS - apenas mestre vê
    forca = models.IntegerField(default=0, verbose_name='Força')
    destreza = models.IntegerField(default=0, verbose_name='Destreza')
    vigor = models.IntegerField(default=0, verbose_name='Vigor')
    inteligencia = models.IntegerField(default=0, verbose_name='Inteligência')
    sabedoria = models.IntegerField(default=0, verbose_name='Sabedoria')
    carisma = models.IntegerField(default=0, verbose_name='Carisma')

    # Relações
    personality_traits = models.ManyToManyField(PersonalityTrait, blank=True)
    skills = models.ManyToManyField(Skill, blank=True)
    abilities = models.ManyToManyField(Ability, blank=True)
    advantages = models.ManyToManyField(Advantage, blank=True)

    # Metadados
    hierarchy = models.CharField(max_length=100, blank=True, default='')
    role = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=100, blank=True, default='')  # vivo, morto, etc

    # Desbloqueios de campanha
    stand_unlocked = models.BooleanField(default=False)
    extra_stand_slots = models.IntegerField(default=0)
    cursed_energy_unlocked = models.BooleanField(default=False)
    cursed_energy = models.IntegerField(default=0)
    extra_cursed_technique_slots = models.IntegerField(default=0)
    zanpakuto_unlocked = models.BooleanField(default=False)
    extra_zanpakuto_slots = models.IntegerField(default=0)
    shikai_unlocked = models.BooleanField(default=False)
    bankai_unlocked = models.BooleanField(default=False)
    shikai_active = models.BooleanField(default=False)
    bankai_active = models.BooleanField(default=False)

    # NPC = owner é o mestre da campanha
    is_npc = models.BooleanField(default=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='characters')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='characters')

    def __str__(self):
        return f"{self.name} ({'NPC' if self.is_npc else 'Jogador'})"


class CharacterNote(models.Model):
    """Notas pessoais do jogador sobre seu personagem"""
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='character_notes', null=True, blank=True)
    is_master_note = models.BooleanField(default=False)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Nota de {self.character.name}"


class Item(models.Model):
    """Itens do jogo"""
    ITEM_TYPES = [
        ('weapon', 'Arma'),
        ('armor', 'Armadura'),
        ('consumable', 'Consumível'),
        ('accessory', 'Acessório'),
        ('quest', 'Item de Quest'),
        ('misc', 'Diversos'),
    ]
    RARITIES = [
        ('common', 'Comum'),
        ('uncommon', 'Incomum'),
        ('rare', 'Raro'),
        ('epic', 'Épico'),
        ('legendary', 'Lendário'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES, default='misc')
    durability = models.IntegerField(default=100)
    is_equipped = models.BooleanField(default=False)
    quantity = models.IntegerField(default=1)
    image = models.ImageField(upload_to='item_images/', blank=True, null=True)
    rarity = models.CharField(max_length=20, choices=RARITIES, default='common')
    tags = models.JSONField(default=list, blank=True)

    # Bônus que o item dá
    bonus_status = models.CharField(max_length=50, blank=True, default='')  # qual atributo
    bonus_value = models.IntegerField(default=0)

    owner_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='items')

    def __str__(self):
        return f"{self.name} ({self.owner_character.name})"


class Stand(models.Model):
    """Stands para campanhas JoJo"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    stand_type = models.CharField(max_length=100, blank=True, default='')
    stand_image = models.ImageField(upload_to='stand_images/', blank=True, null=True)

    # Stats do Stand (A, B, C, D, E)
    destructive_power = models.CharField(max_length=10, blank=True, default='')
    speed = models.CharField(max_length=10, blank=True, default='')
    range_stat = models.CharField(max_length=10, blank=True, default='')
    stamina = models.CharField(max_length=10, blank=True, default='')
    precision = models.CharField(max_length=10, blank=True, default='')
    development_potential = models.CharField(max_length=10, blank=True, default='')

    abilities = models.ManyToManyField(Ability, blank=True)
    notes = models.TextField(blank=True, default='')

    owner_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='stands')

    def __str__(self):
        return f"{self.name} (Stand de {self.owner_character.name})"


class CursedTechnique(models.Model):
    """Técnicas Amaldiçoadas para campanhas JJK"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    technique_type = models.CharField(max_length=100, blank=True, default='')  # inata, herdada, etc
    image = models.ImageField(upload_to='technique_images/', blank=True, null=True)

    # Custo de energia amaldiçoada
    cursed_energy_cost = models.IntegerField(default=0)
    damage_base = models.CharField(max_length=100, default='0')

    abilities = models.ManyToManyField(Ability, blank=True)
    notes = models.TextField(blank=True, default='')

    owner_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='cursed_techniques')

    def __str__(self):
        return f"{self.name} (Técnica de {self.owner_character.name})"


class Zanpakuto(models.Model):
    """Zanpakutou para campanhas Bleach"""
    name = models.CharField(max_length=100)
    sealed_form = models.TextField(blank=True, default='')  # descrição forma selada
    spirit_name = models.CharField(max_length=100, blank=True, default='')
    image = models.ImageField(upload_to='zanpakuto_images/', blank=True, null=True)

    # Shikai
    shikai_command = models.CharField(max_length=200, blank=True, default='')
    shikai_description = models.TextField(blank=True, default='')
    shikai_abilities = models.ManyToManyField(Ability, blank=True, related_name='zanpakuto_shikai')

    # Bankai
    bankai_name = models.CharField(max_length=100, blank=True, default='')
    bankai_description = models.TextField(blank=True, default='')
    bankai_abilities = models.ManyToManyField(Ability, blank=True, related_name='zanpakuto_bankai')

    notes = models.TextField(blank=True, default='')

    owner_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='zanpakutos')

    def __str__(self):
        return f"{self.name} (Zanpakutou de {self.owner_character.name})"


class PowerIdea(models.Model):
    """Ideias de poderes enviadas ao mestre para aprovação"""
    IDEA_TYPES = [
        ('stand', 'Stand'),
        ('zanpakuto', 'Zanpakutou'),
        ('cursed', 'Técnica Amaldiçoada'),
    ]
    STATUS = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovada'),
        ('rejected', 'Rejeitada'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='power_ideas')
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='power_ideas')
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='power_ideas_submitted')

    idea_type = models.CharField(max_length=20, choices=IDEA_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    stand_type = models.CharField(max_length=100, blank=True, default='')
    technique_type = models.CharField(max_length=100, blank=True, default='')

    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    response_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='power_ideas_reviewed',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Ideia {self.idea_type} de {self.character.name} ({self.status})"


class SkillIdea(models.Model):
    """Ideias de skills enviadas ao mestre para aprovacao"""
    STATUS = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovada'),
        ('rejected', 'Rejeitada'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='skill_ideas')
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='skill_ideas')
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skill_ideas_submitted')

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')

    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    response_message = models.TextField(blank=True, default='')
    mastery = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='skill_ideas_reviewed',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Ideia de skill {self.name} ({self.status})"


class DiceRoll(models.Model):
    """Registro de rolagens de dados"""
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='dice_rolls')
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='dice_rolls')

    # Resultado dos 4 dados FATE (-1, 0, +1 cada)
    dice_1 = models.IntegerField()
    dice_2 = models.IntegerField()
    dice_3 = models.IntegerField()
    dice_4 = models.IntegerField()

    # Total dos dados (antes de modificadores)
    dice_total = models.IntegerField()

    # Se usou Fate Point para mudar destino
    used_fate_point = models.BooleanField(default=False)
    final_total = models.IntegerField()  # +4 se usou fate point

    # Contexto da rolagem
    skill_used = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, blank=True, default='')

    # Cálculo do mestre (oculto do jogador)
    hidden_bonus = models.IntegerField(default=0)  # atributo base + skill
    hidden_total = models.IntegerField(default=0)  # final_total + hidden_bonus

    created_at = models.DateTimeField(auto_now_add=True)
    seen_by_master = models.BooleanField(default=False)

    def __str__(self):
        return f"Rolagem de {self.character.name}: {self.final_total}"


class RollRequest(models.Model):
    """Solicitação de rolagem enviada pelo mestre ao jogador"""
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='roll_requests')
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='roll_requests')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roll_requests_sent')
    skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True, default='')
    is_open = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    fulfilled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='roll_requests_fulfilled',
    )
    roll = models.OneToOneField(
        'DiceRoll',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='roll_request',
    )

    def __str__(self):
        status = 'aberta' if self.is_open else 'concluída'
        return f"RollRequest {self.character.name} ({status})"


class Notification(models.Model):
    """Notificações para o mestre e jogadores"""
    NOTIFICATION_TYPES = [
        ('trade', 'Troca de Item'),
        ('roll', 'Rolagem de Dados'),
        ('fate', 'Uso de Fate Point'),
        ('system', 'Sistema'),
        ('message', 'Mensagem'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='notifications')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Referências opcionais
    related_character = models.ForeignKey(Character, on_delete=models.SET_NULL, null=True, blank=True)
    related_item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    related_roll = models.ForeignKey(DiceRoll, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} para {self.recipient.username}"


class Message(models.Model):
    """Mensagens secretas entre mestre e jogadores"""
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_sent')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_received')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Mensagem de {self.sender.username} para {self.recipient.username}"


class ItemTrade(models.Model):
    """Registro de trocas de itens entre jogadores"""
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='trades')
    from_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='trades_sent')
    to_character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='trades_received')
    quantity = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item.name}: {self.from_character.name} → {self.to_character.name}"


class Session(models.Model):
    """Sessões de jogo"""
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField()
    location = models.CharField(max_length=100, blank=True, default='')
    summary = models.TextField(blank=True, default='')
    map_data = models.JSONField(default=dict, blank=True)
    map_image = models.ImageField(upload_to='session_maps/', blank=True, null=True)

    def __str__(self):
        return f"Sessão de {self.campaign.name} em {self.date}"
