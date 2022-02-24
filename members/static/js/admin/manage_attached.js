/**
 * Load member infos
 */
function load_member_infos() {
    $.ajax({
        type: 'GET',
        url: "/members_space/my_info/" + selected_member.id,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            incoming_shifts = data;
            display_member_infos();
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
 * Display table of member future shifts
 */
function display_member_shifts() {

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
                    load_member_infos();
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
        let base_location = window.location.href.split("manage_attached")[0].slice(0, -1);

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