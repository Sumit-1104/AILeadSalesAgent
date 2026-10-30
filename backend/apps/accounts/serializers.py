from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from .models import UserPreference, BusinessPreference

User = get_user_model()


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        validators=[validate_password],
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "company_name",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return email

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "company_name",
        ]
        read_only_fields = ["id", "role"]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone",
            "company_name",
        ]


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "email_notifications",
            "follow_up_reminders",
            "hot_lead_alerts",
        ]


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect."
            )
        return value

    def validate_new_password(self, value):
        validate_password(value)
        return value


class BusinessPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessPreference
        fields = [
            "business_name",
            "business_email",
            "business_phone",
            "website_url",
            "industry",
            "working_days",
            "first_followup_days",
            "second_followup_days",
            "third_followup_days",
            "timezone",
            "work_start_time",
            "work_end_time",
            "daily_report_enabled",
            "daily_report_time",
        ]

    def validate_working_days(self, value):
        valid_days = {
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        }

        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Working days must be a list."
            )

        if not value:
            raise serializers.ValidationError(
                "Select at least one working day."
            )

        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Duplicate working days are not allowed."
            )

        invalid_days = set(value) - valid_days
        if invalid_days:
            raise serializers.ValidationError(
                "One or more working days are invalid."
            )

        return value

    def validate(self, attrs):
        first = attrs.get(
            "first_followup_days",
            getattr(self.instance, "first_followup_days", 1),
        )
        second = attrs.get(
            "second_followup_days",
            getattr(self.instance, "second_followup_days", 3),
        )
        third = attrs.get(
            "third_followup_days",
            getattr(self.instance, "third_followup_days", 7),
        )

        if not (0 < first < second < third):
            raise serializers.ValidationError(
                "Follow-up days must be in increasing order, e.g. 1, 3, 7."
            )

        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        validators=[validate_password],
    )
