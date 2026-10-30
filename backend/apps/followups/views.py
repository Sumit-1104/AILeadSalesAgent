from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import FollowUp
from .serializers import FollowUpSerializer


class FollowUpListCreateView(generics.ListCreateAPIView):
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["due_at", "created_at", "status"]
    ordering = ["due_at"]

    def get_queryset(self):
        user = self.request.user
        qs = FollowUp.objects.select_related(
            "lead", "customer", "assigned_to", "created_by"
        )

        if user.is_superuser or getattr(user, "role", "") in ["ADMIN", "MANAGER"]:
            return qs

        return qs.filter(
            Q(created_by=user) | Q(assigned_to=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class FollowUpDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FollowUpSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = FollowUp.objects.select_related(
            "lead", "customer", "assigned_to", "created_by"
        )

        if user.is_superuser or getattr(user, "role", "") in ["ADMIN", "MANAGER"]:
            return qs

        return qs.filter(
            Q(created_by=user) | Q(assigned_to=user)
        ).distinct()

    def perform_update(self, serializer):
        instance = serializer.save()

        if instance.status == FollowUp.Status.COMPLETED and not instance.completed_at:
            instance.completed_at = timezone.now()
            instance.save(update_fields=["completed_at", "updated_at"])
        elif instance.status != FollowUp.Status.COMPLETED and instance.completed_at:
            instance.completed_at = None
            instance.save(update_fields=["completed_at", "updated_at"])