var makeups_members_table = null,
    makeups_members = null,
    selected_rows = []; // Contain members id

function switch_active_tab() {
    // Set tabs
    $('.tab').removeClass('active');
    $(this).addClass('active');

    // Tabs content
    $('.tab_content').hide();

    let tab = $(this).attr('id');

    if (tab == 'tab_makeups') {
        $('#tab_makeups_content').show();
    }

    load_tab_data();
}

/**
 * Load data for the current tab
 */
function load_tab_data() {
    let current_tab = $('.tab .active').attr('id');

    if (current_tab === 'tab_makeups' && makeups_members === null) {
        load_makeups_members();
    }
}

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
                data: "makeups_to_do",
                title: "Nb rattrapages",
                className: "dt-body-center",
                width: "10%",
                render: function (data, type, full) {
                    return `<b>${data}</b> 
                        <button class="decrement_makeup btn--primary" id="decrement_member_${full.id}">
                            <i class="fas fa-arrow-down"></i>
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
        iDisplayLength: -1,
        language: {url : '/static/js/datatables/french.json'}
    });

    $('#makeups_members_table').on('click', 'tbody td .decrement_makeup', function () {
        const button_id = $(this).prop('id')
            .split('_');
        const member_id = button_id[button_id.length - 1];

        const member = makeups_members.find(m => m.id == member_id);

        openModal(
            `Enlever un rattrapage à ${member.name} ?`,
            () => {
                decrement_makeups([member_id]);
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
                            decrement_makeups(selected_rows);
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
 * @param {Array} member_ids
 */
function decrement_makeups(member_ids) {
    openModal();

    data = [];
    for (mid of member_ids) {
        member_index = makeups_members.findIndex(m => m.id == mid);
        makeups_members[member_index].makeups_to_do -= 1;

        data.push({
            member_id: mid,
            target_makeups_nb: makeups_members[member_index].makeups_to_do
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
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

        $(".page_content").show();
        load_makeups_members();

        $(".tabs .tab").on('click', switch_active_tab);
    } else {
        $(".page_content").hide();
    }
});
