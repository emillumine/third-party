var calendar = null;

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

function process_asked_shift_template_change(shift_t_id) {
    var s_data = shift_templates[shift_t_id].data;
    var shift_name = get_shift_name(s_data);
    let msg = 'Inscription au créneau ' + shift_name;

    openModal(
        msg,
        function() {
            setTimeout(openModal, 300); // to show something happened , work in process
            let data = {
                partner_id: parseInt(partner_data.partner_id, 10),
                shift_type: 1, //force to standard
                shift_template_id: shift_t_id,
                unsubscribe_first: true
            };

            $.ajax({
                type: 'POST',
                url: '/members/shift_subscription',
                data: JSON.stringify(data),
                dataType:"json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                success: function(data) {
                    stdata = data.shift_template;
                    partner_data.regular_shift_name = stdata.name;
                    partner_data.shift_type = "standard";
                    init_my_info_data();
                    location.reload();
                },
                error: function(err_data) {
                    if (
                        err_data.status == 409
                        && typeof (err_data.responseJSON) != "undefined"
                        && err_data.responseJSON.code === "makeup_found"
                    ) {
                        let modal_template = $("#modal_error_change_shift_template");

                        modal_template.find(".shift_template_name").text(shift_template_name);

                        closeModal();
                        openModal(
                            modal_template.html(),
                            () => {},
                            "Compris !",
                            true,
                            false
                        );
                    } else {
                        err = {
                            msg: "erreur serveur lors de l'inscription du membre au créneau",
                            ctx: 'members_space.shift_subscrition'
                        };
                        report_JS_error(err, 'members_space');
                        closeModal();

                        $.notify("Une erreur est survenue lors de l'inscription au créneau.", {
                            globalPosition:"top right",
                            className: "error"
                        });
                    }
                }
            });

        },
        'Valider',
        true, // modal closes after validation
        true,
        edit_shift_template_registration // on cancel , reload calendar
    );
}

function edit_shift_template_registration() {
    const calendar_params = {external: true, without_modal: true, shift_listener: true};
    $('#modal-calendar-choice tbody').empty();
    calendar = $('#modal-calendar-choice').clone();
    
    calendar.find('.oddeven_selector').empty();
    displayMsg(calendar.html());
    $('#week_types').find('input')
        .change(() => {
            filter_weeks(calendar_params);
        });
    retrieve_and_draw_shift_tempates(calendar_params);


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

    $(document).off("click.change_shift_reg");
    $(document).on("click.change_shift_reg", ".member_shift_name_area .fa-edit", (e) => {
        $('#week_types').find('input')
            .change(filter_weeks);
        e.preventDefault();
        edit_shift_template_registration();
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
    
    display_messages_for_service_exchange_24h_before();
}