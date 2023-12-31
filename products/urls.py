"""."""
from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.home),
    url(r'^simple_list$', views.get_simple_list),
    url(r'^get_product_for_order_helper$', views.get_product_for_order_helper),
    url(r'^get_product_data$', views.get_product_data),
    url(r'^get_products_stdprices$', views.get_products_stdprices),
    url(r'^update_product_stock$', views.update_product_stock),
    url(r'^update_product_purchase_ok$', views.update_product_purchase_ok),
    url(r'^update_product_internal_ref$', views.update_product_internal_ref),
    url(r'^commit_actions_on_product$', views.commit_actions_on_product),
    url(r'^labels_appli_csv(\/?[a-z]*)$', views.labels_appli_csv, name='labels_appli_csv'),
    url(r'^label_print/([0-9]+)/?([0-9\.]*)/?([a-z]*)/?([0-9]*)$', views.label_print),
    url(r'^shelf_labels$', views.shelf_labels), # massive print
    url(r'^destocking$', views.destocking),
    url(r'^get_all_available_products$', views.get_all_available_products),
    url(r'^barcodes$', views.get_all_barcodes),
    url(r'^barcodes_check$', views.barcodes_check),
    url(r'^sales$', views.sales),
]
