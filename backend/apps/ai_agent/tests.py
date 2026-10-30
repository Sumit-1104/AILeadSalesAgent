import os
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model

from .services import AIConfigurationError, generate_ai_json


class AIEndpointTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="ai_test_user",
            password="Test-Only-Password-123!",
        )
        self.client = APIClient()

    def test_score_endpoint_requires_authentication(self):
        response = self.client.post(
            "/api/ai/score-lead/", {"lead_id": 1}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_score_endpoint_requires_lead_id(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/ai/score-lead/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_generate_reply_requires_context(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/ai/generate-reply/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class AIServiceTests(SimpleTestCase):
    @patch.dict(os.environ, {"AI_PROVIDER_API_KEY": ""})
    def test_missing_api_key_is_reported(self):
        with self.assertRaises(AIConfigurationError):
            generate_ai_json("Test", {"example": True})
