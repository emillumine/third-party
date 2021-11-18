"""."""

from django.conf.urls import  url
from . import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^homepage$', views.home),  # These endpoints must be different than in-app url
    url(r'^my_info$', views.my_info),
    url(r'^my_shifts$', views.my_shifts),
    url(r'^shifts_exchange$', views.shifts_exchange),
    url(r'^faq$', views.faq),
    url(r'^no_content$', views.no_content),
    url(r'^get_shifts_history$', views.get_shifts_history),
    url('/*$', views.index),  # Urls unknown from the server will redirect to index
]
