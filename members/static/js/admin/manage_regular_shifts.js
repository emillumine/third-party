var selected_member = null,
    possible_cooperative_state = {
        suspended: "Rattrapage",
        exempted: "Exempté.e",
        alert: "En alerte",
        up_to_date: "À jour",
        unsubscribed: "Désinscrit.e des créneaux",
        delay: "En délai",
        gone: "Parti.e"
    };

/**
 * Send request to remove partner from shift template
 */
function remove_from_shift_template() {
    let permanent_unsuscribe = modal.find("#permanent_unsuscribe").prop('checked');

    openModal();

    let data = {
        partner_id: selected_member.id,
        shift_template_id: selected_member.shift_template_id[0],
        permanent_unsuscribe: permanent_unsuscribe,
        makeups_to_do: selected_member.makeups_to_do,
    };

    $.ajax({
        type: 'POST',
        url: '/members/delete_shift_template_registration',
        data: JSON.stringify(data),
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function() {
            selected_member.shift_template_id = null;
            selected_member.cooperative_state = (permanent_unsuscribe === true) ? "gone" : "unsubscribed";
            display_member_info();
            closeModal();
        },
        error: function() {
            err = {
                msg: "erreur serveur lors de la suppression du membre du créneau",
                ctx: 'members.admin.manage_regular_shifts.remove_from_shift_template'
            };
            report_JS_error(err, 'members.admin');
            closeModal();

            $.notify("Une erreur est survenue lors du processus de suppression du membre du créneau.", {
                globalPosition:"top right",
                className: "error"
            });
        }
    });
}

/**
 * When a member is selected, display the selected member relevant info
 */
function display_member_info() {
    $('.member_name').text(`${selected_member.barcode_base} - ${selected_member.name}`);
    $('.member_status').text(possible_cooperative_state[selected_member.cooperative_state]);
    $('.member_makeups').text(selected_member.makeups_to_do);

    if (selected_member.shift_template_id === undefined || selected_member.shift_template_id === null) {
        $('.member_shift').text("");

        $("#remove_shift_template_button").hide();
        $("#remove_shift_template_button").off();
    } else {
        $('.member_shift').text(selected_member.shift_template_id[1]);

        $("#remove_shift_template_button").show();
        $("#remove_shift_template_button").off();
        $("#remove_shift_template_button").on("click", () => {
            let modal_template = $("#modal_remove_shift_template");
            modal_template.find(".shift_template_name").text(selected_member.shift_template_id[1]);

            openModal(
                modal_template.html(),
                remove_from_shift_template,
                "Valider",
                false
            );
        });
    }

    $('#search_member_input').val();
    $('#partner_data_area').css('display', 'flex');
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
                    display_member_info();

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
            <i>Aucun résultat ! Vérifiez votre recherche...</i>
        </p>`);
    }
}

$(document).ready(function() {
    if (coop_is_connected()) {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
        $(".page_content").show();

        // Set action to search for the member
        $('#search_member_form').submit(function() {
            let search_str = $('#search_member_input').val();
    
            $.ajax({
                url: `/members/search/${search_str}?search_type=shift_template_data`,
                dataType : 'json',
                success: function(data) {
                    $('#partner_data_area').hide();
                    if (data.res.length === 1) {
                        selected_member = data.res[0];
                        display_member_info();
                    } else {
                        members_search_results = data.res;
                        display_possible_members();
                    }
                },
                error: function() {
                    err = {
                        msg: "erreur serveur lors de la recherche de membres",
                        ctx: 'members.admin.manage_regular_shifts.search_members'
                    };
                    report_JS_error(err, 'members.admin');
    
                    $.notify("Erreur lors de la recherche de membre, il faut ré-essayer plus tard...", {
                        globalPosition:"top right",
                        className: "error"
                    });
                }
            });
        });
    } else {
        $(".page_content").hide();
    }

    $('#back_to_admin_index').on('click', function() {
        let base_location = window.location.href.split("manage_regular_shifts")[0].slice(0, -1);
        window.location.assign(base_location);
    });
});
