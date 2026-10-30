from rest_framework import serializers
from .models import Quotation

class QuotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quotation
        fields = "__all__"
        read_only_fields = ("id", "quote_number", "created_by", "created_at", "updated_at")

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Amount cannot be negative.")
        return value
