from django.conf import settings
from django.db import models
from django.utils import timezone

class Conversation(models.Model):
    class Channel(models.TextChoices):
        WEBSITE = "WEBSITE", "Website"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        INSTAGRAM = "INSTAGRAM", "Instagram"
        EMAIL = "EMAIL", "Email"
        PHONE = "PHONE", "Phone"
        OTHER = "OTHER", "Other"
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        WAITING = "WAITING", "Waiting"
        CLOSED = "CLOSED", "Closed"

    channel = models.CharField(max_length=12, choices=Channel.choices, default=Channel.WEBSITE)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    subject = models.CharField(max_length=200, blank=True)
    external_contact = models.CharField(max_length=180, blank=True)
    lead = models.ForeignKey("leads.Lead", on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations")
    customer = models.ForeignKey("customers.Customer", on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales_conversations_assigned")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales_conversations_created")
    started_at = models.DateTimeField(default=timezone.now)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return self.subject or f"{self.channel} conversation #{self.pk}"

class Message(models.Model):
    class SenderType(models.TextChoices):
        LEAD = "LEAD", "Lead/Customer"
        AGENT = "AGENT", "Sales Agent"
        AI = "AI", "AI Agent"
        SYSTEM = "SYSTEM", "System"
    class Direction(models.TextChoices):
        INBOUND = "INBOUND", "Inbound"
        OUTBOUND = "OUTBOUND", "Outbound"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender_type = models.CharField(max_length=10, choices=SenderType.choices, default=SenderType.AGENT)
    direction = models.CharField(max_length=8, choices=Direction.choices, default=Direction.OUTBOUND)
    body = models.TextField()
    external_message_id = models.CharField(max_length=180, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    sent_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sent_at", "id"]

    def __str__(self):
        return f"Message #{self.pk} - conversation #{self.conversation_id}"
