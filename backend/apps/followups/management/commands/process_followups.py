import json
import os
import re
import urllib.error
import urllib.request

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.followups.models import FollowUp


def send_whatsapp(phone, body):
    token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    version = os.getenv("WHATSAPP_API_VERSION", "v23.0").strip()

    if not token or not phone_number_id:
        raise RuntimeError(
            "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend .env"
        )

    recipient = re.sub(r"\D", "", phone or "")
    if not recipient or len(recipient) < 10:
        raise ValueError("Lead phone number is missing or invalid.")

    payload = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {"body": body},
    }
    request = urllib.request.Request(
        f"https://graph.facebook.com/{version}/{phone_number_id}/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"WhatsApp API HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"WhatsApp network error: {exc.reason}") from exc

    messages = result.get("messages") or []
    if not messages or not messages[0].get("id"):
        raise RuntimeError(f"WhatsApp API returned no message ID: {result}")

    return messages[0]["id"]


def message_for(followup, lead):
    name = lead.name or "there"
    title = followup.title.lower()

    if "[auto-d1]" in title:
        return (
            f"Hi {name}, just following up on your enquiry. "
            "Do you have any questions I can help with?"
        )
    if "[auto-d3]" in title:
        return (
            f"Hi {name}, checking in about your enquiry. "
            "Would you like more details or a quick discussion?"
        )
    if "[auto-d7]" in title:
        return (
            f"Hi {name}, we're checking whether you're still interested. "
            "Reply here if you'd like us to assist."
        )

    return followup.description.strip() or (
        f"Hi {name}, following up regarding your enquiry. "
        "Please reply if you'd like assistance."
    )


class Command(BaseCommand):
    help = "Send due WhatsApp follow-ups using Meta WhatsApp Cloud API."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        now = timezone.now()
        tasks = FollowUp.objects.filter(
            status=FollowUp.Status.PENDING,
            follow_up_type=FollowUp.FollowUpType.WHATSAPP,
            due_at__lte=now,
            sent_at__isnull=True,
            whatsapp_message_id="",
            title__startswith="[AUTO-D",
        ).select_related("lead").order_by("due_at")

        sent = skipped = failed = 0

        for task in tasks.iterator():
            lead = task.lead

            if not lead:
                skipped += 1
                self.stdout.write(self.style.WARNING(
                    f"Follow-up {task.pk}: no linked lead; skipped."
                ))
                continue

            if lead.status in ("WON", "LOST") or not lead.phone:
                skipped += 1
                self.stdout.write(self.style.WARNING(
                    f"Follow-up {task.pk}: lead closed or phone missing; skipped."
                ))
                continue

            body = message_for(task, lead)

            if options["dry_run"]:
                self.stdout.write(
                    f"DRY RUN | follow-up={task.pk} | to={lead.phone} | {body}"
                )
                continue

            try:
                message_id = send_whatsapp(lead.phone, body)
                updated = FollowUp.objects.filter(
                    pk=task.pk,
                    status=FollowUp.Status.PENDING,
                    sent_at__isnull=True,
                    whatsapp_message_id="",
                ).update(
                    whatsapp_message_id=message_id,
                    sent_at=timezone.now(),
                    status=FollowUp.Status.COMPLETED,
                    last_error="",
                    updated_at=timezone.now(),
                )

                if updated:
                    sent += 1
                    self.stdout.write(self.style.SUCCESS(
                        f"Sent follow-up {task.pk}; WhatsApp ID: {message_id}"
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        f"Follow-up {task.pk} changed after sending; review manually."
                    ))
            except Exception as exc:
                failed += 1
                FollowUp.objects.filter(pk=task.pk).update(
                    last_error=str(exc)[:4000],
                    updated_at=timezone.now(),
                )
                self.stderr.write(self.style.ERROR(
                    f"Follow-up {task.pk} failed: {exc}"
                ))

        self.stdout.write(
            f"Finished. Sent={sent}, skipped={skipped}, failed={failed}"
            + (" (dry run; no messages sent)" if options["dry_run"] else "")
        )
