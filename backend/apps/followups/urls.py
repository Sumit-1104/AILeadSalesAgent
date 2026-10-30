from django.urls import path
from .views import FollowUpListCreateView, FollowUpDetailView

urlpatterns = [
    path("", FollowUpListCreateView.as_view(), name="followup-list-create"),
    path("<int:pk>/", FollowUpDetailView.as_view(), name="followup-detail"),
]