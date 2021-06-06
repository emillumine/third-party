"""outils URL Configuration.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""
from django.conf.urls import include, url
from django.views.generic import RedirectView
from . import views
from . import monitor
from .views import FieldsView
from .views import ExportCompta
from .views import ExportPOS


urlpatterns = [
    url('^$', RedirectView.as_view(url='/members/inscriptions/2')),
    url(r'^data/(.*)', views.data),
    url(r'^log_js_error$', views.log_js_error),
    url(r'^test_compta$', views.test_compta),
    url(r'^fields/', FieldsView.as_view(), name='object fields'),
    url(r'^entity/example$', views.entity_example, name='entity example'),
    url(r'^export_compta$', ExportCompta.as_view(), name='export_compta'),
    url(r'^export_pos$', ExportPOS.as_view(), name='Export POS'),
    url(r'^monitor/$', monitor.index),
    url(r'^monitor/js_errors$', monitor.js_errors),
    url(r'^members/', include('members.urls')),
    url(r'^shifts/', include('shifts.urls')),
    url(r'^reception/', include('reception.urls')),
    url(r'^stock/', include('stock.urls')),
    url(r'^inventory/', include('inventory.urls')),
    url(r'^products/', include('products.urls')),
    url(r'^envelops/', include('envelops.urls')),
    url(r'^orders/', include('orders.urls')),
    url(r'^website/', include('website.urls')),
    url(r'^shop/', include('shop.urls')),
    url(r'^shelfs/', include('shelfs.urls')),
    url(r'^sales/', include('sales.urls')),
]

try:
    urlpatterns.append(url(r'^tests/', include('tests.urls')))
except:
    pass
