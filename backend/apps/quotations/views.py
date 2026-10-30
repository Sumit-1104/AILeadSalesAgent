from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from .models import Quotation
from .serializers import QuotationSerializer

class QuotationViewSet(ModelViewSet):
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["quote_number", "title", "description", "status"]
    ordering_fields = ["amount", "created_at", "valid_until", "status"]

    def get_queryset(self):
        qs = Quotation.objects.select_related("lead", "customer", "created_by")
        user = self.request.user
        if user.is_superuser or getattr(user, "role", "") in ("ADMIN", "MANAGER"):
            return qs
        return qs.filter(Q(created_by=user) | Q(lead__created_by=user) | Q(lead__assigned_to=user) | Q(customer__created_by=user) | Q(customer__assigned_to=user)).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
