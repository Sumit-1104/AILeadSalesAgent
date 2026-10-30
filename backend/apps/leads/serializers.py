from rest_framework import serializers
from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_username = serializers.CharField(
        source="assigned_to.username",
        read_only=True,
        default=None,
    )
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "company",
            "source",
            "status",
            "priority",
            "estimated_value",
            "notes",
            "assigned_to",
            "assigned_to_username",
            "created_by",
            "created_by_username",
            "next_follow_up",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
        ]
