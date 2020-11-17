"""."""

from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^index/(?P<partner_id>\d+)/(?P<hashed_date>[a-z0-9]+)$', views.home),
    url(r'^get_list_shift_calendar/(?P<partner_id>\d+)/?$', views.get_list_shift_calendar),
    url(r'^get_list_shift_partner/(?P<partner_id>\d+)/?$', views.get_list_shift_partner),

    url(r'^get_test', views.get_test),
#    url(r'^get_list', views.get_list),
    url(r'^change_shift', views.change_shift),
    url(r'^add_shift', views.add_shift),
    url(r'^request_delay', views.request_delay),
    url(r'^reset_members_positive_points', views.reset_members_positive_points)
]
