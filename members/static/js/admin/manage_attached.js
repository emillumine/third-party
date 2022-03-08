var parentId = null;
var childId = null;

const possible_cooperative_state = {
  suspended: "Rattrapage",
  exempted: "Exempté.e",
  alert: "En alerte",
  up_to_date: "À jour",
  unsubscribed: "Désinscrit.e des créneaux",
  delay: "En délai",
  gone: "Parti.e"
};

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
          console.log(data)
          console.log(divId)
            if (divId === 'parentInfo') {
              parentId = data.member.id
            } else if (divId === 'childInfo') {
              childId = data.member.id
            }
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

function ready_for_submission() {
  if (parentId != null && childId != null) {
    console.log("ready")
    return true
  }
}

/**
 * Display member info
 */
function display_member_infos(divId, memberData) {
  console.log(memberData)
  $("#" + divId).show()
  $("#" + divId).find(".member_name").text(memberData.name)
  $("#" + divId).find(".member_status").text(possible_cooperative_state[memberData.cooperative_state])
  $("#" + divId).find(".member_shift_name").text(memberData.current_template_name);
  $("#" + divId).find(".member_makeups_to_do").text(memberData.makeups_to_do);

  if (memberData.is_associated_people === false) {
      $("#" + divId).find(".member_associated_partner_area").hide();
  }

  if (parentId != null && childId != null) {
    $("#createPair").prop("disabled", false)
  }
}

/**
 * Load attached members
 */
 function load_attached_members() {
  console.log(get_attached_members)
  $.ajax({
    type: 'GET',
    url: "/members/get_attached_members",
    dataType:"json",
    traditional: true,
    contentType: "application/json; charset=utf-8",
    success: function(data) {
        attached_members = data.res;
        display_attached_members();
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
 * Display table of attached members
 */
 function display_attached_members() {
  if (attached_members_table) {
    $('#attached_members_table').off();
    attached_members_table.clear().destroy();
    $('#attached_members_table').empty();
  }

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
            title: "en binôme avec",
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
        minLength: 1,
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
          minLength: 1,
          select: function( event, ui ) {
            if (ui.item) {
              load_member_infos("childInfo", ui.item.value)
            }
          },
        })

      $("#createPair").on('click', function() {
        var payload = {
              "parent": {"id": parentId},
              "child": {"id": childId}
          }

        $.ajax({
          type: 'POST',
          url: "/members/admin/manage_attached/create_pair",
          dataType:"json",
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify(payload),
          success: function(data) {
            console.log(data)
            alert("binôme créé")
          },
          error: function(data) {
              err = {msg: "erreur serveur", ctx: 'create pair'};
              if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                  err.msg += ' : ' + data.responseJSON.error;
              }
              report_JS_error(err, 'members.admin');

              closeModal();
              alert('Erreur lors de création du binôme.');
          }
        })
      })
    })
