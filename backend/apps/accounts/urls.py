from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    CurrentUserView,
    UserPreferencesView,
    PasswordChangeView,
    SignupView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

from .views import BusinessPreferenceView

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("preferences/", UserPreferencesView.as_view(), name="user-preferences"),
    path("change-password/", PasswordChangeView.as_view(), name="change-password"),
    path("business-preferences/", BusinessPreferenceView.as_view(), name="business-preferences"),
    path("signup/", SignupView.as_view(), name="signup"),
    path(
    "password-reset/",
    PasswordResetRequestView.as_view(),
    name="password-reset",
),
path(
    "password-reset/confirm/",
    PasswordResetConfirmView.as_view(),
    name="password-reset-confirm",
),
]
