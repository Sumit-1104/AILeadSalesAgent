from django.utils import timezone
from rest_framework import serializers
from .models import Conversation, Message

class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = "__all__"
        read_only_fields = ("id", "created_by", "started_at", "last_message_at", "created_at", "updated_at")

class MessageSerializer(serializers.ModelSerializer):
    conversation = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ("id", "created_at")

    def create(self, validated_data):
        view = self.context.get("view")
        conversation_pk = getattr(view, "kwargs", {}).get("conversation_pk")
        if not conversation_pk:
            raise serializers.ValidationError({"conversation": "Conversation URL is required."})
        try:
            conversation = Conversation.objects.get(pk=conversation_pk)
        except Conversation.DoesNotExist:
            raise serializers.ValidationError({"conversation": "Conversation not found."})
        message = Message.objects.create(conversation=conversation, **validated_data)
        Conversation.objects.filter(pk=message.conversation_id).update(last_message_at=message.sent_at or timezone.now())
        return message
