/**
 * Load member infos
 */
function load_member_infos() {
    $.ajax({
        type: 'GET',
        url: "/members/get_member_info/" + selected_member.id,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            console.log(data)
            display_member_infos(data.member);
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
 * Display table of member future shifts
 */
function display_member_infos(memberData) {
  console.log(memberData)
  shifts = memberData.incoming_shifts
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