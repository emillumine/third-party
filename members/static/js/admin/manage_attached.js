var parentId = null;
var childId = null;

/**
 * Load member infos
 */
function load_member_infos(divId, memberId) {
  console.log(memberId)
    $.ajax({
        type: 'GET',
        url: "/members/get_member_info/" + memberId,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            display_member_infos(divId, data.member)
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
  $("#" + divId).show()
  console.log(memberData)
  $("#" + divId).find("#name").text(memberData.name)

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
                    value: item.barcode_base
                  }
                }))
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
              },
            }
          )
        },
        minLength: 3,
        select: function( event, ui ) {
          if (ui.item) {
            load_member_infos("parentInfo", ui.item.value)
          }
        }
      })

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
                  console.log(members_search_results)
                  response($.map(data.res, function(item) {
                    return {
                      label: item.barcode_base + ' ' + item.name,
                      value: item.barcode_base
                    }
                  }))
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
                },
              }
            )
          },
          minLength: 3,
          select: function( event, ui ) {
            return null
          },
        })
    })
