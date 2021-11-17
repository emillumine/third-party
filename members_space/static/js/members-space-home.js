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
                verif_token: partner_data.verif_token,
                idPartner: partner_data.partner_id,
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

function init_my_shifts_tile() {
    if (incoming_shifts.length === 0) {
        $("#home_tile_my_services #home_incoming_services").text("Aucun service à venir...");
    } else {
        $("#home_tile_my_services #home_incoming_services").empty();

        let cpt = 0;

        for (shift of incoming_shifts) {
            if (cpt === 3) {
                break;
            } else {
                let shift_line_template = prepare_shift_line_template(shift.date_begin);

                $("#home_tile_my_services #home_incoming_services").append(shift_line_template.html());

                cpt++;
            }
        }
    }
}

function init_home() {
    $("#go_to_shifts_calendar").on("click", () => {
        goto('echange-de-services');
    });
    $("#home_go_to_shift_history").on("click", () => {
        goto('mes-services');
    });
    $("#see_more_info_link").on('click', (e) => {
        e.preventDefault();
        goto('mes-infos');
    });
    $("#go_to_forms").prop("href", forms_link);

    // Init my info tile
    init_my_info_data();

    if (incoming_shifts !== null) {
        init_my_shifts_tile();
    } else {
        load_partner_shifts(partner_data.concerned_partner_id)
            .then(init_my_shifts_tile);
    }
}