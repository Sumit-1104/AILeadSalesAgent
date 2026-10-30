from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]
    search_fields = ["title", "message"]
    ordering_fields = ["created_at", "is_read"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
