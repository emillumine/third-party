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
    // $("#go_to_forms").prop("href", "forms_link");
    $("#go_to_forms").on('click', (e) => {
        e.preventDefault();
        goto('faq');
    });

    if (partner_data.is_in_association === false) {
        $("#home .member_associated_partner_area").hide();
    } else {
        if (partner_data.is_associated_people === "True") {
            $(".member_associated_partner").text(partner_data.parent_name);
        } else if (partner_data.associated_partner_id !== "False") {
            $(".member_associated_partner").text(partner_data.associated_partner_name);
        }
    }

    // TODO vérif tile my info avec données binomes + rattrapage et délai

    // Init my info tile
    init_my_info_data();

    if (incoming_shifts !== null) {
        init_my_shifts_tile();
    } else {
        load_partner_shifts(partner_data.concerned_partner_id)
            .then(init_my_shifts_tile);
    }
}