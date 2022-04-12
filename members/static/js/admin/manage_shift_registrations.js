var member_shifts_table = null,
    members_search_results = [],
    selected_member = null,
    incoming_shifts = null;

/**
 * Load partners who have makeups to do
 */
function load_member_future_shifts() {
    $.ajax({
        type: 'GET',
        url: "/shifts/get_list_shift_partner/" + selected_member.id,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            incoming_shifts = data;
            display_member_shifts();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des services du membre", ctx: 'load_member_future_shifts'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'members.admin');

            closeModal();
            alert('Erreur lors de la récupération des services du membre.');
        }
    });
}

/**
 * Display table of member future shifts
 */
function display_member_shifts() {
    if (member_shifts_table) {
        $('#member_shifts_table').off();
        member_shifts_table.clear().destroy();
        $('#member_shifts_table').empty();
    }

    $('#table_top_area #member_name').text(selected_member.name);
    $('#table_top_area').show();

    member_shifts_table = $('#member_shifts_table').DataTable({
        data: incoming_shifts,
        columns: [
            {
                data: "date_begin",
                title: "",
                visible: false
            },
            {
                data: "shift_id",
                title: "Service",
                orderable: false,
                render: function (data) {
                    return data[1];
                }
            },
            {
                data: null,
                title: "",
                className: "dt-body-center",
                orderable: false,
                width: "5%",
                render: function () {
                    return `<i class="fa fa-lg fa-times delete_shift_registration"></i>`;
                }
            }
        ],
        order: [
            [
                0,
                "asc"
            ]
        ],
        paging: false,
        dom: 'tif',
        oLanguage: {
            "sProcessing":     "Traitement en cours...",
            "sSearch":         "Rechercher dans le tableau",
            "sInfo":           "Total de _TOTAL_ &eacute;l&eacute;ments",
            "sInfoEmpty":      "",
            "sInfoFiltered":   "(filtr&eacute; de _MAX_ &eacute;l&eacute;ments au total)",
            "sInfoPostFix":    "",
            "sLoadingRecords": "Chargement en cours...",
            "sZeroRecords":    "Aucun &eacute;l&eacute;ment &agrave; afficher",
            "sEmptyTable":     "Aucun futur service pour ce.tte membre"
        },
        createdRow: function(row, rdata) {
            if (rdata.is_makeup === true) {
                $(row).addClass("makeup_row");
                $(row).prop('title', 'Ce service est un rattrapage');
            }
        }
    });

    $('#member_shifts_table').on('click', 'tbody td .delete_shift_registration', function () {
        const row_data = member_shifts_table.row($(this).parents('tr')).data();
        const shift_reg_id = row_data.id;
        const shift_is_makeup = row_data.is_makeup;

        let msg = `<p>Enlever la présence de <b>${member.name}</b> au service du <b>${row_data.shift_id[1]}</b> ?</p>`;

        if (shift_is_makeup === true) {
            msg += `<p><i class="fas fa-exclamation-triangle"></i> Ce service est un rattrapage. Le supprimer ajoutera un point au compteur de ce.tte membre.</p>`;
        }

        openModal(
            msg,
            () => {
                delete_shift_registration(shift_reg_id, shift_is_makeup);
            },
            "Confirmer",
            false
        );
    });
}

/**
 * Send request to delete shift registration
 * @param {Int} shift_reg_id Id of the shift_registration to delete
 * @param {Boolean} shift_is_makeup Is the shift a makeup?
 */
function delete_shift_registration(shift_reg_id, shift_is_makeup) {
    openModal();

    data = {
        member_id: selected_member.id,
        member_shift_type: selected_member.shift_type,
        shift_registration_id: shift_reg_id,
        shift_is_makeup: shift_is_makeup
    };

    $.ajax({
        type: 'POST',
        url: "/members/delete_shift_registration",
        data: JSON.stringify(data),
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function() {
            closeModal();
            alert("La présence a bien été annulée.");

            const i = incoming_shifts.findIndex(is => is.id === shift_reg_id);

            incoming_shifts.splice(i, 1);
            display_member_shifts();
        },
        error: function(data) {
            err = {msg: "erreur serveur pour supprimer la présence au service", ctx: 'delete_shift_registration'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'members.admin');

            closeModal();
            alert('Erreur serveur pour supprimer la présence au service. Ré-essayez plus tard.');
        }
    });
}

/**
 * Display the members from the search result
 */
function display_possible_members() {
    $('.search_member_results_area').show();
    $('.search_member_results').empty();
    $('.btn_possible_member').off();

    let no_result = true;

    if (members_search_results.length > 0) {
        for (member of members_search_results) {
            $(".search_results_text").show();
            no_result = false;

            // Display results (possible members) as buttons
            var member_button = '<button class="btn--success btn_possible_member" member_id="'
                + member.id + '">'
                + member.barcode_base + ' - ' + member.name
                + '</button>';

            $('.search_member_results').append(member_button);
        }

        // Set action on member button click
        $('.btn_possible_member').on('click', function() {
            for (member of members_search_results) {
                if (member.id == $(this).attr('member_id')) {
                    selected_member = member;
                    load_member_future_shifts();
                    $('.search_member_results').empty();
                    $('.search_member_results_area').hide();
                    $('#search_member_input').val('');

                    break;
                }
            }
        });
    }

    if (no_result === true) {
        $(".search_results_text").hide();
        $('.search_member_results').html(`<p>
            <i>Aucun résultat ! Vérifiez votre recherche, ou si le.la membre n'est pas déjà dans le tableau...</i>
        </p>`);
    }
}

$(document).ready(function() {
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

        $(".page_content").show();
    } else {
        $(".page_content").hide();
    }

    $('#back_to_admin_index').on('click', function() {
        let base_location = window.location.href.split("manage_shift_registrations")[0].slice(0, -1);

        window.location.assign(base_location);
    });

    // Set action to search for the member
    $('#search_member_form').submit(function() {
        let search_str = $('#search_member_input').val();

        $.ajax({
            url: '/members/search/' + search_str,
            dataType : 'json',
            success: function(data) {
                members_search_results = [];

                for (member of data.res) {
                    if (member.is_member || member.is_associated_people) {
                        members_search_results.push(member);
                    }
                }

                display_possible_members();
            },
            error: function() {
                err = {
                    msg: "erreur serveur lors de la recherche de membres",
                    ctx: 'search_member_form.search_members'
                };
                report_JS_error(err, 'members.admin');

                $.notify("Erreur lors de la recherche de membre, il faut ré-essayer plus tard...", {
                    globalPosition:"top right",
                    className: "error"
                });
            }
        });
    });
});
