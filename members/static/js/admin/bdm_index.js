$(document).ready(function() {
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

        $(".page_content").show();

        let location = window.location.href.replace(/\/$/, '');

        $('.management_type_button').on('click', function() {
            if (this.id == 'manage_makeups_button') {
                window.location.assign(location + "/manage_makeups");
            } else if (this.id == 'manage_shift_registrations_button') {
                window.location.assign(location + "/manage_shift_registrations");
            } else if (this.id == 'manage_attached_button') {
                window.location.assign(location + "/manage_attached");
            } else if (this.id == 'manage_attached_delete_pair_button') {
                window.location.assign(location + "/delete_pair");
            } else if (this.id == 'manage_attached_create_pair_button') {
                window.location.assign(location + "/create_pair");
            } else if (this.id == 'manage_leaves_button') {
                console.log('coming soon...');
            } else if (this.id == 'manage_regular_shifts_button') {
                window.location.assign(location + "/manage_regular_shifts");
            }
        });
    } else {
        $(".page_content").hide();
    }
});