
import json
import logging
import os

import requests
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from apps.ai_agent.services import (
    AIConfigurationError,
    AIProviderError,
    generate_ai_json,
)
from apps.conversations.models import Conversation, Message
from apps.followups.models import FollowUp
from apps.leads.models import Lead

logger = logging.getLogger(__name__)


def normalize_phone(value):
    """Keep digits only for phone-number comparison."""
    return "".join(
        character for character in str(value or "")
        if character.isdigit()
    )


def find_lead_by_phone(phone):
    """Match a WhatsApp sender to a lead using the full number or last 10 digits."""
    normalized_sender = normalize_phone(phone)

    if len(normalized_sender) < 10:
        return None

    sender_last_10 = normalized_sender[-10:]
    matches = []

    for lead in Lead.objects.all().only("id", "phone", "name"):
        normalized_lead_phone = normalize_phone(lead.phone)

        if len(normalized_lead_phone) < 10:
            continue

        if (
            normalized_lead_phone == normalized_sender
            or normalized_lead_phone[-10:] == sender_last_10
        ):
            matches.append(lead)

            if len(matches) > 1:
                logger.warning(
                    "Multiple leads match this WhatsApp number; "
                    "leaving conversation unlinked."
                )
                return None

    return matches[0] if matches else None


def send_whatsapp_text(to, body):
    """Send a text message through Meta WhatsApp Cloud API."""
    token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    api_version = os.getenv("WHATSAPP_API_VERSION", "v23.0").strip()

    if not token or not phone_number_id:
        logger.warning(
            "WhatsApp sending is disabled: API credentials missing."
        )
        return None

    url = (
        f"https://graph.facebook.com/{api_version}/"
        f"{phone_number_id}/messages"
    )

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": body,
            },
        },
        timeout=20,
    )

    if not response.ok:
        logger.error(
            "WhatsApp send failed: HTTP %s; response=%s",
            response.status_code,
            response.text[:500],
        )
        return None

    data = response.json()
    messages = data.get("messages", [])
    return messages[0].get("id") if messages else None


def generate_and_send_reply(conversation, incoming_text, recipient):
    """Generate an AI answer and send it when WhatsApp is configured."""
    if not (
        os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
        and os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    ):
        logger.info(
            "AI auto-reply not sent: WhatsApp credentials are not configured."
        )
        return

    history = list(
        Message.objects.filter(conversation=conversation)
        .order_by("-sent_at", "-id")
        .values("sender_type", "direction", "body")[:10]
    )
    history.reverse()

    task = """
You are a helpful business sales assistant.
Answer the customer's latest message naturally and professionally.
Use the conversation history for context.
Never invent prices, product availability, discounts, or business policies.
Ask a brief clarification if necessary.
Reply in the language used by the customer.
Return valid JSON with:
- reply: the customer-facing answer
- rationale: a brief internal explanation
- suggested_next_step: a recommended sales action
"""

    try:
        result = generate_ai_json(
            task,
            {
                "conversation_subject": conversation.subject,
                "conversation_history": history,
                "latest_message": incoming_text,
            },
        )

        reply = result.get("reply", "")

        if not isinstance(reply, str) or not reply.strip():
            raise AIProviderError("AI returned an empty reply.")

        external_id = send_whatsapp_text(recipient, reply.strip())

        if not external_id:
            logger.warning(
                "AI reply was not delivered; no successful WhatsApp message ID."
            )
            return

        with transaction.atomic():
            Message.objects.create(
                conversation=conversation,
                sender_type=Message.SenderType.AI,
                direction=Message.Direction.OUTBOUND,
                body=reply.strip(),
                external_message_id=external_id,
                metadata={
                    "source": "whatsapp_cloud_api",
                    "rationale": str(result.get("rationale", "")),
                    "suggested_next_step": str(
                        result.get("suggested_next_step", "")
                    ),
                },
                sent_at=timezone.now(),
            )

            Conversation.objects.filter(pk=conversation.pk).update(
                last_message_at=timezone.now()
            )

    except (AIConfigurationError, AIProviderError):
        logger.exception(
            "AI reply generation failed for conversation %s",
            conversation.pk,
        )
    except requests.RequestException:
        logger.exception(
            "WhatsApp API request failed for conversation %s",
            conversation.pk,
        )
    except Exception:
        logger.exception(
            "Unexpected auto-reply error for conversation %s",
            conversation.pk,
        )


@method_decorator(csrf_exempt, name="dispatch")
class WhatsAppWebhookView(View):
    def get(self, request):
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")

        expected_token = os.getenv(
            "WHATSAPP_WEBHOOK_VERIFY_TOKEN", ""
        ).strip()

        if (
            mode == "subscribe"
            and expected_token
            and token == expected_token
            and challenge
        ):
            return HttpResponse(
                challenge,
                content_type="text/plain",
            )

        return HttpResponse(
            "Webhook verification failed",
            status=403,
        )

    def post(self, request):
        try:
            payload = json.loads(request.body or b"{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse(
                {"error": "Invalid JSON"},
                status=400,
            )

        saved = 0
        replies_queued = []

        try:
            for entry in payload.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})

                    # Delivery-status notifications have no inbound messages.
                    for item in value.get("messages", []):
                        message_id = item.get("id", "")
                        sender = item.get("from", "")
                        message_type = item.get("type", "")

                        if (
                            not message_id
                            or not sender
                            or message_type != "text"
                        ):
                            continue

                        body = item.get("text", {}).get("body", "").strip()

                        if not body:
                            continue

                        with transaction.atomic():
                            # Prevent duplicate processing of webhook retries.
                            if Message.objects.filter(
                                external_message_id=message_id
                            ).exists():
                                continue

                            conversation = (
                                Conversation.objects.filter(
                                    channel=Conversation.Channel.WHATSAPP,
                                    external_contact=sender,
                                )
                                .order_by("-created_at")
                                .first()
                            )

                            if conversation is None:
                                matching_lead = find_lead_by_phone(sender)

                                conversation = Conversation.objects.create(
                                    channel=Conversation.Channel.WHATSAPP,
                                    subject="WhatsApp conversation",
                                    external_contact=sender,
                                    status=Conversation.Status.OPEN,
                                    lead=matching_lead,
                                )

                            elif conversation.lead_id is None:
                                # Link an existing conversation if the phone matches.
                                matching_lead = find_lead_by_phone(sender)

                                if matching_lead is not None:
                                    conversation.lead = matching_lead
                                    conversation.save(
                                        update_fields=["lead", "updated_at"]
                                    )

                            Message.objects.create(
                                conversation=conversation,
                                sender_type=Message.SenderType.LEAD,
                                direction=Message.Direction.INBOUND,
                                body=body,
                                external_message_id=message_id,
                                metadata={
                                    "source": "whatsapp_cloud_api"
                                },
                                sent_at=timezone.now(),
                            )

                            now = timezone.now()
                            conversation.last_message_at = now
                            conversation.save(
                                update_fields=[
                                    "last_message_at",
                                    "updated_at",
                                ]
                            )

                            replies_queued.append(
                                (conversation, body, sender)
                            )
                            saved += 1

        except Exception:
            logger.exception(
                "WhatsApp webhook message processing failed."
            )
            return JsonResponse(
                {"error": "Message processing failed"},
                status=500,
            )

        # Process AI replies after inbound messages have been committed.
        for conversation, body, sender in replies_queued:
            generate_and_send_reply(
                conversation,
                body,
                sender,
            )

        return JsonResponse(
            {
                "status": "ok",
                "saved": saved,
            }
        )


import os
import requests

from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.utils.decorators import method_decorator

from .models import WhatsAppBusinessConnection


@csrf_exempt
@require_POST
def whatsapp_embedded_signup_callback(request):
    import json

    try:
        data = json.loads(request.body)

        code = data.get("code")
        waba_id = data.get("waba_id")
        phone_number_id = data.get("phone_number_id")
        business_id = data.get("business_id", "")

        if not all([code, waba_id, phone_number_id]):
            return JsonResponse(
                {"error": "Missing signup information"},
                status=400
            )

        app_id = os.getenv("META_APP_ID")
        app_secret = os.getenv("META_APP_SECRET")
        api_version = os.getenv("WHATSAPP_API_VERSION", "v23.0")

        if not app_id or not app_secret:
            return JsonResponse(
                {"error": "Meta app credentials are not configured"},
                status=500
            )

        response = requests.get(
            f"https://graph.facebook.com/{api_version}/oauth/access_token",
            params={
                "client_id": app_id,
                "client_secret": app_secret,
                "code": code,
            },
            timeout=30,
        )

        token_data = response.json()

        if response.status_code != 200 or not token_data.get("access_token"):
            return JsonResponse(
                {"error": "Meta token exchange failed", "details": token_data},
                status=400
            )

        access_token = token_data["access_token"]

        connection, _ = WhatsAppBusinessConnection.objects.update_or_create(
            waba_id=waba_id,
            defaults={
                "business_id": business_id,
                "phone_number_id": phone_number_id,
                "access_token": access_token,
                "is_connected": True,
            },
        )

        return JsonResponse({
            "success": True,
            "message": "WhatsApp account connected",
            "waba_id": connection.waba_id,
            "phone_number_id": connection.phone_number_id,
        })

    except Exception:
        return JsonResponse(
            {"error": "Unable to complete WhatsApp connection"},
            status=500
        )
