from django.utils import timezone
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ("id", "recipient", "created_at", "read_at")

    def update(self, instance, validated_data):
        is_read = validated_data.get("is_read", instance.is_read)
        if is_read and not instance.is_read:
            validated_data["read_at"] = timezone.now()
        elif not is_read:
            validated_data["read_at"] = None
        return super().update(instance, validated_data)
