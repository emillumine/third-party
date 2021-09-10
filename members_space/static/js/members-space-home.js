const possible_cooperative_state = {
    suspended: "Suspendu.e",
    exempted: "Exempté.e",
    alert: "En alerte",
    up_to_date: "À jour",
    unsubscribed: "Désinscrit.e",
    delay: "En délai"
}

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
                partner_data.date_delay_stop = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
                
                resolve();
            },
            error: function(data) {
                err = {msg: "erreur serveur lors de la création du délai", ctx: 'request_delay'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'members_space.home');

                closeModal();
                // TODO Notify
                alert('Erreur lors de la création du délai.');
            }
        });
    });
}

function init_my_shifts_tile() {
    if (incoming_shifts.length === 0) {
        $("#home_tile_my_services #home_incoming_services").text("Aucun service à venir...")
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

function init_my_info_tile() {
    $("#home_choose_makeups").off();

    // Status related
    $("#home_tile_my_info #home_member_status")
        .text(possible_cooperative_state[partner_data.cooperative_state])
        .addClass("member_status_" + partner_data.cooperative_state);

    if (partner_data.makeups_to_do > 0) {
        $("#home_choose_makeups").show();
        
        if (
            partner_data.cooperative_state === 'suspended' 
            && partner_data.date_delay_stop === 'False') 
        {
            // If the member is suspended & doesn't have a delay
            $("#home_choose_makeups").on('click', () => {
                // Create 6 month delay
                request_delay()
                    .then(() => {
                        // Then redirect to calendar
                        goto('echange-de-services');
                    })
            });
        } else {
            $("#home_choose_makeups").on('click', () => {
                goto('echange-de-services');
            });
        }
    }

    $("#home_tile_my_info #home_member_shift_name").text(partner_data.regular_shift_name);

    // TODO coop number for attached people ??
    $("#home_tile_my_info #home_member_coop_number").text(partner_data.barcode_base);
}

function init_home() {
    $("#go_to_calendar_button").on("click", () => {
        goto('echange-de-services');
    });
    $("#home_go_to_shift_history").on("click", () => {
        goto('mes-services');
    });

    init_my_info_tile();
    
    if (incoming_shifts !== null) {
        init_my_shifts_tile();
    } else {
        load_partner_shifts(partner_data.partner_id)
            .then(init_my_shifts_tile);
    }
}