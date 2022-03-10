var calendar = null,
    selected_shift = null,
    vw = null;

/* - Logic */

/**
 * A partner can exchange shifts if:
 *  - s.he doesn't have to choose a makeup shift
 *  - s.he's not an associated partner
 *  - s.he's is an associated partner who is not blocked in his actions
 * @returns boolean
 */
function can_exchange_shifts() {
    return partner_data.makeups_to_do == 0 && (partner_data.is_associated_people === "False" || (partner_data.is_associated_people === "True" && block_actions_for_attached_people === "False"));
}

/**
 * A partner should select a shift if:
 *  - s.he has makeups to do
 *  - s.he's not an associated partner
 * @returns boolean
 */
function should_select_makeup() {
    return partner_data.makeups_to_do > 0 || (partner_data.makeups_to_do > 0 && partner_data.is_associated_people === "True" && block_actions_for_attached_people === "False");
}

/* - Server requests */

/**
 * Proceed to shift exchange or registration
 * @param {int} new_shift_id
 */
function add_or_change_shift(new_shift_id) {
    if (is_time_to('change_shift')) {
        setTimeout(openModal, 100); // loading on

        if (partner_data.is_associated_people === "False") {
            tData = 'idNewShift=' + new_shift_id
                +'&idPartner=' + partner_data.partner_id
                + '&shift_type=' + partner_data.shift_type
                + '&verif_token=' + partner_data.verif_token;
        } else if (partner_data.is_associated_people === "True" && block_actions_for_attached_people === "False") {
            tData = 'idNewShift=' + new_shift_id
                +'&idPartner=' + partner_data.parent_id
                + '&shift_type=' + partner_data.shift_type
                + '&verif_token=' + partner_data.parent_verif_token;
        } else {
            return false;
        }

        if (selected_shift === null) {
            tUrl = '/shifts/add_shift';
        } else {
            tUrl = '/shifts/change_shift';
            tData = tData + '&idOldShift='+ selected_shift.shift_id[0] +'&idRegister=' + selected_shift.id;
        }

        $.ajax({
            type: 'POST',
            url: tUrl,
            dataType:"json",
            data: tData,
            timeout: 3000,
            success: function(data) {
                if (data.result) {
                    // Decrement makeups to do if needed
                    if (partner_data.makeups_to_do > 0) {
                        partner_data.makeups_to_do = parseInt(partner_data.makeups_to_do, 10) - 1;

                        if (partner_data.makeups_to_do === 0) {
                            $("#need_to_select_makeups_message").hide();
                        } else {
                            $(".makeups_nb").text(partner_data.makeups_to_do);
                        }
                    }

                    let msg = "Parfait! ";

                    msg += (selected_shift === null)
                        ? "Le service choisi a été ajouté."
                        : "Le service a été échangé.";

                    selected_shift = null;

                    // Refetch partner shifts list & update DOM
                    load_partner_shifts(partner_data.concerned_partner_id)
                        .then(() => {
                            init_shifts_list();
                            closeModal();

                            setTimeout(() => {


                                alert(msg);
                            }, 100);
                        });

                    // Redraw calendar
                    calendar.refetchEvents();
                } else {
                    closeModal();
                    selected_shift = null;
                    alert(`Une erreur est survenue. ` +
                        `Il est néanmoins possible que la requête ait abouti, ` +
                        `veuillez patienter quelques secondes puis vérifier vos services enregistrés.`);

                    // Refectch shifts anyway, if registration/exchange was still succesful
                    setTimeout(() => {
                        load_partner_shifts(partner_data.concerned_partner_id)
                            .then(init_shifts_list);
                    }, 300);
                }
            },
            error: function(error) {
                closeModal();
                selected_shift = null;

                if (error.status === 400 && 'msg' in error.responseJSON && error.responseJSON.msg === "Old service in less than 24hours.") {
                    alert(`Désolé ! Le service que tu souhaites échanger démarre dans moins de 24h. ` +
                        `Afin de faciliter la logistique des services, il n'est plus possible de l'échanger. ` +
                        `Si tu ne peux vraiment pas venir, tu seras noté.e absent.e à ton service. ` +
                        `Tu devras alors sélectionner un service de rattrapage sur ton espace membre.`);
                } else if (error.status === 500 && 'msg' in error.responseJSON && error.responseJSON.msg === "Fail to create shift") {
                    // TODO differentiate error cases!
                    alert(`Une erreur est survenue. ` +
                        `Il est néanmoins possible que la requête ait abouti, ` +
                        `veuillez patienter quelques secondes puis vérifier vos services enregistrés.`);
                } else if (error.status === 400 && 'msg' in error.responseJSON && error.responseJSON.msg === "Bad arguments") {
                    alert(`Une erreur est survenue. ` +
                        `Il est néanmoins possible que la requête ait abouti, ` +
                        `veuillez patienter quelques secondes puis vérifier vos services enregistrés.`);
                } else {
                    alert(`Une erreur est survenue. ` +
                        `Il est néanmoins possible que la requête ait abouti, ` +
                        `veuillez patienter quelques secondes puis vérifier vos services enregistrés.`);
                }

                // Refectch shifts anyway, if registration/exchange was still succesful
                setTimeout(() => {
                    load_partner_shifts(partner_data.concerned_partner_id)
                        .then(init_shifts_list);
                }, 300);
            }
        });
    }

    return null;
}

/**
 * Send request to delete (cancel) a shift registration.
 * @param {Int} shift_registration_id shift registration to cancel
 */
function delete_shift_registration(shift_registration_id) {
    if (is_time_to('delete_shift_registration')) {
        openModal();

        tData = 'idPartner=' + partner_data.concerned_partner_id
                + '&idRegister=' + shift_registration_id
                + '&extra_shift_done=' + partner_data.extra_shift_done;

        if (partner_data.is_associated_people === "False") {
            tData += '&verif_token=' + partner_data.verif_token;
        } else if (partner_data.is_associated_people === "True" && block_actions_for_attached_people === "False") {
            tData += '&verif_token=' + partner_data.parent_verif_token;
        } else {
            return false;
        }

        $.ajax({
            type: 'POST',
            url: "/shifts/cancel_shift",
            dataType:"json",
            data: tData,
            timeout: 3000,
            success: function() {
                partner_data.extra_shift_done -= 1;

                // Refetch partner shifts list & update DOM
                load_partner_shifts(partner_data.concerned_partner_id)
                    .then(() => {
                        init_shifts_list();

                        if (partner_data.extra_shift_done > 0) {
                            $(".extra_shift_done").text(partner_data.extra_shift_done);
                            init_delete_registration_buttons();
                        } else {
                            $("#can_delete_future_registrations_area").hide();
                            $(".delete_registration_button").off();
                            $(".delete_registration_button").hide();
                        }

                        closeModal();

                        setTimeout(() => {
                            alert("La présence a bien été annulée !");
                        }, 100);
                    });

                // Redraw calendar
                calendar.refetchEvents();
            },
            error: function() {
                closeModal();
                alert("Une erreur est survenue.");
            }
        });
    }

    return null;
}

/**
 * Proceed affecting a shift registration to a/both member(s) of a pair
 * @param {string} partner
 * @param {string} shift_id
 */
function affect_shift(partner, shift_id) {
    if (is_time_to('affect_shift')) {
        tData = 'idShiftRegistration=' + shift_id
            +'&idPartner=' + partner_data.partner_id
            + '&affected_partner=' + partner
            + '&verif_token=' + partner_data.verif_token;

        tUrl = '/shifts/affect_shift';

        $.ajax({
            type: 'POST',
            url: tUrl,
            dataType:"json",
            data: tData,
            timeout: 3000,
            success: function() {
                load_partner_shifts(partner_data.concerned_partner_id)
                    .then(() => {
                        init_shifts_list();
                        modal.find(".btn-modal-ok").show();
                        closeModal();
                    });
            },
            error: function() {
                init_shifts_list();
                modal.find(".btn-modal-ok").show();
                closeModal();

                alert(`Une erreur est survenue. ` +
                    `Il est néanmoins possible que la requête ait abouti, ` +
                    `veuillez patienter quelques secondes puis vérifier vos services enregistrés.`);
            }
        });
    }
}

/**
 * Reset a member extra_shift_done to 0
 */
function offer_extra_shift() {
    if (is_time_to('offer_extra_shift')) {
        openModal();

        $.ajax({
            type: 'POST',
            url: "/members_space/offer_extra_shift",
            dataType:"json",
            data: {
                partner_id: partner_data.concerned_partner_id
            },
            timeout: 3000,
            success: function() {
                $("#can_delete_future_registrations_area").hide();
                $(".delete_registration_button").off();
                $(".delete_registration_button").hide();

                closeModal();
                alert("Don de service effectué");
            },
            error: function() {
                closeModal();
                alert("Une erreur est survenue");
            }
        });
    }
}

/* - DOM */

function init_shifts_list() {
    $(".loading-incoming-shifts").hide();
    $("#shifts_list").show();

    if (incoming_shifts.length === 0) {
        $("#shifts_list").text("Aucun service à venir...");
    } else {
        $("#shifts_list").empty();

        for (let shift of incoming_shifts) {
            let shift_line_template = $("#selectable_shift_line_template");
            let datetime_shift_start = new Date(shift.date_begin.replace(/\s/, 'T'));

            let f_date_shift_start = datetime_shift_start.toLocaleDateString("fr-fr", date_options);

            f_date_shift_start = f_date_shift_start.charAt(0).toUpperCase() + f_date_shift_start.slice(1);

            shift_line_template.find(".shift_line_date").text(f_date_shift_start);
            shift_line_template.find(".shift_line_time").text(datetime_shift_start.toLocaleTimeString("fr-fr", time_options));

            // Disable or not
            shift_line_template.find(".selectable_shift_line").removeClass("btn--primary");
            shift_line_template.find(".selectable_shift_line").removeClass("btn");
            shift_line_template.find(".selectable_shift_line").removeClass("btn--warning");
            if (!can_exchange_shifts() && block_actions_for_attached_people === "True") {
                shift_line_template.find(".selectable_shift_line").addClass("btn");
                shift_line_template.find(".checkbox").prop("disabled", "disabled");
            } else {
                if (shift.is_makeup==true) {
                    shift_line_template.find(".selectable_shift_line").addClass("btn--warning");
                    shift_line_template.find(".checkbox").prop("disabled", false);
                    shift_line_template.find(".checkbox").prop("value", shift.id);
                } else {
                    shift_line_template.find(".selectable_shift_line").addClass("btn--primary");
                    shift_line_template.find(".checkbox").prop("disabled", false);
                    shift_line_template.find(".checkbox").prop("value", shift.id);
                }
            }
            // Set assign shift button
            if (partner_data.associated_partner_id === "False" && partner_data.parent_id === "False") {
                shift_line_template.find('.affect_associate_registered').hide();
            } else {
                shift_line_template.find('.affect_associate_registered').closest(".shift_line_container")
                    .attr('id', 'shift_id_'+shift.id);
                if (shift.associate_registered==="both") {
                    shift_line_template.find('.affect_associate_registered').text("Les deux");
                } else if (shift.associate_registered==="partner") {
                    if (partner_data.associated_partner_id !== "False") {
                        shift_line_template.find('.affect_associate_registered').text(partner_data.name);
                    } else {
                        shift_line_template.find('.affect_associate_registered').text(partner_data.parent_name);
                    }

                } else if (shift.associate_registered==="associate") {
                    if (partner_data.associated_partner_id !== "False") {
                        shift_line_template.find('.affect_associate_registered').text(partner_data.associated_partner_name);
                    } else {
                        shift_line_template.find('.affect_associate_registered').text(partner_data.name);
                    }
                } else {
                    shift_line_template.find('.affect_associate_registered').text("A déterminer");
                }
            }

            // Set delete registration button if shift isn't a makeup
            if (partner_data.extra_shift_done > 0 && shift.is_makeup === false) {
                if (shift_line_template.find(".delete_registration_button").length === 0) {
                    let delete_reg_button_template = $("#delete_registration_button_template");

                    shift_line_template.find(".shift_line_container").append(delete_reg_button_template.html());
                }
            } else {
                shift_line_template.find(".delete_registration_button").remove();
            }

            $("#shifts_list").append(shift_line_template.html());
        }

        $(".selectable_shift_line").on("click", function(e) {
            if (can_exchange_shifts()) {
                let cb = $(this).find(".checkbox");

                // Select checkbox on click on button
                if (!$(e.target).hasClass("checkbox")) {
                    cb.prop("checked", !cb.prop("checked"));
                }

                if (cb.prop("checked")) {
                    selected_shift = incoming_shifts.find(s => s.id == cb.prop("value"));
                } else {
                    selected_shift = null;
                }

                // Unselect other checkboxes
                if ($(this).find(".checkbox")
                    .prop("checked")) {
                    for (let cb_item of $("#shifts_list").find(".checkbox")) {
                        if (cb.prop("value") !== $(cb_item).prop("value")) {
                            $(cb_item).prop("checked", false);
                        }
                    }
                }
            }
        });

        $(".affect_associate_registered").on("click", function() {
            // Display modal
            let id = $(this).closest(".shift_line_container")
                .attr('id')
                .split('_')[2];
            let modal_template = $("#modal_affect_shift");

            if (partner_data.associated_partner_id != "False") {
                modal_template.find("#shift_partner").text(partner_data.name);
                modal_template.find("#shift_associate").text(partner_data.associated_partner_name);

            } else {
                modal_template.find("#shift_partner").text(partner_data.name);
                modal_template.find("#shift_associate").text(partner_data.parent_name);
            }

            openModal(
                modal_template.html(),
                () => {
                    modal.find(".btn-modal-ok").show();
                },
                "Valider", true, true,
                () => {
                    modal.find(".btn-modal-ok").show();
                }
            );

            modal.find('#shift_partner').on("click", function() {
                affect_shift("partner", id);
            });
            modal.find('#shift_associate').on("click", function() {
                affect_shift("associate", id);
            });
            modal.find('#shift_both').on("click", function() {
                affect_shift("both", id);
            });

            modal.find(".btn-modal-ok").hide();
        });
    }
}

/**
 * Inits the page when the calendar is displayed
 */
function init_calendar_page() {
    let template_explanations = $("#calendar_explaination_template");

    if (vw <= 992) {
        $(".loading-calendar").show();

        $("#calendar_explaination_area").hide();
        $("#calendar_explaination_button").on("click", () => {
            openModal(
                template_explanations.html(),
                closeModal,
                "J'ai compris"
            );
        })
            .show();
    } else {
        $("#calendar_explaination_button").hide();
        $("#calendar_explaination_area").html(template_explanations.html())
            .show();
    }

    if (incoming_shifts !== null) {
        init_shifts_list();
    } else {
        load_partner_shifts(partner_data.concerned_partner_id)
            .then(init_shifts_list);
    }

    if (should_select_makeup()) {
        $(".makeups_nb").text(partner_data.makeups_to_do);
        $("#need_to_select_makeups_message").show();
    }

    if (partner_data.extra_shift_done > 0) {
        $(".extra_shift_done").text(partner_data.extra_shift_done);
        $("#can_delete_future_registrations_area").show();

        $("#offer_extra_shift").on("click", () => {
            openModal(
                "<p>Je ne souhaite pas supprimer un service futur.</p>",
                offer_extra_shift,
                "Confirmer",
                false
            );
        });

        $("#delete_future_registration").on("click", init_delete_registration_buttons);
    }

    let default_initial_view = "";
    let header_toolbar = {};

    if (vw <= 768) {
        default_initial_view = 'listWeek';
        header_toolbar = {
            left: 'title',
            center: 'listWeek,timeGridDay',
            right: 'prev,next today'
        };
    } else if (vw <=992) {
        default_initial_view = 'listWeek';
        header_toolbar = {
            left: 'title',
            center: 'dayGridMonth,listWeek,timeGridDay',
            right: 'prev,next today'
        };
    } else {
        default_initial_view = 'dayGridMonth';
        header_toolbar = {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek,timeGridDay'
        };
    }

    const hidden_days = days_to_hide.length > 0 ? $.map(days_to_hide.split(", "), Number) : [];

    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'fr',
        initialView: default_initial_view,
        headerToolbar: header_toolbar,
        buttonText: {
            list: "Semaine"
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit'
        },
        allDaySlot: false,
        contentHeight: "auto",
        eventDisplay: "block",
        hiddenDays: hidden_days,
        events: '/shifts/get_list_shift_calendar/' + partner_data.concerned_partner_id,
        eventClick: function(info) {
            if (!$(info.el).hasClass("shift_booked") && !$(info.el).hasClass("shift_booked_makeup")) {
                const new_shift_id = info.event.id;

                // Set new shift
                const datetime_new_shift = info.event.start;
                let new_shift_date = datetime_new_shift.toLocaleDateString("fr-fr", date_options);
                let new_shift_time = datetime_new_shift.toLocaleTimeString("fr-fr", time_options);

                if (selected_shift !== null && can_exchange_shifts()) {
                    /* shift exchange */
                    // Set old shift
                    let datetime_old_shift = new Date(selected_shift.date_begin);
                    let old_shift_date = datetime_old_shift.toLocaleDateString("fr-fr", date_options);
                    let old_shift_time = datetime_old_shift.toLocaleTimeString("fr-fr", time_options);

                    // Display modal
                    let modal_template = $("#modal_shift_exchange_template");

                    modal_template.find(".date_old_shift").text(old_shift_date);
                    modal_template.find(".time_old_shift").text(old_shift_time);
                    modal_template.find(".date_new_shift").text(new_shift_date);
                    modal_template.find(".time_new_shift").text(new_shift_time);

                    openModal(
                        modal_template.html(),
                        () => {
                            add_or_change_shift(new_shift_id);
                        },
                        "Valider"
                    );
                } else if (selected_shift === null && can_exchange_shifts()) {
                    /* could exchange shift but no old shift selected */
                    openModal(
                        "Je dois sélectionner un service à échanger.",
                        closeModal,
                        "J'ai compris"
                    );
                } else if (should_select_makeup()) {
                    /* choose a makeup service */
                    // Check if selected new shift is in less than 6 months
                    if (partner_data.date_delay_stop !== 'False') {
                        date_partner_delay_stop = new Date(partner_data.date_delay_stop);
                        if (datetime_new_shift > date_partner_delay_stop) {
                            let msg = `Vous avez jusqu'au ${date_partner_delay_stop.toLocaleDateString("fr-fr", date_options)} ` +
                                        `pour sélectionner un rattrapage (soit une période de 6 mois depuis votre absence).`;

                            alert(msg);

                            return;
                        }
                    }
                    let modal_template = $("#modal_add_shift_template");

                    modal_template.find(".date_new_shift").text(new_shift_date);
                    modal_template.find(".time_new_shift").text(new_shift_time);

                    openModal(
                        modal_template.html(),
                        () => {
                            add_or_change_shift(new_shift_id);
                        },
                        "Valider"
                    );
                }
            }
        },
        eventDidMount: function() {
            // Calendar is hidden at first on mobile to hide header change when data is loaded
            $(".loading-calendar").hide();
            $("#calendar").show();

            if (vw <= 992) {
                $(".fc .fc-header-toolbar").addClass("resp-header-toolbar");
            } else {
                $(".fc .fc-header-toolbar").removeClass("resp-header-toolbar");
            }
        }
    });

    calendar.render();
}

function init_read_only_calendar_page() {
    let template_explanations = $("#calendar_explaination_template");

    if (vw <= 992) {
        $(".loading-calendar").show();

        $("#calendar_explaination_area").hide();
        $("#calendar_explaination_button").on("click", () => {
            openModal(
                template_explanations.html(),
                closeModal,
                "J'ai compris"
            );
        })
            .show();
    } else {
        $("#calendar_explaination_button").hide();
        $("#calendar_explaination_area").html(template_explanations.html())
            .show();
    }

    if (incoming_shifts !== null) {
        init_shifts_list();
    } else {
        load_partner_shifts(partner_data.concerned_partner_id)
            .then(init_shifts_list);
    }

    if (should_select_makeup()) {
        $(".makeups_nb").text(partner_data.makeups_to_do);
        $("#need_to_select_makeups_message").show();
    }

    let default_initial_view = "";
    let header_toolbar = {};

    if (vw <= 768) {
        default_initial_view = 'listWeek';
        header_toolbar = {
            left: 'title',
            center: 'listWeek,timeGridDay',
            right: 'prev,next today'
        };
    } else if (vw <=992) {
        default_initial_view = 'listWeek';
        header_toolbar = {
            left: 'title',
            center: 'dayGridMonth,listWeek,timeGridDay',
            right: 'prev,next today'
        };
    } else {
        default_initial_view = 'dayGridMonth';
        header_toolbar = {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek,timeGridDay'
        };
    }

    const hidden_days = days_to_hide.length > 0 ? $.map(days_to_hide.split(", "), Number) : [];

    const calendarEl = document.getElementById('read_only_calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'fr',
        initialView: default_initial_view,
        headerToolbar: header_toolbar,
        buttonText: {
            list: "Semaine"
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit'
        },
        allDaySlot: false,
        contentHeight: "auto",
        eventDisplay: "block",
        hiddenDays: hidden_days,
        events: '/shifts/get_list_shift_calendar/' + partner_data.concerned_partner_id,
        eventDidMount: function() {
            // Calendar is hidden at first on mobile to hide header change when data is loaded
            $(".loading-calendar").hide();
            $("#calendar").show();

            if (vw <= 992) {
                $(".fc .fc-header-toolbar").addClass("resp-header-toolbar");
            } else {
                $(".fc .fc-header-toolbar").removeClass("resp-header-toolbar");
            }
        }
    });

    calendar.render();
}

function init_delete_registration_buttons() {
    $(".delete_registration_button").off();
    $(".delete_registration_button").on("click", function() {
        let shift_name = $(this).closest("div")
            .siblings(".selectable_shift_line")
            .text()
            .trim();
        let shift_id = $(this).closest(".shift_line_container")
            .attr('id')
            .split('_')[2];

        openModal(
            `<p>Je m'apprête supprimer ma présence au service du <b>${shift_name}</b></p>`,
            () => {
                delete_shift_registration(shift_id);
            },
            "Confirmer",
            false
        );
    });

    $(".delete_registration_button").css('display', 'flex');
}

function init_shifts_exchange() {
    $(".shifts_exchange_page_content").hide();
    vw = window.innerWidth;

    if (partner_data.cooperative_state === 'unsubscribed' || partner_data.cooperative_state === 'gone') {
        $("#unsuscribed_content").show();

        $(".unsuscribed_form_link")
            .show()
            .attr('href', unsuscribe_form_link)
            .on('click', function() {
                setTimeout(500, () => {
                    $(this).removeClass('active');
                });
            });
    } else if (
        partner_data.cooperative_state === 'suspended'
        && partner_data.can_have_delay === 'False') {
        let msg_template = $("#cant_have_delay_msg_template");

        $(".suspended_cant_have_delay_msg").html(msg_template.html());
        $("#suspended_cant_have_delay_content").show();

        $(".cant_have_delay_form_link")
            .show()
            .attr('href', member_cant_have_delay_form_link)
            .on('click', function() {
                setTimeout(500, () => {
                    $(this).removeClass('active');
                });
            });
    } else if (
        partner_data.comite === "True") {
        let msg_template = $("#comite_template");

        $(".comite_content_msg").html(msg_template.html());
        $("#comite_content").show();
        init_read_only_calendar_page();
    } else if (partner_data.cooperative_state === 'suspended'
                && partner_data.date_delay_stop === 'False') {
        $("#suspended_content .makeups_nb").text(partner_data.makeups_to_do);

        $("#suspended_content").show();

        $(".select_makeups").on('click', () => {
            openModal();
            // Create 6 month delay
            request_delay()
                .then(() => {
                    $("#suspended_content").hide();
                    $("#shifts_exchange_content").show();
                    closeModal();
                    init_calendar_page();
                });
        });
    } else {
        $("#shifts_exchange_content").show();
        init_calendar_page();
    }

    $(window).smartresize(function() {
        // only apply if a width threshold is passed
        if (
            vw > 992 && window.innerWidth <= 992 ||
            vw <= 992 && window.innerWidth > 992 ||
            vw > 768 && window.innerWidth <= 768 ||
            vw <= 768 && window.innerWidth > 768
        ) {
            vw = window.innerWidth;
            init_calendar_page();
        } else {
            vw = window.innerWidth;
        }
    });
}
