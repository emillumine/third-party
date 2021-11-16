var history_table = null;

const history_items_limit = 10;

/**
 * Load the partner points history
 */
function load_partner_history(offset = 0) {
    return new Promise((resolve) => {
        $.ajax({
            type: 'GET',
            url: "/members_space/get_points_history",
            data: {
                partner_id: partner_data.concerned_partner_id,
                verif_token: partner_data.verif_token,
                limit: history_items_limit,
                offset: offset,
                shift_type: (partner_data.in_ftop_team === "True") ? "ftop" : "standard"
            },
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                formatted_data = prepare_server_data(data.data);
                resolve(formatted_data);
            },
            error: function(data) {
                err = {msg: "erreur serveur lors de la récupération de l'historique", ctx: 'load_partner_history'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'members_space.my_shifts');

                closeModal();
                // TODO Notify
                alert('Erreur lors de la récupération de votre historique.');
            }
        });
    });
}

/**
 * Format history data to insert in the table
 *
 * @param {Array} data
 * @returns formated data array
 */
function prepare_server_data(data) {
    res = [];

    for (history_item of data) {
        // Date formating
        let datetime_shift_start = new Date(history_item.create_date);

        let f_date_shift_start = datetime_shift_start.toLocaleDateString("fr-fr", date_options);

        f_date_shift_start = f_date_shift_start.charAt(0).toUpperCase() + f_date_shift_start.slice(1);

        history_item.movement_date = f_date_shift_start + " - " + datetime_shift_start.toLocaleTimeString("fr-fr", time_options);

        // Text replacements
        history_item.name = (history_item.name === "Clôturer le service") ? "Décompte 28j" : history_item.name;//Clôlturer le service
        history_item.name = (history_item.name === "Rattrapage") ? "Absence" : history_item.name;
        if (history_item.name === "Clôturer le service" || history_item.name === "Clôlturer le service") {
            history_item.name = "Décompte 28j";
        } else if (history_item.name === "Rattrapage") {
            history_item.name = "Absence";
        } else if (history_item.name === "Présent" && history_item.is_late != false) {
            history_item.name = "Retard";
        }

        history_item.created_by = history_item.create_uid[1];
        if (history_item.created_by === "Administrator") {
            history_item.created_by = "Administrateur";
        } else if (history_item.created_by === "api") {
            history_item.created_by = "Système";
        }

        history_item.shift_name = (history_item.shift_id === false) ? '' : history_item.shift_id[1];

        // if Present && is_late -> Absent
    }

    return data;
}

/**
 * Init the History section: display the history table
 */
function init_history() {
    $(".loading-history").hide();
    $("#history").show();

    if (partner_history.length === 0) {
        $("#history").empty()
            .text("Aucun historique... pour l'instant !");
    } else {
        history_table = $('#history_table').DataTable({
            data: partner_history,
            columns: [
                {
                    data: "movement_date",
                    title: `Date`,
                    responsivePriority: 1
                },
                {
                    data: "shift_name",
                    title: "Service"
                },
                {
                    data: "name",
                    title: "Détails",
                    responsivePriority: 3
                }
            ],
            iDisplayLength: -1,
            ordering: false,
            language: {url : '/static/js/datatables/french.json'},
            dom: "t",
            responsive: true,
            createdRow: function(row) {
                for (var i = 0; i < row.cells.length; i++) {
                    const cell = $(row.cells[i]);

                    if (cell.text() === "Présent") {
                        $(row).addClass('row_partner_ok');
                    } else if (cell.text() === "Retard") {
                        $(row).addClass('row_partner_late');
                    } else if (cell.text() === "Absence") {
                        $(row).addClass('row_partner_absent');
                    }
                }
            }
        });
    }
}

/**
 * Init the Incoming shifts section: display them
 */
function init_incoming_shifts() {
    $(".loading-incoming-shifts").hide();
    $("#incoming_shifts").show();

    if (incoming_shifts.length === 0) {
        $("#incoming_shifts").text("Aucun service à venir...");
    } else {
        $("#incoming_shifts").empty();

        for (shift of incoming_shifts) {
            let shift_line_template = prepare_shift_line_template(shift.date_begin);

            $("#incoming_shifts").append(shift_line_template.html());
        }
    }
}

function init_my_shifts() {
    if (incoming_shifts !== null) {
        init_incoming_shifts();
    } else {
        load_partner_shifts(partner_data.concerned_partner_id)
            .then(init_incoming_shifts);
    }

    if (partner_history !== null) {
        init_history();
    } else {
        load_partner_history()
            .then((data) => {
                partner_history = data;

                // Sort by date desc
                partner_history.sort((a, b) => a.create_date - b.create_date);

                init_history();
            });
    }

    $(".more_history_button").on("click", function() {
        // Hide button & display loading
        $('.more_history_button').hide();
        $('.loading-more-history').show();

        load_partner_history(partner_history.length)
            .then((data) => {
                partner_history = partner_history.concat(data);
                if (history_table) {
                    history_table.rows.add(data).draw(false);
                }

                $('.loading-more-history').hide();
                // Show "load more" if there is more to load
                if (data.length === history_items_limit) {
                    $('.more_history_button').show();
                }
            });
    });
}