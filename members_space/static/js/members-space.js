/**
 * Common logic between pages
 */

var base_location = null,
    current_location = null,
    incoming_shifts = null,
    partner_history = null;

var date_options = {weekday: "long", year: "numeric", month: "long", day: "numeric"};
var time_options = {hour: '2-digit', minute:'2-digit'};

const possible_cooperative_state = {
    suspended: "Rattrapage",
    exempted: "Exempté.e",
    alert: "En alerte",
    up_to_date: "À jour",
    unsubscribed: "Désinscrit.e des créneaux",
    delay: "En délai",
    gone: "Parti.e"
};

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
 * @param {String} page home | mes-infos | mes-services | echange-de-services | faq
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
 *
 * WARNING: For the routing system to work,
 *          public urls (those the users will see & navigate to) must be different than the server urls used to fetch resources
 * (ex: public url: /members_space/mes-info ; server url: /members_space/my_info)
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
    } else if (window.location.pathname === base_location + "faq") {
        current_location = "faq";
        $("#main_content").load("/members_space/faqBDM", update_content);
        $("#nav_faq").addClass("active");
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
    case 'faq':
        init_faq();
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
 * Request a 6 month delay
 */
function request_delay() {
    return new Promise((resolve) => {
        let today = new Date();

        const delay_start = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

        let today_plus_six_month = new Date();

        today_plus_six_month.setMonth(today_plus_six_month.getMonth()+6);
        const diff_time = Math.abs(today_plus_six_month - today);
        const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

        $.ajax({
            type: 'POST',
            url: "/shifts/request_delay",
            dataType:"json",
            data: {
                verif_token: (partner_data.is_associated_people === "True") ? partner_data.parent_verif_token : partner_data.verif_token,
                idPartner: partner_data.concerned_partner_id,
                start_date: delay_start,
                duration: diff_days
            },
            success: function() {
                partner_data.cooperative_state = 'delay';
                partner_data.date_delay_stop = today_plus_six_month.getFullYear()+'-'+(today_plus_six_month.getMonth()+1)+'-'+today_plus_six_month.getDate();

                resolve();
            },
            error: function(data) {
                if (data.status == 403
                        && typeof data.responseJSON != 'undefined'
                        && data.responseJSON.message === "delays limit reached") {
                    closeModal();

                    let msg_template = $("#cant_have_delay_msg_template");

                    openModal(
                        msg_template.html(),
                        () => {
                            window.location =member_cant_have_delay_form_link;
                        },
                        "J'accède au formulaire",
                        true,
                        false
                    );
                } else {
                    err = {msg: "erreur serveur lors de la création du délai", ctx: 'request_delay'};
                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                        err.msg += ' : ' + data.responseJSON.error;
                    }
                    report_JS_error(err, 'members_space.home');

                    closeModal();
                    alert('Erreur lors de la création du délai.');
                }

            }
        });
    });
}

/**
 * Prepare a shift line to insert into the DOM.
 * Is used in: Home - My Shifts tile ; My Shifts - Incoming shifts section
 *
 * @param {String} date_begin beginning datetime of the shift
 * @returns JQuery node object of the formatted template
 */
function prepare_shift_line_template(date_begin) {
    let shift_line_template = $("#shift_line_template");
    let datetime_shift_start = new Date(date_begin.replace(/\s/, 'T'));

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
    $(".choose_makeups").hide();
    $(".remove_future_registration").off();
    $(".remove_future_registration").hide();
    $(".unsuscribed_form_link").off();
    $(".unsuscribed_form_link").hide();

    $(".member_shift_name").text(partner_data.regular_shift_name);

    let pns = partner_data.name.split(" - ");
    let name = pns.length > 1 ? pns[1] : pns[0];

    $(".member_name").text(name);

    // Status related
    $(".member_status")
        .text(possible_cooperative_state[partner_data.cooperative_state])
        .addClass("member_status_" + partner_data.cooperative_state);

    if (partner_data.cooperative_state === 'delay' && partner_data.date_delay_stop !== 'False') {
        const d = new Date(Date.parse(partner_data.date_delay_stop));
        const f_date_delay_stop = d.getDate()+'/'+("0" + (d.getMonth() + 1)).slice(-2)+'/'+d.getFullYear();

        $(".delay_date_stop").text(f_date_delay_stop);
        $(".delay_date_stop_container").show();
    } else if (partner_data.cooperative_state === 'unsubscribed' || partner_data.cooperative_state === 'gone') {
        $(".member_shift_name").text('X');

        $(".unsuscribed_form_link")
            .show()
            .attr('href', unsuscribe_form_link)
            .on('click', function() {
                setTimeout(500, () => {
                    $(this).removeClass('active');
                });
            });
    } else if (partner_data.cooperative_state === 'exempted') {
        const d = new Date(Date.parse(partner_data.leave_stop_date));
        const f_date_delay_stop = d.getDate()+'/'+("0" + (d.getMonth() + 1)).slice(-2)+'/'+d.getFullYear();

        $(".delay_date_stop").text(f_date_delay_stop);
        $(".delay_date_stop_container").show();
    }

    if (
        partner_data.makeups_to_do > 0
        && partner_data.cooperative_state !== 'unsubscribed'
    ) {
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

    if (partner_data.extra_shift_done > 0) {
        $(".remove_future_registration").show();
        $(".remove_future_registration").on('click', () => {
            goto('echange-de-services');
        });
    }

    $(".member_coop_number").text(partner_data.barcode_base);
}

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    // If partner is associated (attached), display the pair's main partner shift data
    partner_data.concerned_partner_id =
        (partner_data.is_associated_people === "True")
            ? partner_data.parent_id
            : partner_data.partner_id;

    partner_data.is_in_association =
        partner_data.is_associated_people === "True" || partner_data.associated_partner_id !== "False";

    // For associated people, their parent name is attached in their display name
    let partner_name_split = partner_data.name.split(', ');

    partner_data.name = partner_name_split[partner_name_split.length - 1];

    base_location = (app_env === 'dev') ? '/members_space/' : '/';
    update_dom();

    window.onpopstate = function() {
        update_dom();
    };
});

(function($, sr) {
    // debouncing function from John Hann
    // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
    var debounce = function (func, threshold, execAsap) {
        var timeout = null;

        return function debounced () {
            var obj = this, args = arguments;

            function delayed () {
                if (!execAsap)
                    func.apply(obj, args);
                timeout = null;
            }

            if (timeout)
                clearTimeout(timeout);
            else if (execAsap)
                func.apply(obj, args);

            timeout = setTimeout(delayed, threshold || 100);
        };
    };
    // smartresize

    jQuery.fn[sr] = function(fn) {
        return fn ? this.bind('resize', debounce(fn)) : this.trigger(sr);
    };

})(jQuery, 'smartresize');

function display_messages_for_service_exchange_24h_before() {
    if (block_service_exchange_24h_before === "False") {
        $(".free_service_exchange").show(); 
    } else {
        $(".block_service_exchange").show();
    }
};
