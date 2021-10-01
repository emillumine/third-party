var makeups_members_table = null,
    makeups_members = null;

function switch_active_tab() {
    // Set tabs
    $('.tab').removeClass('active');
    $(this).addClass('active');

    // Tabs content
    $('.tab_content').hide();

    let tab = $(this).attr('id');
    if (tab == 'tab_settings') {
        $('#tab_settings_content').show();
    } else {
        // Default
        $('#tab_makeups_content').show();
    }

    load_tab_data();
}

function load_tab_data() {
    let current_tab = $('.tab .active').attr('id');
    if (current_tab === 'tab_makeups') {
        load_makeups_members();
    }
}

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

function display_makeups_members() {
    if (makeups_members_table) {
        $('#makeups_members_table').off();
        makeups_members_table.clear().destroy();
        $('#makeups_members_table').empty();
    }

    // Remove members with 0 makeups to do
    ids_to_remove = []
    for (of in makeups_members) {
        if (makeups_members[i].makeups_to_do == 0) {
            ids_to_remove.push(makeups_members[i].id)
        }
    }
    makeups_members = makeups_members.filter(m => !ids_to_remove.includes(m.id))

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
                title: "Nom",
            },
            {
                data: "makeups_to_do",
                title: "Nb rattrapages",
                className: "dt-body-center",
                width: "10%",
                render: function (data, type, full) {
                    return `<b>${data}</b> 
                        <button class="decrement_makeup btn--primary" id="decrement_member_${full.id}">
                            <i class="fas fa-arrow-down"></i>
                        </button>`;
                },
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
        iDisplayLength: -1,
        language: {url : '/static/js/datatables/french.json'},
    });

    $('#makeups_members_table').on('click', 'tbody td .decrement_makeup', function () {
        const button_id = $(this).prop('id').split('_');
        const member_id = button_id[button_id.length - 1];

        const member = makeups_members.find(m => m.id == member_id);

        openModal(
            `Enlever un rattrapage à ${member.name} ?`,
            () => {
                decrement_makeups([member_id]);
            },
            "Confirmer",
            false
        )
    });
}

function decrement_makeups(member_ids) {
    openModal();

    data = []
    for (mid of member_ids) {
        member_index = makeups_members.findIndex(m => m.id == mid);
        makeups_members[member_index].makeups_to_do -= 1;

        data.push({
            member_id: mid,
            target_makeups_nb: makeups_members[member_index].makeups_to_do
        })
    }

    $.ajax({
        type: 'POST',
        url: "/members/update_members_makeups",
        data: JSON.stringify(data),
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            display_makeups_members();
            closeModal()
        },
        error: function(data) {
            err = {msg: "erreur serveur pour décrémenter les rattrapages", ctx: 'load_makeups_members'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur serveur lors de la récupération des membres avec rattrapage. Ré-essayez plus tard.');
        }
    });
}

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });    

    load_makeups_members();

    $(".tabs .tab").on('click', switch_active_tab);
});
