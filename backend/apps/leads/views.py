from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Lead
from .serializers import LeadSerializer
from apps.followups.models import FollowUp


def models_Q_created_by_or_assigned_to(user):
    return Q(created_by=user) | Q(assigned_to=user)


def schedule_automated_followups(lead, user):
    """Create the Day 1, 3 and 7 WhatsApp follow-up tasks."""
    if lead.status in (Lead.Status.WON, Lead.Status.LOST):
        return

    schedule = [
        (1, "Day 1"),
        (3, "Day 3"),
        (7, "Day 7"),
    ]

    first_due_at = None

    for day, label in schedule:
        due_at = timezone.now() + timedelta(days=day)
        marker = f"[AUTO-D{day}]"

        followup, created = FollowUp.objects.get_or_create(
            lead=lead,
            title=f"{marker} WhatsApp follow-up — {label}",
            defaults={
                "description": (
                    "Automated follow-up task. Contact the lead via WhatsApp "
                    "only when the WhatsApp integration is configured."
                ),
                "follow_up_type": FollowUp.FollowUpType.WHATSAPP,
                "status": FollowUp.Status.PENDING,
                "due_at": due_at,
                "assigned_to": lead.assigned_to,
                "created_by": user,
            },
        )

        if day == 1:
            first_due_at = followup.due_at

    if first_due_at and lead.next_follow_up != first_due_at:
        lead.next_follow_up = first_due_at
        lead.save(update_fields=["next_follow_up", "updated_at"])


class LeadListCreateView(generics.ListCreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "email", "phone", "company"]
    ordering_fields = ["created_at", "updated_at", "estimated_value"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        queryset = Lead.objects.select_related("assigned_to", "created_by")

        if not (user.is_superuser or user.role in ["ADMIN", "MANAGER"]):
            queryset = queryset.filter(
                models_Q_created_by_or_assigned_to(user)
            )

        status = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        source = self.request.query_params.get("source")

        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if source:
            queryset = queryset.filter(source=source)

        return queryset

    def perform_create(self, serializer):
        lead = serializer.save(created_by=self.request.user)
        schedule_automated_followups(lead, self.request.user)


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Lead.objects.select_related("assigned_to", "created_by")

        if user.is_superuser or user.role in ["ADMIN", "MANAGER"]:
            return queryset

        return queryset.filter(
            models_Q_created_by_or_assigned_to(user)
        )

    def perform_update(self, serializer):
        lead = serializer.save()

        if lead.status in (Lead.Status.WON, Lead.Status.LOST):
            FollowUp.objects.filter(
                lead=lead,
                status=FollowUp.Status.PENDING,
                title__startswith="[AUTO-D",
            ).update(
                status=FollowUp.Status.CANCELLED,
                updated_at=timezone.now(),
            )
