from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MANAGER = "MANAGER", "Manager"
        SALES_AGENT = "SALES_AGENT", "Sales Agent"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.SALES_AGENT,
    )
    phone = models.CharField(max_length=20, blank=True)
    company_name = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "accounts_user"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class UserPreference(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="preferences",
    )
    email_notifications = models.BooleanField(default=True)
    follow_up_reminders = models.BooleanField(default=True)
    hot_lead_alerts = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_user_preference"

    def __str__(self):
        return f"Preferences: {self.user.username}"


class BusinessPreference(models.Model):
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="business_preferences",
    )
    business_name = models.CharField(max_length=200, blank=True, default="")
    business_email = models.EmailField(blank=True, default="")
    business_phone = models.CharField(max_length=30, blank=True, default="")
    website_url = models.URLField(blank=True, default="")
    industry = models.CharField(max_length=100, blank=True, default="")

    # Working days selected in Settings
    working_days = models.JSONField(
        default=list,
        blank=True,
    )

    first_followup_days = models.PositiveSmallIntegerField(default=1)
    second_followup_days = models.PositiveSmallIntegerField(default=3)
    third_followup_days = models.PositiveSmallIntegerField(default=7)

    timezone = models.CharField(max_length=60, default="Asia/Kolkata")
    work_start_time = models.TimeField(default="09:00")
    work_end_time = models.TimeField(default="18:00")
    daily_report_enabled = models.BooleanField(default=True)
    daily_report_time = models.TimeField(default="18:00")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["business_name"]

    def __str__(self):
        return self.business_name or f"Business preferences - {self.user}"