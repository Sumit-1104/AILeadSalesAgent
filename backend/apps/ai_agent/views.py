from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiTypes
from .serializers import (
    LeadAIRequestSerializer,
    GenerateReplyRequestSerializer,
    SuggestFollowupRequestSerializer,
)

from apps.leads.models import Lead
from .services import (
    AIConfigurationError,
    AIProviderError,
    generate_ai_json,
)


def accessible_leads(user):
    role = str(getattr(user, "role", "")).upper()

    if user.is_superuser or user.is_staff or role in {"ADMIN", "MANAGER"}:
        return Lead.objects.all()

    return Lead.objects.filter(
        Q(created_by=user) | Q(assigned_to=user)
    ).distinct()


def lead_data(lead):
    return {
        "id": lead.pk,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "source": lead.source,
        "status": lead.status,
        "priority": lead.priority,
        "estimated_value": (
            str(lead.estimated_value)
            if lead.estimated_value is not None else None
        ),
        "notes": lead.notes,
    }


def get_lead(request):
    lead_id = request.data.get("lead_id")
    if lead_id in (None, ""):
        return None, Response(
            {"error": "lead_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lead_id = int(lead_id)
    except (TypeError, ValueError):
        return None, Response(
            {"error": "lead_id must be an integer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    lead = accessible_leads(request.user).filter(pk=lead_id).first()
    if lead is None:
        return None, Response(
            {"error": "Lead not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return lead, None


def run_ai(task, data):
    try:
        return Response(
            generate_ai_json(task, data),
            status=status.HTTP_200_OK,
        )
    except AIConfigurationError as exc:
        return Response(
            {"error": str(exc), "code": "ai_not_configured"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except AIProviderError as exc:
        return Response(
            {"error": str(exc), "code": "ai_provider_error"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


class ScoreLeadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LeadAIRequestSerializer, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        lead, error = get_lead(request)
        if error:
            return error

        response = run_ai(
            "Score the lead from 0 to 100. Return JSON with score "
            "(integer 0-100), buying_intent (low/medium/high), reasoning, "
            "recommended_action, and missing_information (array). "
            "Use only supplied facts; do not invent information.",
            {"lead": lead_data(lead)},
        )

        if response.status_code == 200:
            try:
                score = int(response.data["score"])
                if not 0 <= score <= 100:
                    raise ValueError
            except (KeyError, TypeError, ValueError):
                return Response(
                    {"error": "AI returned an invalid score."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            response.data["score"] = score
            response.data["lead_id"] = lead.pk

        return response


class QualifyLeadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LeadAIRequestSerializer, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        lead, error = get_lead(request)
        if error:
            return error

        response = run_ai(
            "Qualify this lead using only known information. Return JSON "
            "with qualification (qualified/needs_more_information/"
            "not_qualified), reasoning, strengths (array), concerns (array), "
            "questions_to_ask (array), and recommended_action. Do not assume "
            "budget, authority, need, or timeline without evidence.",
            {"lead": lead_data(lead)},
        )

        if response.status_code == 200:
            response.data["lead_id"] = lead.pk
        return response


class GenerateReplyView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=GenerateReplyRequestSerializer, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        context = request.data.get("context", "")
        tone = request.data.get("tone", "professional")
        language = request.data.get("language", "English")

        if not isinstance(context, str) or not context.strip():
            return Response(
                {"error": "context is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(context) > 12000:
            return Response(
                {"error": "context must be 12000 characters or fewer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(tone, str) or len(tone) > 60:
            return Response(
                {"error": "tone must be text of at most 60 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(language, str) or len(language) > 60:
            return Response(
                {"error": "language must be text of at most 60 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {"context": context, "tone": tone, "language": language}

        if request.data.get("lead_id") not in (None, ""):
            lead, error = get_lead(request)
            if error:
                return error
            data["lead"] = lead_data(lead)

        response = run_ai(
            "Draft a concise sales reply in the requested language and tone. "
            "Return JSON with reply, rationale, and suggested_next_step. "
            "Do not claim a message was sent or invent prices or promises.",
            data,
        )

        if response.status_code == 200 and "lead" in data:
            response.data["lead_id"] = data["lead"]["id"]
        return response


class SuggestFollowupView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=SuggestFollowupRequestSerializer, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        lead, error = get_lead(request)
        if error:
            return error

        context = request.data.get("context", "")
        if not isinstance(context, str) or len(context) > 12000:
            return Response(
                {"error": "context must be text of at most 12000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = run_ai(
            "Suggest a sales follow-up. Return JSON with "
            "suggested_delay_days (integer 0-30), channel "
            "(call/email/whatsapp/meeting/other), message, reasoning, "
            "and recommended_action. This is only a suggestion; do not "
            "send a message or schedule an appointment.",
            {"lead": lead_data(lead), "recent_context": context},
        )

        if response.status_code == 200:
            try:
                days = int(response.data["suggested_delay_days"])
                if not 0 <= days <= 30:
                    raise ValueError
            except (KeyError, TypeError, ValueError):
                return Response(
                    {"error": "AI returned an invalid follow-up delay."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            response.data["suggested_delay_days"] = days
            response.data["lead_id"] = lead.pk

        return response


from rest_framework.generics import RetrieveUpdateAPIView

from .models import AssistantConfiguration
from .serializers import AssistantConfigurationSerializer


class AssistantConfigurationView(RetrieveUpdateAPIView):
    serializer_class = AssistantConfigurationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "put", "patch", "head", "options"]

    def get_object(self):
        configuration, _ = AssistantConfiguration.objects.get_or_create(
            user=self.request.user
        )
        return configuration

