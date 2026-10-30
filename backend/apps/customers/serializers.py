from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_username = serializers.CharField(
        source="assigned_to.username", read_only=True, default=None
    )
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, default=None
    )

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = [
            "id", "created_by", "created_at", "updated_at",
            "assigned_to_username", "created_by_username",
        ]