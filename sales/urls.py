"""."""

from django.conf.urls import  url
from . import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^get_sales$', views.get_sales),

]
