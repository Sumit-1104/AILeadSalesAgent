
from django.urls import path

from .views import (
    AssistantConfigurationView,
    GenerateReplyView,
    QualifyLeadView,
    ScoreLeadView,
    SuggestFollowupView,
)

app_name = "ai_agent"

urlpatterns = [
    path("score-lead/", ScoreLeadView.as_view(), name="score-lead"),
    path("qualify-lead/", QualifyLeadView.as_view(), name="qualify-lead"),
    path("generate-reply/", GenerateReplyView.as_view(), name="generate-reply"),
    path("suggest-followup/", SuggestFollowupView.as_view(), name="suggest-followup"),
    path(
        "assistant/configuration/",
        AssistantConfigurationView.as_view(),
        name="assistant-configuration",
    ),
]
