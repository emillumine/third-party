var parentId = null;
var childId = null;

var parentName = null;
var childName = null;

var parentEmail = null;
var childEmail = null;

const possible_cooperative_state = {
    suspended: "Rattrapage",
    exempted: "Exempté.e",
    alert: "En alerte",
    up_to_date: "À jour",
    unsubscribed: "Désinscrit.e des créneaux",
    delay: "En délai",
    gone: "Parti.e",
    associated: "En binôme"
};

/**
 * Load member infos
 */
function load_member_infos(divId, memberId) {
    $.ajax({
        type: 'GET',
        url: "/members/get_member_info/" + memberId,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            if (divId === 'parentInfo') {
                parentId = data.member.id;
                parentName = data.member.barcode_base + ' ' + data.member.name;
            } else if (divId === 'childInfo') {
                childId = data.member.id;
                childName = data.member.barcode_base + ' ' + data.member.name;
            }
            display_member_infos(divId, data.member);
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des infos du membre", ctx: 'load_member_infos'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'members.admin');

            closeModal();
            alert('Erreur lors de la récupération des infos du membre.');
        }
    });
}

/**
 * Display member info
 */
function display_member_infos(divId, memberData) {
    $("#" + divId).show();
    $("#" + divId).find(".member_name")
        .text(memberData.name);
    $("#" + divId).find(".member_email")
        .text(memberData.email);
    $("#" + divId).find(".member_status")
        .text(possible_cooperative_state[memberData.cooperative_state]);
    $("#" + divId).find(".member_makeups_to_do")
        .text(memberData.makeups_to_do);

    let member_shift_name = memberData.current_template_name === false ? 'X' : memberData.current_template_name;

    $("#" + divId).find(".member_shift_name")
        .text(member_shift_name);

    if (memberData.is_associated_people === false) {
        $("#" + divId).find(".member_associated_partner_area")
            .hide();
    }

    if (parentId != null && childId != null) {
        $("#createPair").prop("disabled", false);
        $("#createPair").addClass("btn--primary");
    }
}

/**
 * Load attached members
 */
function load_attached_members() {
    openModal();
    $.ajax({
        type: 'GET',
        url: "/members/get_attached_members",
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            attached_members = data.res;
            display_attached_members();
            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des membres en binôme", ctx: 'load_makeups_members'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'members');

            closeModal();
            alert('Erreur serveur lors de la récupération des membres en binôme. Ré-essayez plus tard.');
        }
    });
}

/**
 * Display table of attached members
 */
function display_attached_members() {

    // if (attached_members_table) {
    //   $('#attached_members_table').off();
    //   attached_members_table.clear().destroy();
    //   $('#attached_members_table').empty();
    // }

    attached_members_table = $('#attached_members_table').DataTable({
        data: attached_members,
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
                data: "parent_name",
                title: "Nom du titulaire"
            },
            {
                data: "name",
                title: "en binôme avec"
            },
            {
                data: "action",
                title: "Action",
                width: "10%",
                render: function (data, type, full) {
                    return `
              <button class="delete_pair btn--danger" id="delete_pair_${full.id}">
                Désolidariser
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

}


function delete_pair(childId, gone_checked) {
    var payload = {"child": {"id": childId}, "gone": []};

    if (gone_checked.length > 0) {
        $.each(gone_checked, function(i, e) {
            const elts = $(e).attr('name')
                .split("_");

            payload['gone'].push(elts[0]);
        });
    }

    $.ajax({
        type: "POST",
        url: '/members/admin/manage_attached/delete_pair',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(payload),
        success: function() {
            enqueue_message_for_next_loading("Binôme désolidarisé.");
            location.reload();
        },
        error: function(data) {
            err = {msg: "Erreur serveur lors de la désolidarisation du binôme.", ctx: 'load_makeups_members'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur serveur lors de la désolidarisation du binôme. Ré-essayez plus tard.');
        }
    });
}


function confirmDeletion(childId) {
    var modalContent = $('#confirmModal');

    modalContent.find("#parentName").text(parentName);
    modalContent.find("#childName").text(childName);

    if (parentEmail != false) {
        modalContent.find("#parentEmail").text(parentEmail);
    }
    if (childEmail != false) {
        modalContent.find("#childEmail").text(childEmail);
    }

    modalContent = modalContent.html();
    openModal(modalContent, () => {
        if (is_time_to('delete_pair')) {
            const gone_checked = $('input.after_unattached_state:checked');

            closeModal();
            openModal();
            delete_pair(childId, gone_checked);
        }
    }, 'Valider', false);
}


function create_pair(payload) {
    $.ajax({
        type: 'POST',
        url: "/members/admin/manage_attached/create_pair",
        dataType:"json",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(payload),
        success: function() {
            enqueue_message_for_next_loading("Binôme créé.");
            location.reload();
        },
        error: function(data) {
            err = {msg: "erreur serveur", ctx: 'create pair'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.errors != 'undefined') {
                err.msg += ' : ' + data.responseJSON.errors;
            }
            report_JS_error(err, 'members.admin');

            closeModal();
            var message = 'Erreur lors de création du binôme.';

            data.responseJSON.errors.map(function(error) {
                message += ('\n' + error);

                return null;
            });
            alert(message);
        }
    });
}


$(document).ready(function() {
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

        $(".page_content").show();
    } else {
        $(".page_content").hide();
    }

    $('#back_to_admin_index').on('click', function() {
        let base_location = window.location.href.split("manage_attached")[0].slice(0, -1);

        window.location.assign(base_location);
    });


    $("#search_member_input").autocomplete({source: function(request, response) {
        $.ajax({
            url: '/members/search/' + request.term,
            dataType : 'json',
            success: function(data) {
                members_search_results = [];
                for (member of data.res) {
                    if (member.is_member || member.is_associated_people) {
                        members_search_results.push(member);
                    }
                }
                response($.map(data.res, function(item) {
                    return {
                        label: item.barcode_base + ' ' + item.name,
                        value: item.id
                    };
                }));
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
    },
    minLength: 1,
    search: function() {
        $('#spinner1').show();
    },
    response: function() {
        $('#spinner1').hide();
    },
    select: function(event, ui) {
        event.preventDefault();
        if (ui.item) {
            load_member_infos("parentInfo", ui.item.value);
            $('#search_member_input').val(ui.item.label);

            return false;
        }

        return null;
    }
    });

    $("#search_child_input").autocomplete({source: function(request, response) {
        $.ajax({
            url: '/members/search/' + request.term,
            dataType : 'json',
            success: function(data) {
                members_search_results = [];
                for (member of data.res) {
                    if (member.is_member || member.is_associated_people) {
                        members_search_results.push(member);
                    }
                }
                response($.map(data.res, function(item) {
                    return {
                        label: item.barcode_base + ' ' + item.name,
                        value: item.id
                    };
                }));
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
    },
    minLength: 1,
    search: function() {
        $('#spinner2').show();
    },
    response: function() {
        $('#spinner2').hide();
    },
    select: function(event, ui) {
        if (ui.item) {
            load_member_infos("childInfo", ui.item.value);
            $('#search_child_input').val(ui.item.label);

            return false;
        }

        return null;
    }
    });

    $("#createPair").on('click', function() {
        if (parentId && childId) { // Note : after reload, button "Créer le binôme" is clickable...It shouldn't
            var payload = {
                "parent": {"id": parentId},
                "child": {"id": childId}
            };

            var modalContent = $('#confirmModal');

            modalContent.find("#parentName").text(parentName);
            modalContent.find("#childName").text(childName);
            modalContent = modalContent.html();
            openModal(modalContent, () => {
                if (is_time_to('create_pair')) {
                    closeModal();
                    openModal(); // Show gears
                    create_pair(payload);
                }
            }, 'Valider', false);
        }

    });

    if ($("#attached_members_table") != "undefined") {
        load_attached_members();
    }

    $(document).on('click', '.delete_pair', function (event) {
        var childId = event.target.id.split('_').slice(-1)[0];

        $.ajax({
            type: 'GET',
            url: "/members/get_member_info/" + childId,
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                if (data.member.parent_barcode_base !== undefined) {
                    parentName = data.member.parent_barcode_base + ' - ' + data.member.parent_name;
                } else {
                    parentName = data.member.parent_name;
                }
                parentEmail = data.member.parent_email;
                childName = data.member.barcode_base + ' - ' + data.member.name;
                childEmail = data.member.email;
                confirmDeletion(childId);
            },
            error: function(data) {
                err = {msg: "erreur serveur lors de la récupération des infos du membre", ctx: 'load_member_infos'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'members.admin');

                closeModal();
                alert('Erreur lors de la récupération des infos du membre.');
            }
        });
    });
});
