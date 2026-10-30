from django.db import models

# Create your models here.

from django.conf import settings
from django.db import models


class AssistantConfiguration(models.Model):
    class Tone(models.TextChoices):
        PROFESSIONAL = "professional", "Professional"
        FRIENDLY = "friendly", "Friendly"
        PERSUASIVE = "persuasive", "Persuasive"
        CASUAL = "casual", "Casual"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_assistant_configuration",
    )
    name = models.CharField(max_length=120, default="Sales Assistant")
    instructions = models.TextField(
        blank=True,
        default="Help customers understand our products and services. "
                "Use only verified business information. Never invent prices, "
                "availability, policies, or promises.",
    )
    welcome_message = models.CharField(
        max_length=1000,
        blank=True,
        default="Hello! How can I help you today?",
    )
    tone = models.CharField(
        max_length=20,
        choices=Tone.choices,
        default=Tone.PROFESSIONAL,
    )
    language = models.CharField(max_length=60, default="English")
    model_name = models.CharField(max_length=100, default="default")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_agent_assistant_configuration"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.user.username})"
