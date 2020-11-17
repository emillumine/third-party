"""."""

from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^deconnect$', views.deconnect),
    url(r'^info_perso$', views.info_perso),
    url(r'^update_info_perso$', views.update_info_perso),
    url(r'^oubli_pass$', views.forgotten_pwd),
    url(r'^change_pwd$', views.change_pwd)
]
