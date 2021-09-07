var test = null;

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
});
