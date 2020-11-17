var cash_envelops = []
var ch_envelops = []

function reset() {
  $('#cash_envelops').empty()
  $('#ch_envelops').empty()
  cash_envelops = []
  ch_envelops = []
}

function toggle_error_alert() {
  $('#envelop_cashing_error').toggle(250)
}

function toggle_success_alert() {
  $('#envelop_cashing_success').toggle(250)
}

// Set an envelop content on the document
function set_envelop_dom(envelop, envelop_name, envelop_content_id, envelop_index) {
  var envelops_section = $('#' + envelop.type + '_envelops')

  // Calculate envelop total amount
  var total_amount = 0
  for (partner_id in envelop.envelop_content) {
    total_amount += envelop.envelop_content[partner_id].amount
  }

  var new_html = '<div class="envelop_section">'
    + '<div class="flex-container">'

  // Allow checking for all cash and first check envelops
  if (envelop.type == 'cash' || envelop.type == 'ch' && envelop_index == 0) {
    new_html += '<button class="accordion w80">' + envelop_name + ' - <i>' + total_amount + '€</i></button>'
    + '<button class="btn--success archive_button item-fluid" onClick="openModal(\'<h3>Êtes-vous sûr ?</h3>\', function() {archive_envelop(\'' + envelop.type + '\', ' + envelop_index + ');}, \'Encaisser\')">Encaisser</button>'
  } else {
    new_html += '<button class="accordion w100">' + envelop_name + ' - <i>' + total_amount + '€</i></button>'
  }

  new_html += '</div>'
            + '<div class="panel"><ol id="' + envelop_content_id + '"></ol></div>'
          + '</div>'

  $(new_html).appendTo(envelops_section);

  for (node in envelop.envelop_content) {
    var li_node = document.createElement("LI");       // Create a <li> node

    var content = envelop.envelop_content[node].partner_name + ' : ' + envelop.envelop_content[node].amount + '€';
    if ('payment_id' in envelop.envelop_content[node]) {
      content += " - déjà comptabilisé."
    }

    var textnode = document.createTextNode(content);  // Create a text node
    li_node.appendChild(textnode);                    // Append the text to <li>
    document.getElementById(envelop_content_id).appendChild(li_node);
  }
}

// Set the envelops data according to their type
function set_envelops(envelops) {
  var cash_index = 0
  var ch_index = 0

  reset()
  for(var i= 0; i < envelops.length; i++) {
    var envelop = envelops[i].doc

    if (envelop.type == "cash") {
      cash_envelops.push(envelop)

      let split_id = envelop._id.split('_');
      let envelop_date = split_id[3] + "/" + split_id[2] + "/" + split_id[1];
      var envelop_name = 'Enveloppe du ' + envelop_date
      var envelop_content_id = 'content_cash_list_' + cash_index

      set_envelop_dom(envelop, envelop_name, envelop_content_id, cash_index)

      cash_index += 1
    } else if (envelop.type == "ch") {
      ch_envelops.push(envelop)

      var envelop_name = 'Enveloppe #' + envelop.display_id
      var envelop_content_id = 'content_ch_list_' + ch_index

      set_envelop_dom(envelop, envelop_name, envelop_content_id, ch_index)

      ch_index += 1
    }
  }

  if (cash_index == 0)
    $('#cash_envelops').html("<p class='txtcenter'>Aucune enveloppe.</p>")
  if (ch_index == 0)
    $('#ch_envelops').html("<p class='txtcenter'>Aucune enveloppe.</p>")

  // Set accordions
  var acc = document.getElementsByClassName("accordion");
  for (var i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
      /* Toggle between adding and removing the "active" class,
      to highlight the button that controls the panel */
      this.classList.toggle("active");

      /* Toggle between hiding and showing the active panel */
      var panel = this.parentNode.nextElementSibling;   // depends on html structure
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  }
}

function archive_envelop(type, index) {
  $('#envelop_cashing_error').hide()
  $('#envelop_cashing_success').hide()
  // Loading on
  openModal()

  if (type == "cash") {
    envelop = cash_envelops[index]
  } else {
    envelop = ch_envelops[index]
  }

  // Proceed to envelop cashing
  $.ajax({
    type: "POST",
    url: "/envelops/archive_envelop",
    headers: { "X-CSRFToken": getCookie("csrftoken") },
    dataType: "json",
    traditional: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(envelop),
    success: function(response) {
      closeModal()

      var display_success_alert = true
      // Handle errors when saving payments
      var error_payments = response.error_payments
      var error_message = ""
      for (var i = 0; i < error_payments.length; i++) {
        if (error_payments[i].done == false) {
          error_message += "<p>Erreur lors de l'enregistrement du paiement de <b>" + error_payments[i]['partner_name']
            + "</b> (id odoo : " + error_payments[i]['partner_id'] + ", valeur à encaisser : " + error_payments[i]['amount'] + "€)."
          error_message += "<br/><b>L'opération est à reprendre manuellement dans Odoo pour ce paiement.</b></p>"
        }
      }

      // If error during envelop deletion
      var response_envelop = response.envelop
      if (response_envelop == "error") {
        error_message += "<p>Erreur lors de la suppression de l'enveloppe.<br/>"
        error_message += "<b>Sauf contre-indication explicite, les paiements ont bien été enregistrés.</b><br/>"
        error_message += "Les paiements déjà comptabilisés ne le seront pas à nouveau, vous pouvez ré-essayer. Si l'erreur persiste, l'enveloppe devra être supprimée manuellement.</p>"
        display_success_alert = false
      }

      if (error_message !== "") {
        $('#error_alert_txt').html(error_message)
        toggle_error_alert()
      }

      if (display_success_alert) {
        toggle_success_alert()
      }
    },
    error: function() {
      closeModal()
      alert('Erreur serveur. Merci de ne pas ré-encaisser l\'enveloppe qui a causé l\'erreur.')
    }
  });
}

// Get all the envelops from couch db
function get_envelops() {
  dbc.allDocs({
    include_docs: true,
    attachments: true
  }).then(function (result) {
    set_envelops(result.rows);
  }).catch(function (err) {
    alert('Erreur lors de la récupération des enveloppes.')
    console.log(err);
  });
}

// Hande change in couc db
sync.on('change', function (info) {
  // handle change
  if (info.direction == 'pull') {
    get_envelops();
  }
}).on('error', function (err) {
  // handle error
  console.log('erreur sync')
  console.log(err)
});

$(document).ready(function() {
  if (typeof must_identify == "undefined" || coop_is_connected()) {
    get_envelops()
  }
});
