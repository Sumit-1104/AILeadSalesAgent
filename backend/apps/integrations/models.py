
from django.db import models


class WhatsAppBusinessConnection(models.Model):
    business_id = models.CharField(max_length=100, blank=True, default="")
    waba_id = models.CharField(max_length=100, unique=True)
    phone_number_id = models.CharField(max_length=100, blank=True, default="")
    display_phone_number = models.CharField(max_length=30, blank=True, default="")
    access_token = models.TextField()
    is_connected = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"WhatsApp - {self.waba_id}"
