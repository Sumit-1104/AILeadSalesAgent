from django.conf import settings
from django.db import models

class Notification(models.Model):
    class Kind(models.TextChoices):
        INFO = "INFO", "Information"
        SUCCESS = "SUCCESS", "Success"
        WARNING = "WARNING", "Warning"
        REMINDER = "REMINDER", "Reminder"

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sales_notifications")
    title = models.CharField(max_length=180)
    message = models.TextField()
    notification_type = models.CharField(max_length=10, choices=Kind.choices, default=Kind.INFO)
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.recipient}"
