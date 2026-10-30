from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("api/integrations/", include("apps.integrations.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/ai/", include("apps.ai_agent.urls")),
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/leads/", include("apps.leads.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/customers/", include("apps.customers.urls")),
    path("api/followups/", include("apps.followups.urls")),
    path("api/conversations/", include("apps.conversations.urls")),
    path("api/appointments/", include("apps.appointments.urls")),
    path("api/quotations/", include("apps.quotations.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]
