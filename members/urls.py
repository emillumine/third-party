"""."""
from django.conf.urls import url


from . import views
from . import admin

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^([0-9\-\ \:]+)$', views.index_date, name='index_date'),
    url(r'^config$', admin.config),
    url(r'^settings$', admin.module_settings),
    url(r'^get_all_shift_templates/$', views.get_all_shift_templates),
    url(r'^shift_template/next_shift/([0-9]+)$',
        views.get_shift_templates_next_shift),
    url(r'^create_from_buffered_data/$', views.create_from_buffered_data),
    url(r'^import_from_csv', views.create_from_csv),
    url(r'^inscriptions/$', views.inscriptions),
    url(r'^inscriptions/([0-9]*)$', views.inscriptions),
    url(r'^prepa-odoo/$', views.prepa_odoo),
    url(r'^validation_inscription/(.+)$', views.validation_inscription),
    url(r'^manage_mess$', admin.manage_mess),
    url(r'^problematic_members$', admin.problematic_members),
    url(r'^remove_member_from_mess_list$', admin.remove_member_from_mess_list),
    url(r'^generate_barcode/([0-9]+)$', admin.generate_barcode),
    url(r'^generate_base_and_barcode/([0-9]+)$', admin.generate_base_and_barcode),
    url(r'^create_envelops$', admin.create_envelops),
    url(r'^raw_search$', admin.raw_search),
    url(r'^coop_warning_msg$', views.coop_warning_msg),
    url(r'^coop_validated_data$', views.coop_validated_data),
    url(r'^latest_coop_id/$', views.latest_coop_id),
    url(r'^get/([0-9]+)$', views.get),
    url(r'^exists/([a-zA-Z0-9_\-\.\+@]+)$', views.exists),
    url(r'^get_couchdb_odoo_markers/(.+)$', views.get_couchdb_odoo_markers),
    url(r'^menu/$', views.menu),
    url(r'^verify_final_state$', views.verify_final_state),
    url(r'^update_couchdb_barcodes$', views.update_couchdb_barcodes),
    #  Borne accueil
    url(r'^search/([^\/.]+)/?([0-9]*)', views.search),
    url(r'^save_photo/([0-9]+)$', views.save_photo, name='save_photo'),
    url(r'^services_at_time/([0-9TZ\-\: \.]+)/([0-9\-]+)$', views.services_at_time),
    url(r'^service_presence/$', views.record_service_presence),
    url(r'^record_absences$', views.record_absences),
    url(r'^close_ftop_service$', views.close_ftop_service),
    url(r'^get_credentials$', views.get_credentials),
    url(r'^remove_data_from_couchdb$', views.remove_data_from_CouchDB),
    url(r'^image/([0-9]+)', views.getmemberimage),
    url(r'^add_pts_to_everybody/([0-9]+)/([a-zA-Z0-9_ ]+)$', admin.add_pts_to_everybody),
    url(r'^easy_validate_shift_presence$', views.easy_validate_shift_presence),
    # conso / groupe recherche / socio
    url(r'^panel_get_purchases$', views.panel_get_purchases),
    # BDM - members admin
    url(r'^admin$', admin.admin),
    url(r'^get_makeups_members$', admin.get_makeups_members),
    url(r'^update_members_makeups$', admin.update_members_makeups),
]
