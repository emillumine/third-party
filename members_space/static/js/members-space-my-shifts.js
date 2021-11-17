var history_table = null;

const history_items_limit = 10;

/**
 * Load the partner points history
 */
function load_partner_history(offset = 0) {
    return new Promise((resolve) => {
        $.ajax({
            type: 'GET',
            url: "/members_space/get_shifts_history",
            data: {
                partner_id: partner_data.concerned_partner_id,
                verif_token: partner_data.verif_token,
                limit: history_items_limit,
                offset: offset,
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
        history_item.details = '';
        if (history_item.state === 'excused' || history_item.state === 'absent') {
            history_item.details = "Absent";
        } else if (history_item.state === 'done' && history_item.is_late != false) {
            history_item.details = "Présent (En Retard)";
        } else if (history_item.state === 'done') {
            history_item.details = "Présent";
        } else if (history_item.state === 'cancel') {
            history_item.details = "Annulé";
        }

        history_item.shift_name = (history_item.shift_id === false) ? '' : history_item.shift_id[1];
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
                    data: "shift_name",
                    title: "<spans class='dt-body-center'>Service</span>",
                    width: "60%",
                },
                {
                    data: "details",
                    title: "Détails",
                    className: "tablet-l desktop"
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
                    } else if (cell.text() === "Absent") {
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