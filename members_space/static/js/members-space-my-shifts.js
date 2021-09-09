/**
 * Load the partner points history
 */
 function load_partner_history() {
    return new Promise((resolve) => {
        $.ajax({
            type: 'GET',
            url: "/members_space/get_points_history",
            data: {
                partner_id: partner_data.partner_id,
                verif_token: partner_data.verif_token,
                limit: 10
            },
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                partner_history = data.data;
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

function init_history() {
    if (incoming_shifts.length === 0) {
        $("#history").empty().text("Aucun historique... pour l'instant !")
    } else {
        for (history_item of partner_history) {
            // Prepare history lines
            let history_line_template = $("#history_line_template");

            // Date
            let datetime_item_start = new Date(history_item.create_date);
            let f_date_item_start = datetime_item_start.toLocaleDateString("fr-fr", date_options);
            f_date_item_start = f_date_item_start.charAt(0).toUpperCase() + f_date_item_start.slice(1);

            history_line_template.find(".table_line_date").text(f_date_item_start);

            history_line_template.find(".table_line_desc").text(history_item.name);
            history_line_template.find(".table_line_pts").text(history_item.point_qty);

            $(".history_table_content").append(history_line_template.html());
        }
    }
}

function init_incoming_shifts() {
    if (incoming_shifts.length === 0) {
        $("#incoming_services").text("Aucun service à venir...")
    } else {
        $("#incoming_services").empty();
        
        for (shift of incoming_shifts) {
            let shift_line_template = prepare_shift_line_template(shift.date_begin);
            $("#incoming_services").append(shift_line_template.html());
        }
    }
}

function init_my_shifts() {
    if (incoming_shifts !== null) {
        init_incoming_shifts();
    } else {
        load_partner_shifts(partner_data.partner_id)
            .then(init_incoming_shifts);
    }

    if (partner_history !== null) {
        init_history();
    } else {
        load_partner_history()
            .then(init_history);
    }
    
    /**
     * if no incoming_services || no history {
     *      if no incoming : load incoming
     *      if no history : load hitstory
     * } else {
     *      do the stuff
     * }
     */
}