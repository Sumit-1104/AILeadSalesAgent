from django.db.models import Q
from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "email", "phone", "company"]
    ordering_fields = ["created_at", "updated_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Customer.objects.all()

        if user.is_superuser or getattr(user, "role", "") in ["ADMIN", "MANAGER"]:
            return qs

        return qs.filter(Q(created_by=user) | Q(assigned_to=user))

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Customer.objects.all()

        if user.is_superuser or getattr(user, "role", "") in ["ADMIN", "MANAGER"]:
            return qs

        return qs.filter(Q(created_by=user) | Q(assigned_to=user))