"""."""
from django.conf.urls import url


from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^django_logs$', views.django_logs, name='index'),
    url(r'^odoo_logs$', views.odoo_logs, name='index'),
    url(r'^retrieve_django_logs$', views.retrieve_django_logs, name='index'),
]