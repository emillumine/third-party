"""."""

from django.conf.urls import  url
from . import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^export/([0-9]+)', views.export_one),
    url(r'^export/([a-z]+)', views.export_regex),
    url(r'^get_pdf_labels$', views.get_pdf_labels),
    url(r'^print_product_labels$', views.print_product_labels)
]
