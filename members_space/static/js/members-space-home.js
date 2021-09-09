const possible_cooperative_state = {
    suspended: "Suspendu.e",
    exempted: "Exempté.e",
    alert: "En alerte",
    up_to_date: "À jour",
    unsubscribed: "Désinscrit.e",
    delay: "En délai"
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

                // Then redirect to calendar
                goto('echange-de-services');
            });
        } else {
            $("#home_choose_makeups").on('click', () => {
                goto('echange-de-services');
            });
        }
    }
    // date_delay_stop : if exists: 2021-09-22 ; else: False

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