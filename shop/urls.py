"""."""

from django.conf.urls import url
from . import views
from . import admin

urlpatterns = [
    url(r'^$', views.index),
    url(r'^get_all_available_bought_products$', views.get_all_available_bought_products),
    url(r'^get_cat_children$', views.get_cat_children),
    url(r'^get_categ_products$', views.get_categ_products),
    url(r'^search_product$', views.search_product),
    url(r'^full_slots$', views.full_slots),
    url(r'^cart_init$', views.cart_init),
    url(r'^cart$', views.cart),
    url(r'^my_orders', views.my_orders),
    url(r'^admin$', admin.index),
    url(r'^admin/print_cart$', admin.print_cart),
    url(r'^admin/delete_cart$', admin.delete_cart),
    url(r'^admin/batch_delete_carts$', admin.batch_delete_carts),
    url(r'^admin/get_shop_settings$', admin.get_shop_settings),
    url(r'^admin/add_shop_closing_date$', admin.add_shop_closing_date),
    url(r'^admin/remove_shop_closing_date$', admin.remove_shop_closing_date),
    url(r'^admin/save_max_orders_ps$', admin.save_max_orders_ps),
    url(r'^admin/save_capital_message$', admin.save_capital_message),
    url(r'^admin/drafts$', admin.drafts),
    url(r'^cart/([0-9a-z]+)/change_date$', views.change_cart_date),
    url(r'^delete_cart$', views.delete_cart),
    url(r'^fusion_carts$', views.fusion_carts),
    url(r'^remove_unused_orders', views.remove_unused_orders),
    url(r'^planning$', views.planning),
    url(r'^log_error$', views.log_browser_error)
]
