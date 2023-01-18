$(document).ready(function() {
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

        $(".page_content").show();

        let location = window.location.href.replace(/\/$/, '');

        $('.management_type_button').on('click', function() {
            if (this.id == 'manage_inventory_data') {
                window.location.assign(location + "/inventory_backups");
            } else if (this.id == 'manage_django_logs') {
                window.location.assign(location + "/django_logs");
            } else if (this.id == 'manage_odoo_logs') {
                window.location.assign(location + "/odoo_logs");
            } 
        });
    } else {
        $(".page_content").hide();
    }
});