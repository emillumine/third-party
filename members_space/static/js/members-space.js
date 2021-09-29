/**
 * Common logic between pages
 */

var base_location = null,
    current_location = null,
    incoming_shifts = null,
    partner_history = null;

var date_options = {weekday: "long", year: "numeric", month: "long", day: "numeric"};
var time_options = {hour: '2-digit', minute:'2-digit'};

/* - Data */

/**
 * Load the shifts the member is registered to
 * @param {int} partner_id either the members id, or its parent's if s.he's attached
 */
function load_partner_shifts(partner_id) {
    return new Promise((resolve) => {
        $.ajax({
            type: 'GET',
            url: "/shifts/get_list_shift_partner/" + partner_id,
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
                report_JS_error(err, 'members_space.index');

                closeModal();
                // TODO Notify
                alert('Erreur lors de la récupération de vos services.');
            }
        });
    });
}

/* - Navigation */

/**
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
        $("#main_content").load("/members_space/homepage", update_content);
        $("#nav_home").addClass("active");
    } else if (window.location.pathname === base_location + "mes-infos") {
        current_location = "my_info";
        $("#main_content").load("/members_space/my_info", update_content);
        $("#nav_my_info").addClass("active");
    } else if (window.location.pathname === base_location + "mes-services") {
        current_location = "my_shifts";
        $("#main_content").load("/members_space/my_shifts", update_content);
        $("#nav_my_shifts").addClass("active");
    } else if (window.location.pathname === base_location + "echange-de-services") {
        current_location = "shifts_exchange";
        $("#main_content").load("/members_space/shifts_exchange", update_content);
        $("#nav_shifts_exchange").addClass("active");
    } else {
        $("#main_content").load("/members_space/no_content");
    }
}

/**
 * Update the data displayed depending on the current location
 * (ex: insert personal data in the DOM when on the 'My Info' page)
 */
function update_content() {
    switch (current_location) {
    case 'home':
        init_home();
        break;
    case 'my_info':
        init_my_info();
        break;
    case 'my_shifts':
        init_my_shifts();
        break;
    case 'shifts_exchange':
        init_shifts_exchange();
        break;
    default:
        console.log(`Bad input`);
    }
}

/* - Shifts */

/**
 * Prepare a shift line to insert into the DOM.
 * Is used in: Home - My Shifts tile ; My Shifts - Incoming shifts section
 *
 * @param {String} date_begin beginning datetime of the shift
 * @returns JQuery node object of the formatted template
 */
function prepare_shift_line_template(date_begin) {
    let shift_line_template = $("#shift_line_template");
    let datetime_shift_start = new Date(date_begin);

    let f_date_shift_start = datetime_shift_start.toLocaleDateString("fr-fr", date_options);

    f_date_shift_start = f_date_shift_start.charAt(0).toUpperCase() + f_date_shift_start.slice(1);

    shift_line_template.find(".shift_line_date").text(f_date_shift_start);
    shift_line_template.find(".shift_line_time").text(datetime_shift_start.toLocaleTimeString("fr-fr", time_options));

    return shift_line_template;
}

/* - Member info */

/**
 * Init common personal data between screens
 */
function init_my_info_data() {
    $(".choose_makeups").off();
    $(".unsuscribed_form_link").off();

    $(".member_shift_name").text(partner_data.regular_shift_name);

    // Status related
    $(".member_status")
        .text(possible_cooperative_state[partner_data.cooperative_state])
        .addClass("member_status_" + partner_data.cooperative_state);

    if (partner_data.cooperative_state === 'delay' && partner_data.date_delay_stop !== 'False') {
        const d = new Date(Date.parse(partner_data.date_delay_stop));
        const f_date_delay_stop = d.getDate()+'/'+("0" + (d.getMonth() + 1)).slice(-2)+'/'+d.getFullYear();

        $(".delay_date_stop").text(f_date_delay_stop);
        $(".delay_date_stop_container").show();
    } else if (partner_data.cooperative_state === 'unsubscribed') {
        $(".member_shift_name").text('X');

        $(".unsuscribed_form_link")
            .show()
            .attr('href', unsuscribe_form_link)
            .on('click', function() {
                setTimeout(500, () => {
                    $(this).removeClass('active');
                });
            });
    }

    if (partner_data.makeups_to_do > 0 && partner_data.is_associated_people === "False") {
        $(".choose_makeups").show();

        if (
            partner_data.cooperative_state === 'suspended'
            && partner_data.date_delay_stop === 'False') {
            // If the member is suspended & doesn't have a delay
            $(".choose_makeups").on('click', () => {
                // Create 6 month delay
                request_delay()
                    .then(() => {
                        // Then redirect to calendar
                        goto('echange-de-services');
                    });
            });
        } else {
            $(".choose_makeups").on('click', () => {
                goto('echange-de-services');
            });
        }
    }

    $(".member_coop_number").text(partner_data.barcode_base);
}

$(document).ready(function() {
    // TODO essayer de ne charger les js que au besoin

    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    // If partner is associated (attached), display the pair's main partner shift data
    partner_data.concerned_partner_id =
        (partner_data.is_associated_people === "True")
            ? partner_data.parent_id
            : partner_data.partner_id;

    base_location = (app_env === 'dev') ? '/members_space/' : '/';
    update_dom();

    window.onpopstate = function() {
        update_dom();
    };
});
