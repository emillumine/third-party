"""."""

from django.conf.urls import  url
from . import views
from . import admin

urlpatterns = [
    url(r'^$', views.index),
    url(r'^shelf_view/([0-9]+)$', views.shelf_view),
    url(r'^shelf_inventory/([0-9]+)$', views.shelf_inventory),
    url(r'^inventory_process_state/([0-9]+)$', views.inventory_process_state),
    url(r'^all/?([a-z]*)$', views.all),
    url(r'^get_shelves_extra_data$', views.get_shelves_extra_data),
    url(r'^change_products_shelfs$', views.change_products_shelfs),
    url(r'^(?P<shelf_id>\d+)$', views.shelf_data),
    url(r'^(?P<shelf_id>\d+)/products$', views.products),
    url(r'^(?P<shelf_id>\d+)/add_product$', views.add_product),
    url(r'^(?P<shelf_id>\d+)/set_begin_inventory_datetime$', views.set_begin_inventory_datetime),
    url(r'^do_shelf_inventory$', views.do_shelf_inventory),
    url(r'^(?P<shelf_id>\d+)/last_inventory_report$', views.get_last_inventory_report),
    url(r'^shelf_inventory_FAQ', views.shelf_inventory_FAQ),
    url(r'^sales$', views.sales),
    url(r'^admin$', admin.index),
    url(r'^admin/create$', admin.create),
    url(r'^admin/update$', admin.update),
    url(r'^admin/delete$', admin.delete),
    url(r'^admin/add_products$', admin.add_products),
]
