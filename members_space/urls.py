"""."""

from django.conf.urls import  url
from . import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^homepage$', views.home),
    url(r'^my_info$', views.my_info),
    url(r'^my_shifts$', views.my_shifts),
    url(r'^shifts_exchange$', views.shifts_exchange),
    url(r'^no_content$', views.no_content),
    url(r'^get_points_history$', views.get_points_history),
    url('/*$', views.index),
]
