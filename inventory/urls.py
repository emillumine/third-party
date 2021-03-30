"""."""

from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.home),
    url(r'^custom_lists$', views.custom_lists),
    url(r'^delete_custom_list$', views.delete_custom_list),
    url(r'^custom_list_inventory/([0-9]+)$', views.custom_list_inventory),
    url(r'^get_custom_list_data$', views.get_custom_list_data),
    url(r'^inventory_process_state/([0-9]+)$', views.inventory_process_state),
    url(r'^do_custom_list_inventory$', views.do_custom_list_inventory),
    url(r'^generate_inventory_list$', views.generate_inventory_list),
    url(r'^get_credentials$', views.get_credentials),
    url(r'^get_product_categories$', views.get_product_categories),
    url(r'^create_inventory$', views.create_inventory),
    url(r'^update_odoo_stock$', views.update_odoo_stock),
    url(r'^raz_archived_stock$', views.raz_archived_stock),
    url(r'^raz_negative_stock$', views.raz_negative_stock),
    url(r'^raz_not_saleable$', views.raz_not_saleable),
    url(r'^cancel_buggy_pos_sales_waiting_transfer$', views.cancel_buggy_pos_sales_waiting_transfer),
    url(r'^process_pos_sales_waiting_transfer$', views.process_pos_sales_waiting_transfer)
]
