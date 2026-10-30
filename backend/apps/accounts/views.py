
from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer

from .serializers import UserSerializer, ProfileUpdateSerializer

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework.exceptions import ValidationError
from .serializers import (
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from django.conf import settings
from django.core.mail import get_connection, EmailMessage

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        operation_id="auth_me_retrieve",
        summary="Get current authenticated user",
        responses=UserSerializer,
    )
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        operation_id="auth_me_update",
        summary="Update current authenticated user profile",
        request=ProfileUpdateSerializer,
        responses=UserSerializer,
    )
    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)

from django.contrib.auth import update_session_auth_hash
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .models import UserPreference
from .serializers import (
    UserPreferenceSerializer,
    PasswordChangeSerializer,
)


class UserPreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        preference, _ = UserPreference.objects.get_or_create(
            user=request.user
        )
        return Response(UserPreferenceSerializer(preference).data)

    def patch(self, request):
        preference, _ = UserPreference.objects.get_or_create(
            user=request.user
        )
        serializer = UserPreferenceSerializer(
            preference,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        return Response(
            {"detail": "Password changed successfully. Please sign in again."},
            status=status.HTTP_200_OK,
        )

from .models import BusinessPreference
from .serializers import BusinessPreferenceSerializer


class BusinessPreferenceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        preference, _ = BusinessPreference.objects.get_or_create(
            user=request.user
        )
        serializer = BusinessPreferenceSerializer(preference)
        return Response(serializer.data)

    def patch(self, request):
        preference, _ = BusinessPreference.objects.get_or_create(
            user=request.user
        )
        serializer = BusinessPreferenceSerializer(
            preference,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip()
        user_model = get_user_model()
        users = user_model.objects.filter(
            email__iexact=email,
            is_active=True,
        )

        for user in users:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            reset_url = (
                f"http://localhost:5173/reset-password"
                f"?uid={uid}&token={token}"
            )

            message = (
                f"Hi {user.get_username()},\n\n"
                "We received a request to reset your LeadPilot password.\n\n"
                f"Use this link to choose a new password:\n{reset_url}\n\n"
                "If you did not request this, you can ignore this email.\n"
                "For your security, do not share this link with anyone."
            )

            connection = get_connection()

            try:
                connection.open()

                email_message = EmailMessage(
                    subject="Reset your LeadPilot password",
                    body=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email],
                    connection=connection,
                )

                email_message.send(fail_silently=False)

            finally:
                if connection.connection is not None:
                    connection.close()

        return Response(
            {
                "detail": (
                    "If an account exists for that email, "
                    "password reset instructions will be sent."
                )
            },
            status=status.HTTP_200_OK,
        )



class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user_id = urlsafe_base64_decode(data["uid"]).decode()
            user = get_user_model().objects.get(pk=user_id, is_active=True)
        except (ValueError, TypeError, OverflowError, UnicodeDecodeError, get_user_model().DoesNotExist):
            raise ValidationError({"detail": "This password reset link is invalid or expired."})

        if not default_token_generator.check_token(user, data["token"]):
            raise ValidationError({"detail": "This password reset link is invalid or expired."})

        user.set_password(data["new_password"])
        user.save(update_fields=["password"])

        return Response(
            {"detail": "Password reset successfully. Please sign in with your new password."},
            status=status.HTTP_200_OK,
        )
