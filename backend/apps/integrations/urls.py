from django.urls import path
from .views import (
    WhatsAppWebhookView,
    whatsapp_embedded_signup_callback,
)

urlpatterns = [
    path("whatsapp/webhook/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
    path("whatsapp/embedded-signup/", whatsapp_embedded_signup_callback, name="whatsapp-embedded-signup"),
]
