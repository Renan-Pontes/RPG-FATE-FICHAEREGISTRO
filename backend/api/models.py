from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
     user = models.OneToOneField(User, on_delete=models.CASCADE)
     is_game_master = models.BooleanField(default=False)
     bio = models.TextField(blank=True, default='')

     def __str__(self):
           return f"{self.user.username}'s Profile"
     
class Campaign(models.Model):
     name = models.CharField(max_length=100)
     description = models.TextField(blank=True, default='')
     created_at = models.DateTimeField(auto_now_add=True)
     owner = models.ForeignKey(User, on_delete=models.CASCADE)

     image = models.ImageField(upload_to='campaign_images/', blank=True, null=True)
     era_campaign = models.CharField(max_length=100, blank=True, default='')
     location_campaign = models.CharField(max_length=100, blank=True)
     date_campaign = models.DateField(null=True, blank=True)
     time_campaign = models.TimeField(null=True, blank=True)

     date_played = models.DateField(null=True, blank=True)
     location_played = models.CharField(max_length=100, blank=True)

     def __str__(self):
           return self.name

class PersonalityTrait(models.Model):
     trait = models.CharField(max_length=255)
     description = models.TextField(blank=True, default='')
     use_status = models.CharField(max_length=100, blank=True, default='')
     bonus = models.IntegerField(default=0)

     def __str__(self):
           return self.trait

class skills(models.Model):
     name = models.CharField(max_length=100)
     description = models.TextField(blank=True, default='')
     use_status = models.CharField(max_length=100, blank=True, default='')
     bonus = models.IntegerField(default=0)

     def __str__(self):
           return self.name

class ability(models.Model):
     name = models.CharField(max_length=100)
     description = models.TextField(blank=True, default='')
     use_status = models.CharField(max_length=100, blank=True, default='')
     damage_base = models.CharField(max_length=100, default='0')

     def __str__(self):
           return self.name
     
class advantage(models.Model):
     name = models.CharField(max_length=100)
     description = models.TextField(blank=True, default='')
     status_type = models.CharField(max_length=100, blank=True, default='')

     def __str__(self):
           return self.name

class notes(models.Model):
     content = models.TextField(blank=True, default='')
     created_at = models.DateTimeField(auto_now_add=True)
     author = models.ForeignKey(User, on_delete=models.CASCADE)

     def __str__(self):
           return f"Note by {self.author.username} on {self.created_at.strftime('%Y-%m-%d')}"
     
class character(models.Model):
     name = models.CharField(max_length=100)
     description = models.TextField(blank=True, default='')
     image = models.ImageField(upload_to='character_images/', blank=True, null=True)
     created_at = models.DateTimeField(auto_now_add=True)
     fate_points = models.IntegerField(default=0)

     PersonalityTraits = models.ManyToManyField(PersonalityTrait, blank=True)
     skills = models.ManyToManyField(skills, blank=True)
     abilities = models.ManyToManyField(ability, blank=True)
     advantages = models.ManyToManyField(advantage, blank=True)

     hierarchy = models.CharField(max_length=100, blank=True, default='')
     role = models.CharField(max_length=100, blank=True, default='')

     notes = models.ManyToManyField(notes, blank=True)

     status = models.CharField(max_length=100, blank=True, default='')
     
     força = models.IntegerField(default=0)
     destreza = models.IntegerField(default=0)
     vigor = models.IntegerField(default=0)
     inteligência = models.IntegerField(default=0)
     sabedoria = models.IntegerField(default=0)
     carisma = models.IntegerField(default=0)

     owner = models.ForeignKey(User, on_delete=models.CASCADE)
     Campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE)

     def __str__(self):
           return self.name
     

class session(models.Model):
     Campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE)
     date = models.DateField()
     location = models.CharField(max_length=100, blank=True, default='')
     summary = models.TextField(blank=True, default='')

     def __str__(self):
           return f"Session on {self.date} at {self.location}"
     
class item(models.Model):
     name = models.CharField(max_length=100)
     type_item = models.CharField(max_length=100, blank=True, default='') # e.g., weapon, armor, consumable
     durability = models.IntegerField(default=100)
     description = models.TextField(blank=True, default='')
     owner_character = models.ForeignKey(character, on_delete=models.CASCADE)

     def __str__(self):
           return self.name

     
class stand(models.Model):
     name = models.CharField(max_length=100)
     description = models.TextField(blank=True, default='')
     owner_character = models.ForeignKey(character, on_delete=models.CASCADE)
     stand_type = models.CharField(max_length=100, blank=True, default='')
     stand_image = models.ImageField(upload_to='stand_images/', blank=True, null=True)

     destructive_power = models.CharField(max_length=100, blank=True, default='')
     speed = models.CharField(max_length=100, blank=True, default='')
     range = models.CharField(max_length=100, blank=True, default='')
     stamina = models.CharField(max_length=100, blank=True, default='')
     precision = models.CharField(max_length=100, blank=True, default='')
     development_potential = models.CharField(max_length=100, blank=True, default='')
     abilities = models.ManyToManyField(ability, blank=True)

     notes = models.TextField(blank=True, default='')

     def __str__(self):
               return self.name
