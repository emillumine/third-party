"""."""

from django.conf.urls import  url
from . import views

urlpatterns = [
    url(r'^$', views.home),
    url(r'^get_list_orders', views.get_list_orders),
    url(r'^produits/([0-9]+)$', views.produits),
    url('^get_order_lines/([0-9]+)$', views.get_order_lines),
    url('^get_orders_lines', views.get_orders_lines),
    url(r'^data_validation', views.data_validation),
    url(r'^update_orders', views.update_orders),
    url(r'^save_error_report', views.save_error_report),
    url(r'^reception_FAQ', views.reception_FAQ),
    url(r'^reception_qtiesValidated', views.reception_qtiesValidated),
    url(r'^reception_pricesValidated', views.reception_pricesValidated),
    # url(r'^update_order_status/([0-9]+)$', views.tmp_update_order_status),
    url(r'^po_process_picking$', views.po_process_picking),
    url(r'^save_order_group$', views.save_order_group) 
]
