from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from .models import Appointment
from .serializers import AppointmentSerializer

class AppointmentViewSet(ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["title", "location", "description"]
    ordering_fields = ["starts_at", "ends_at", "status", "created_at"]

    def get_queryset(self):
        qs = Appointment.objects.select_related("lead", "customer", "assigned_to", "created_by")
        user = self.request.user
        if user.is_superuser or getattr(user, "role", "") in ("ADMIN", "MANAGER"):
            return qs
        return qs.filter(Q(created_by=user) | Q(assigned_to=user) | Q(lead__created_by=user) | Q(lead__assigned_to=user) | Q(customer__created_by=user) | Q(customer__assigned_to=user)).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
