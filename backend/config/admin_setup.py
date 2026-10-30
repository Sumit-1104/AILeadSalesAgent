from django.contrib import admin
from django.apps import apps


def register_all_models():
    """
    Register installed application models in Django Admin.
    Existing registrations are preserved.
    """

    excluded_apps = {
        "admin",
        "contenttypes",
        "sessions",
    }

    for model in apps.get_models():
        app_label = model._meta.app_label

        if app_label in excluded_apps:
            continue

        if admin.site.is_registered(model):
            continue

        fields = [
            field
            for field in model._meta.concrete_fields
            if not field.primary_key
        ]

        list_display = ["__str__"]

        for field in fields:
            if len(list_display) >= 6:
                break

            if field.name not in list_display:
                list_display.append(field.name)

        list_filter = [
            field.name
            for field in fields
            if field.choices and field.name not in {"id"}
        ][:4]

        search_fields = [
            field.name
            for field in fields
            if field.get_internal_type()
            in {"CharField", "TextField", "EmailField"}
        ][:5]

        attrs = {
            "list_display": tuple(list_display),
            "list_per_page": 25,
        }

        if list_filter:
            attrs["list_filter"] = tuple(list_filter)

        if search_fields:
            attrs["search_fields"] = tuple(search_fields)

        model_admin = type(
            f"{model.__name__}AutoAdmin",
            (admin.ModelAdmin,),
            attrs,
        )

        try:
            admin.site.register(model, model_admin)
        except admin.sites.AlreadyRegistered:
            pass