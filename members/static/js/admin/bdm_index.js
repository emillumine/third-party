$(document).ready(function() {
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

        $(".page_content").show();

        let location = window.location.href;
        $('.management_type_button').on('click', function() {
            if (this.id == 'manage_makeups_button') {
                window.location.assign(location + "/manage_makeups");
            } else if (this.id == 'manage_attached_button') {
            } else if (this.id == 'manage_shifts_button') {
            } else if (this.id == 'manage_leaves_button') {
            }
        });
    } else {
        $(".page_content").hide();
    }
});