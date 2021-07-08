"""."""

from django.conf.urls import  url
from . import views

urlpatterns = [
    url(r'^$', views.index),
    url(r'^export/([0-9]+)', views.export_one),
    url(r'^export/([a-z]+)', views.export_regex),
    url(r'^get_pdf_labels$', views.get_pdf_labels),
    url(r'^print_product_labels$', views.print_product_labels),
    url(r'^helper$', views.helper),
    url(r'^get_suppliers$', views.get_suppliers),
    url(r'^get_supplier_products$', views.get_supplier_products),
    url(r'^associate_supplier_to_product$', views.associate_supplier_to_product),
    url(r'^create_orders$', views.create_orders),
    url(r'^get_orders_attachment$', views.get_orders_attachment),
]
