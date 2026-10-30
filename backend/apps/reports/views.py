from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.leads.models import Lead
from apps.quotations.models import Quotation
from apps.followups.models import FollowUp


class SalesReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        leads = Lead.objects.all()
        quotations = Quotation.objects.all()
        followups = FollowUp.objects.all()

        if not (user.is_superuser or getattr(user, "role", "") in ("ADMIN", "MANAGER")):
            from django.db.models import Q
            leads = leads.filter(Q(created_by=user) | Q(assigned_to=user))
            quotations = quotations.filter(
                Q(created_by=user)
                | Q(lead__created_by=user)
                | Q(lead__assigned_to=user)
                | Q(customer__created_by=user)
                | Q(customer__assigned_to=user)
            ).distinct()
            followups = followups.filter(
                Q(lead__created_by=user) | Q(lead__assigned_to=user)
            )

        today = timezone.localdate()
        start_date = today - timedelta(days=6)
        recent_leads = leads.filter(created_at__date__gte=start_date)

        lead_statuses = list(
            leads.values("status").annotate(count=Count("id")).order_by("status")
        )
        lead_sources = list(
            leads.values("source").annotate(count=Count("id")).order_by("-count")
        )
        daily_leads = list(
            recent_leads.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        quotation_statuses = list(
            quotations.values("status").annotate(count=Count("id")).order_by("status")
        )
        quotation_total = quotations.count()
        accepted_quotes = quotations.filter(status=Quotation.Status.ACCEPTED)
        accepted_revenue = accepted_quotes.aggregate(total=Sum("amount"))["total"] or 0

        lead_total = leads.count()
        won_leads = leads.filter(status=Lead.Status.WON).count()
        conversion_rate = round((won_leads / lead_total) * 100, 2) if lead_total else 0

        return Response({
            "summary": {
                "total_leads": lead_total,
                "new_leads": leads.filter(status=Lead.Status.NEW).count(),
                "hot_leads": leads.filter(priority=Lead.Priority.HOT).count(),
                "won_leads": won_leads,
                "lost_leads": leads.filter(status=Lead.Status.LOST).count(),
                "conversion_rate": conversion_rate,
                "total_quotations": quotation_total,
                "accepted_quotations": accepted_quotes.count(),
                "accepted_quotation_value": str(accepted_revenue),
                "total_followups": followups.count(),
            },
            "lead_statuses": lead_statuses,
            "lead_sources": lead_sources,
            "daily_leads": [
                {"date": item["day"].isoformat(), "count": item["count"]}
                for item in daily_leads
            ],
            "quotation_statuses": quotation_statuses,
        })
