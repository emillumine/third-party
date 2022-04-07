var makeups_members_table = null,
    makeups_members = null,
    members_search_results = [],
    selected_rows = []; // Contain members id


/**
 * Load partners who have makeups to do
 */
function load_makeups_members() {
    $.ajax({
        type: 'GET',
        url: "/members/get_makeups_members",
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            makeups_members = data.res;
            display_makeups_members();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des membres avec rattrapage", ctx: 'load_makeups_members'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur serveur lors de la récupération des membres avec rattrapage. Ré-essayez plus tard.');
        }
    });
}

/**
 * (Re)Display table of makeup members
 */
function display_makeups_members() {
    if (makeups_members_table) {
        $('#makeups_members_table').off();
        makeups_members_table.clear().destroy();
        $('#makeups_members_table').empty();
    }

    // Remove members with 0 makeups to do
    ids_to_remove = [];
    for (member_item of makeups_members) {
        if (member_item.makeups_to_do == 0) {
            ids_to_remove.push(member_item.id);
        }
    }
    makeups_members = makeups_members.filter(m => !ids_to_remove.includes(m.id));

    // TODO : select multiple and grouped action
    makeups_members_table = $('#makeups_members_table').DataTable({
        data: makeups_members,
        columns: [
            {
                data: "id",
                title: '',
                className: "dt-body-center",
                orderable: false,
                render: function (data) {
                    return `<input type="checkbox" class="select_member_cb" id="select_member_${data}" value="${data}">`;
                },
                width: "3%"
            },
            {
                data: "name",
                title: "Nom"
            },
            {
                data: "shift_type",
                title: "Nb de points",
                className: "dt-body-center",
                width: "10%",
                render: function (data, type, row) {
                    if (data == 'ftop') {
                        return row.display_ftop_points
                    } else if (data == 'standard') {
                        return row.display_std_points 
                    }
                }
            },
            {
                data: "makeups_to_do",
                title: "Nb rattrapages",
                className: "dt-body-center",
                width: "10%",
                render: function (data, type, full) {
                    return `<b>${data}</b> 
                        <button class="decrement_makeup btn--primary" id="decrement_member_${full.id}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="increment_makeup btn--primary" id="increment_member_${full.id}">
                            <i class="fas fa-plus"></i>
                        </button>`;
                }
            }
        ],
        aLengthMenu: [
            [
                25,
                50,
                -1
            ],
            [
                25,
                50,
                "Tout"
            ]
        ],
        iDisplayLength: 25,
        oLanguage: {
            "sProcessing":     "Traitement en cours...",
            "sSearch":         "Rechercher dans le tableau",
            "sLengthMenu":     "Afficher _MENU_ &eacute;l&eacute;ments",
            "sInfo":           "Affichage de l'&eacute;l&eacute;ment _START_ &agrave; _END_ sur _TOTAL_ &eacute;l&eacute;ments",
            "sInfoEmpty":      "Affichage de l'&eacute;l&eacute;ment 0 &agrave; 0 sur 0 &eacute;l&eacute;ment",
            "sInfoFiltered":   "(filtr&eacute; de _MAX_ &eacute;l&eacute;ments au total)",
            "sInfoPostFix":    "",
            "sLoadingRecords": "Chargement en cours...",
            "sZeroRecords":    "Aucun &eacute;l&eacute;ment &agrave; afficher",
            "sEmptyTable":     "Aucune donn&eacute;e disponible dans le tableau",
            "oPaginate": {
                "sFirst":      "Premier",
                "sPrevious":   "Pr&eacute;c&eacute;dent",
                "sNext":       "Suivant",
                "sLast":       "Dernier"
            },
            "oAria": {
                "sSortAscending":  ": activer pour trier la colonne par ordre croissant",
                "sSortDescending": ": activer pour trier la colonne par ordre d&eacute;croissant"
            },
            "select": {
                "rows": {
                    "_": "%d lignes séléctionnées",
                    "0": "Aucune ligne séléctionnée",
                    "1": "1 ligne séléctionnée"
                }
            }
        }
    });

    $('#makeups_members_table').on('click', 'tbody td .decrement_makeup', function () {
        const button_id = $(this).prop('id')
            .split('_');
        const member_id = button_id[button_id.length - 1];

        const member = makeups_members.find(m => m.id == member_id);

        openModal(
            `Enlever un rattrapage à ${member.name} ?`,
            () => {
                update_members_makeups([member_id], "decrement");
            },
            "Confirmer",
            false
        );
    });

    $('#makeups_members_table').on('click', 'tbody td .increment_makeup', function () {
        const button_id = $(this).prop('id')
            .split('_');
        const member_id = button_id[button_id.length - 1];

        const member = makeups_members.find(m => m.id == member_id);

        openModal(
            `Ajouter un rattrapage à ${member.name} ?`,
            () => {
                update_members_makeups([member_id], "increment");
            },
            "Confirmer",
            false
        );
    });

    $('#makeups_members_table').on('click', 'tbody td .select_member_cb', function () {
        $(this).closest('tr')
            .toggleClass('selected');

        // Save / unsave selected row
        const m_id = makeups_members_table.row($(this).closest('tr')).data().id;
        const first_select = selected_rows.length === 0;

        if (this.checked) {
            selected_rows.push(m_id);
        } else {
            const i = selected_rows.findIndex(id => id == m_id);

            selected_rows.splice(i, 1);
        }

        if (selected_rows.length > 0) {
            $("#decrement_selected_members_makeups").show();
            if (first_select) {
                $("#decrement_selected_members_makeups").on("click", () => {
                    openModal(
                        `Enlever un rattrapage aux membres sélectionnés ?`,
                        () => {
                            update_members_makeups(selected_rows, "decrement");
                        },
                        "Confirmer",
                        false
                    );
                });
            }
        } else {
            $("#decrement_selected_members_makeups").off()
                .hide();
        }
    });
}

/**
 * Send request to update members nb of makeups to do
 *
 * @param {Array} member_ids
 * @param {String} action increment | decrement
 */
function update_members_makeups(member_ids, action) {
    openModal();

    data = [];
    for (mid of member_ids) {
        member_index = makeups_members.findIndex(m => m.id == mid);
        /* Becareful : makeups_members will be modified while nobody knows wether ajax process will succeed or not !
        TODO : make the changes only when it is sure that odoo records have been changed
        */
        if (action === "increment") {
            makeups_members[member_index].makeups_to_do += 1;
        } else {
            makeups_members[member_index].makeups_to_do -= 1;
        }
        if (makeups_members[member_index].shift_type === 'standard') {
            if (action === "increment") {
                if (makeups_members[member_index].display_std_points >= -1)
                    makeups_members[member_index].display_std_points -= 1;
            } else if (makeups_members[member_index].display_std_points < 0) {
                makeups_members[member_index].display_std_points += 1;
            }
        } else {
            if (action === "increment") {
                if (makeups_members[member_index].display_ftop_points >= -1)
                    makeups_members[member_index].display_ftop_points -= 1;
            } else {
                makeups_members[member_index].display_ftop_points += 1;
            }
        }
        //console.log(makeups_members[member_index])
        data.push({
            member_id: mid,
            target_makeups_nb: makeups_members[member_index].makeups_to_do,
            member_shift_type: makeups_members[member_index].shift_type
        });
    }

    $.ajax({
        type: 'POST',
        url: "/members/update_members_makeups",
        data: JSON.stringify(data),
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function() {
            selected_rows = [];
            display_makeups_members();
            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur pour décrémenter les rattrapages", ctx: 'decrement_makeups'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'members_admin');

            closeModal();
            alert('Erreur serveur pour décrémenter les rattrapages. Ré-essayez plus tard.');
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
            // Don't display members already in the table
            if (makeups_members.find(m => m.id == member.id) != null) {
                continue;
            }

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
                    if (makeups_members === null) {
                        makeups_members = [];
                    }

                    makeups_members.unshift({
                        id: member.id,
                        name: member.name,
                        makeups_to_do: 0,
                        shift_type: member.shift_type
                    });

                    openModal(
                        `Ajouter un rattrapage à ${member.name} ?`,
                        () => {
                            update_members_makeups([member.id], "increment");
                            members_search_results = [];
                            $('#search_member_input').val('');
                            $('.search_member_results_area').hide();
                            $('.search_member_results').empty();
                        },
                        "Confirmer",
                        false
                    );

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
        load_makeups_members();
    } else {
        $(".page_content").hide();
    }

    $('#back_to_admin_index').on('click', function() {
        let base_location = window.location.href.split("manage_makeups")[0].slice(0, -1);

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
                    ctx: 'members.admin.manage_makeups.search_members'
                };
                report_JS_error(err, 'stock');

                $.notify("Erreur lors de la recherche de membre, il faut ré-essayer plus tard...", {
                    globalPosition:"top right",
                    className: "error"
                });
            }
        });
    });
});
