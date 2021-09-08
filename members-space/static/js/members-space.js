/**
 * Common logic between pages
 */

var base_location = null,
    current_location = null,
    incoming_shifts = null;

var date_options = {weekday: "long", year: "numeric", month: "long", day: "numeric"};

/* - Data */

/**
 * Load the shifts the member is registered to
 * @param {int} partner_id 
 */
function load_partner_shifts(partner_id) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: "/shifts/get_list_shift_partner/" + partner_id,
            data: {
                limit: 3
            },
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                incoming_shifts = data;
                resolve();
            },
            error: function(data) {
                err = {msg: "erreur serveur lors de la récupération des services", ctx: 'load_partner_shifts'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'members-space.index');

                closeModal();
                // TODO Notify
                alert('Erreur lors de la récupération de vos services.');
            }
        });
    });
}

/* - Navigation */

/**
 * 
 * @param {String} page home | mes-infos | mes-services | echange-de-services
 */
 function goto(page) {
    if (window.location.pathname === base_location) {
        history.pushState({}, '', page);
    } else {
        history.replaceState({}, '', page);
    }
    update_dom();
}

/**
 * Define which html content to load from server depending on the window location
 */
function update_dom() {
    $(".nav_item").removeClass('active');

    if (window.location.pathname === base_location || window.location.pathname === base_location + "home") {
        current_location = "home";
        $( "#main_content" ).load( "/members-space/homepage", update_content );
        $("#nav_home").addClass("active");
    } else if (window.location.pathname === base_location + "mes-infos") {
        current_location = "my_info";
        $( "#main_content" ).load( "/members-space/my_info", update_content );
        $("#nav_my_info").addClass("active");
    } else if (window.location.pathname === base_location + "mes-services") {
        current_location = "my_shifts";
        $( "#main_content" ).load( "/members-space/my_shifts", update_content );
        $("#nav_my_shifts").addClass("active");
    } else if (window.location.pathname === base_location + "echange-de-services") {
        current_location = "shifts_exchange";
        $( "#main_content" ).load( "/members-space/shifts_exchange", update_content );
        $("#nav_shifts_exchange").addClass("active");
    } else {
        $( "#main_content" ).load( "/members-space/no_content" );
    }
}

/**
 * Update the data displayed depending on the current location (ex: insert personal data in the DOM when on the 'My Info' page)
 */
 function update_content() {
    switch (current_location) {
        case 'home':
            init_home();
            break;
        case 'my_info':
            init_my_info();
            break;
        case 'my_services':
            init_my_shifts();
            break;
        case 'shifts_exchange':
            init_my_shifts();
            break;
        default:
          console.log(`Bad input`);
      }
}

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    base_location = (app_env === 'dev') ? '/members-space/' : '/';
    update_dom();
});
