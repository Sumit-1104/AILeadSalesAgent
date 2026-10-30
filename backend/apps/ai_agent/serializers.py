
from rest_framework import serializers

from .models import AssistantConfiguration


class LeadAIRequestSerializer(serializers.Serializer):
    lead_id = serializers.IntegerField(required=True)


class GenerateReplyRequestSerializer(serializers.Serializer):
    context = serializers.CharField(max_length=12000)
    tone = serializers.CharField(
        max_length=60, required=False, default="professional"
    )
    language = serializers.CharField(
        max_length=60, required=False, default="English"
    )
    lead_id = serializers.IntegerField(required=False)


class SuggestFollowupRequestSerializer(serializers.Serializer):
    lead_id = serializers.IntegerField(required=True)
    context = serializers.CharField(
        max_length=12000, required=False, allow_blank=True, default=""
    )


class AssistantConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantConfiguration
        fields = [
            "id",
            "name",
            "instructions",
            "welcome_message",
            "tone",
            "language",
            "model_name",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
