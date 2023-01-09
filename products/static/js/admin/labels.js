$(document).ready(function() {
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
        $(".page_content").show();
    } else {
    	$(".page_content").hide();
    }
});