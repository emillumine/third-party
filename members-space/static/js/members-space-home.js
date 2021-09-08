function init_my_shifts_tile() {
    if (incoming_shifts.length === 0) {
        $("#tile_my_services #home_incoming_services").text("Aucun service à venir...")
    } else {
        $("#tile_my_services #home_incoming_services").empty();
        let shift_line_template = $("#shift_line_template");
        
        let cpt = 0;
        for (shift of incoming_shifts) {
            if (cpt === 3) {
                break;
            } else {
                let datetime_shift_start = new Date(shift.date_begin);

                let f_date_shift_start = datetime_shift_start.toLocaleDateString("fr-fr", date_options);
                f_date_shift_start = f_date_shift_start.charAt(0).toUpperCase() + f_date_shift_start.slice(1);
                
                shift_line_template.find(".shift_line_date").text(f_date_shift_start);
                shift_line_template.find(".shift_line_time").text(datetime_shift_start.toLocaleTimeString("fr-fr"));

                $("#tile_my_services #home_incoming_services").append(shift_line_template.html());

                cpt++;
            }
        }
    }
}

function init_home() {
    $("#go_to_calendar_button").on("click", () => {
        goto('echange-de-services');
    });
    $("#home_go_to_shift_history").on("click", () => {
        goto('mes-services');
    });
    
    if (incoming_shifts !== null) {
        init_my_shifts_tile();
    } else {
        load_partner_shifts(partner_data.partner_id)
            .then(init_my_shifts_tile);
    }
}