"""."""
from django.conf.urls import url


from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^inventory_backups$', views.inventory_backups),
    url(r'^django_logs$', views.django_logs),
    url(r'^odoo_logs$', views.odoo_logs),
    url(r'^retrieve_inventory_backups$', views.retrieve_inventory_backups),
    url(r'^retrieve_inventory_backup/(.*)', views.retrieve_inventory_backup),
    url(r'^retrieve_django_logs$', views.retrieve_django_logs),
]