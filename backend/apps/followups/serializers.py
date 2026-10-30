from rest_framework import serializers
from .models import FollowUp


class FollowUpSerializer(serializers.ModelSerializer):
    assigned_to_username = serializers.CharField(
        source="assigned_to.username", read_only=True, default=None
    )
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, default=None
    )

    class Meta:
        model = FollowUp
        fields = "__all__"
        read_only_fields = [
            "id", "created_by", "completed_at",
            "created_at", "updated_at",
            "assigned_to_username", "created_by_username",
        ]

    def validate(self, attrs):
        lead = attrs.get("lead", getattr(self.instance, "lead", None))
        customer = attrs.get("customer", getattr(self.instance, "customer", None))

        if not lead and not customer:
            raise serializers.ValidationError(
                "A follow-up must be linked to a lead or a customer."
            )

        if lead and customer:
            raise serializers.ValidationError(
                "Link a follow-up to either a lead or a customer, not both."
            )

        return attrs