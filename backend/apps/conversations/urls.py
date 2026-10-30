from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageViewSet

router = DefaultRouter()
router.register("", ConversationViewSet, basename="conversation")
messages_list = MessageViewSet.as_view({"get": "list", "post": "create"})
messages_detail = MessageViewSet.as_view({"get": "retrieve"})
urlpatterns = [
    path("", include(router.urls)),
    path("<int:conversation_pk>/messages/", messages_list, name="conversation-messages"),
    path("<int:conversation_pk>/messages/<int:pk>/", messages_detail, name="conversation-message-detail"),
]
