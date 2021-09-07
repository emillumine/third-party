"""."""

from django.conf.urls import  url
from . import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^mes-infos$', views.my_info),
]
