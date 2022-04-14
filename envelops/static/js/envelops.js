var cash_envelops = [];
var archive_cash_envelops = [];
var ch_envelops = [];
var archive_ch_envelops = [];
var envelop_to_update = null;
var members_search_results = [];
var selected_member = null;

function reset() {
    $('#cash_envelops').empty();
    $('#ch_envelops').empty();
    $('#archive_cash_envelops').empty();
    $('#archive_ch_envelops').empty();
    archive_cash_envelops = [];
    archive_ch_envelops = [];
    cash_envelops = [];
    ch_envelops = [];
}

function toggle_error_alert() {
    $('#envelop_cashing_error').toggle(250);
}

function toggle_success_alert(message) {
    $('#envelop_cashing_success').find(".success_alert_content")
        .text(message);
    $('#envelop_cashing_success').toggle(250);
}

function toggle_deleted_alert() {
    $('#envelop_deletion_success').toggle(250);
}

/**
 * Get an envelop from the cash or cheque lists dependings on the params
 * @param {String} type
 * @param {String} index
 * @returns
 */
function get_envelop_from_type_index(type, index) {
    if (type === "cash") {
        return cash_envelops[index];
    } else {
        return ch_envelops[index];
    }
}

/**
 * Define a name for an envelop depending on its type, with or with its type
 * @param {Object} envelop
 * @param {String} name_type short | long
 * @returns
 */
function get_envelop_name(envelop, name_type = 'short') {
    let envelop_name = "";

    if (envelop.type === "cash") {
        let split_id = envelop._id.split('_');
        let envelop_date = split_id[3].padStart(2, '0') + "/" + split_id[2].padStart(2, '0') + "/" + split_id[1];

        envelop_name = `Enveloppe${(name_type === "short") ? "" : " de liquide"} du ${envelop_date}`;
    } else if (envelop.type == "ch") {
        envelop_name = `Enveloppe${(name_type === "short") ? "" : " de chèques"} #${envelop.display_id}`;
    }

    return envelop_name;
}

/**
 * Set the envelops contents on the document (could use a little cleanup someday: don't generate html in js, etc...)
 * @param {Object} envelop
 * @param {String} envelop_name
 * @param {Int} envelop_content_id
 * @param {Int} envelop_index
 */
function set_envelop_dom(envelop, envelop_name, envelop_content_id, envelop_index) {
    var envelops_section ="";

    if (!envelop.archive)
        envelops_section = $('#' + envelop.type + '_envelops');

    else
        envelops_section = $('#archive_' + envelop.type + '_envelops');

    // Calculate envelop total amount
    var total_amount = 0;

    for (partner_id in envelop.envelop_content) {
        total_amount += envelop.envelop_content[partner_id].amount;
    }

    var new_html = '<div class="envelop_section">'
    + '<div class="flex-container">';

    // Allow checking for all cash and first check envelops
    if ((envelop.type == 'cash' || envelop.type == 'ch' && envelop_index == 0) && !envelop.archive) {
        new_html += '<button class="accordion w80">' + envelop_name + ' - <i>' + total_amount + '€</i></button>'
    + '<button class="btn--success archive_button item-fluid" onClick="openModal(\'<h3>Êtes-vous sûr ?</h3>\', function() {archive_envelop(\'' + envelop.type + '\', ' + envelop_index + ');}, \'Encaisser\', false)">Encaisser</button>';
    } else if (envelop.archive ===true) {
        new_html += '<button class="accordion w100">' + envelop_name + ' - <i>' + total_amount + '€';

        if (envelop.cashing_date !== undefined) {
            new_html += ' - Encaissée le ' + envelop.cashing_date;
        }

        if (envelop.canceled) {
            new_html += ' - Enveloppe supprimée';
        }

        new_html += '</i></button>';
    } else {
        new_html += '<button class="accordion w100">' + envelop_name + ' - <i>' + total_amount + '€</i></button>';
    }

    new_html += '</div>'
        + '<div class="panel panel_' + envelop_content_id + '"><ol class="envelop_content_list" id="' + envelop_content_id + '"></ol></div>'
        + '</div>';

    $(new_html).appendTo(envelops_section);

    for (node in envelop.envelop_content) {
        var li_node = document.createElement("LI"); // Create a <li> node

        var content = envelop.envelop_content[node].partner_name + ' : ' + envelop.envelop_content[node].amount + '€';

        if ('payment_id' in envelop.envelop_content[node]) {
            content += " -- paiement comptabilisé.";
        }

        var textnode = document.createTextNode(content); // Create a text node

        li_node.appendChild(textnode); // Append the text to <li>
        document.getElementById(envelop_content_id).appendChild(li_node);
    }

    let envelop_panel = $(`.panel_${envelop_content_id}`);

    if (envelop.comments) envelop_panel.append(`<p class="envelop_comment"> <b>Commentaire :</b> ${envelop.comments}</p>`);

    if (!envelop.archive) {
        let envelop_panel = $(`.panel_${envelop_content_id}`);

        envelop_panel.append(`<button class="btn--danger delete_envelop_button item-fluid" id="update_envelop_${envelop.type}_${envelop_index}">Supprimer l'enveloppe</button>`);
        envelop_panel.append(`
            <button 
                class="btn--primary update_envelop_button item-fluid" 
                id="update_envelop_${envelop.type}_${envelop_index}"
            >
                Modifier
            </button>`);
        envelop_panel.append(`
            <button 
                class="btn--primary add_to_envelop_button item-fluid" 
                id="add_to_envelop_${envelop.type}_${envelop_index}"
            >
                Ajouter un paiement ou des parts sociales
            </button>`);

        $(".update_envelop_button").off("click");
        $(".update_envelop_button").on("click", function() {
            let el_id = $(this).attr("id")
                .split("_");

            envelop_to_update = {
                type: el_id[2],
                index: el_id[3],
                lines_to_delete: []
            };

            set_update_envelop_modal();
        });

        $(".delete_envelop_button").off("click");
        $(".delete_envelop_button").on("click", function() {
            let el_id = $(this).attr("id")
                .split("_");
            let type = el_id[2];
            let index = el_id[3];
            let envelop = get_envelop_from_type_index(type, index);

            openModal(
                "<h3>Supprimer l'enveloppe ?</h3>",
                function() {
                    archive_canceled_envelop(envelop);
                },
                'Supprimer'
            );
        });

        $(".add_to_envelop_button").off("click");
        $(".add_to_envelop_button").on("click", function() {
            let el_id = $(this).attr("id")
                .split("_");

            envelop_to_update = {
                type: el_id[el_id.length-2],
                index: el_id[el_id.length-1]
            };

            let envelop = get_envelop_from_type_index(envelop_to_update.type, envelop_to_update.index);
            let envelop_name = get_envelop_name(envelop, 'long');

            let modal_add_to_envelop = $('#templates #modal_add_to_envelop');

            modal_add_to_envelop.find(".envelop_name").text(envelop_name);

            openModal(
                modal_add_to_envelop.html(),
                () => {},
                '',
                false,
                true,
                () => {
                    envelop_to_update = null;
                    selected_member = null;
                    modal.find(".btn-modal-ok").show();
                }
            );

            // No validation button
            modal.find(".btn-modal-ok").hide();
            modal.find(".add_to_envelop_lines").empty();

            // Set action to search for the member
            modal.find('.search_member_form').submit(function() {
                let search_str = modal.find('.search_member_input').val();

                $.ajax({
                    url: '/members/search/' + search_str + "?search_type=short",
                    dataType : 'json',
                    success: function(data) {
                        members_search_results = data.res;
                        display_possible_members();
                    },
                    error: function() {
                        err = {
                            msg: "erreur serveur lors de la recherche de membres",
                            ctx: 'add_payment_to_envelop.search_members'
                        };
                        report_JS_error(err, 'envelops');

                        alert("Erreur lors de la recherche de membre, il faut ré-essayer plus tard...");
                    }
                });
            });
        });
    }
}

/**
 * Given the raw list of envelop documents, generate the cash and cheque lists
 * @param {Array} envelops
 */
function set_envelops(envelops) {
    var cash_index = 0;
    var ch_index = 0;
    var archive_cash_index = 0;
    var archive_ch_index = 0;

    reset();
    for (var i= 0; i < envelops.length; i++) {
        var envelop = envelops[i].doc;

        //If the envelop is archived and more than 1 year old we delete it
        if (envelop.archive && (new Date()-new Date(envelop.creation_date))/ (1000 * 3600 * 24 * 365)>1) {
            delete_envelop(envelop);
        } else if (envelop.type == "cash" && envelop.archive != true) {
            cash_envelops.push(envelop);

            let envelop_name = get_envelop_name(envelop);
            let envelop_content_id = 'content_cash_list_' + cash_index;

            set_envelop_dom(envelop, envelop_name, envelop_content_id, cash_index);

            cash_index += 1;
        } else if (envelop.type == "cash" && envelop.archive == true) {
            archive_cash_envelops.push(envelop);

            let envelop_name = get_envelop_name(envelop);
            let envelop_content_id = 'content_archive_cash_list_' + archive_cash_index;

            set_envelop_dom(envelop, envelop_name, envelop_content_id, archive_cash_index);
            archive_cash_index += 1;

        } else if (envelop.type == "ch" && envelop.archive != true) {
            ch_envelops.push(envelop);

            let envelop_name = get_envelop_name(envelop);
            let envelop_content_id = 'content_ch_list_' + ch_index;

            set_envelop_dom(envelop, envelop_name, envelop_content_id, ch_index);

            ch_index += 1;
        } else if (envelop.type == "ch" && envelop.archive == true) {
            archive_ch_envelops.push(envelop);

            let envelop_name = get_envelop_name(envelop);
            let envelop_content_id = 'content_archive_ch_list_' + archive_ch_index;

            set_envelop_dom(envelop, envelop_name, envelop_content_id, archive_ch_index);

            archive_ch_index += 1;

        }
    }

    if (cash_index == 0)
        $('#cash_envelops').html("<p class='txtcenter'>Aucune enveloppe.</p>");
    if (ch_index == 0)
        $('#ch_envelops').html("<p class='txtcenter'>Aucune enveloppe.</p>");

    // Set accordions
    var acc = document.getElementsByClassName("accordion");

    for (var j = 0; j < acc.length; j++) {
        acc[j].addEventListener("click", function() {
            /* Toggle between adding and removing the "active" class,
      to highlight the button that controls the panel */
            this.classList.toggle("active");

            /* Toggle between hiding and showing the active panel */
            var panel = this.parentNode.nextElementSibling; // depends on html structure

            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
}

/**
 * Generate content & set listeners for the modal to update an envelop
 */
function set_update_envelop_modal() {
    let envelop = get_envelop_from_type_index(envelop_to_update.type, envelop_to_update.index);
    let envelop_name = get_envelop_name(envelop, 'long');

    let modal_update_envelop = $('#templates #modal_update_envelop');

    modal_update_envelop.find(".envelop_name").text(envelop_name);
    modal_update_envelop.find(".envelop_lines").empty();

    let update_line_template = $('#templates #update_envelop_line_template');

    let cpt = 1;

    for (let partner_id in envelop.envelop_content) {
        let line = envelop.envelop_content[partner_id];

        update_line_template.find(".update_envelop_line").attr('id', `update_line_${partner_id}`);
        update_line_template.find(".line_number").html(`${cpt}.&nbsp;`);
        update_line_template.find(".line_partner_name").text(line.partner_name);

        modal_update_envelop.find(".envelop_lines").append(update_line_template.html());

        cpt += 1;
    }

    openModal(
        modal_update_envelop.html(),
        () => {
            update_envelop_action();
        },
        'Mettre à jour',
        true,
        true,
        () => {
            envelop_to_update = null;
        }
    );

    // Elements needs to be on the document so value & listeners can be set
    for (let partner_id in envelop.envelop_content) {
        let line = envelop.envelop_content[partner_id];

        $(`#update_line_${partner_id}`).find('.line_partner_amount')
            .val(line.amount);
    }

    modal.find('.envelop_comments').val((envelop.comments !== undefined) ? envelop.comments : '');

    $(".delete_envelop_line_icon").off("click");
    $(".delete_envelop_line_icon").on("click", function() {
        let line_id = $(this).closest(".update_envelop_line")
            .attr("id")
            .split("_");
        let partner_id = line_id[line_id.length-1];

        envelop_to_update.lines_to_delete.push(partner_id);

        $(this).hide();
        $(this).closest(".update_envelop_line")
            .find(".deleted_line_through")
            .show();
    });
}

/**
 * Update an envelop data with modal data
 */
function update_envelop_action() {
    if (is_time_to('update_envelop_action', 1000)) {
        let envelop = get_envelop_from_type_index(envelop_to_update.type, envelop_to_update.index);

        // Update lines amounts
        let amount_inputs = modal.find('.line_partner_amount');

        amount_inputs.each(function (i, e) {
            let line_id = $(e).closest(".update_envelop_line")
                .attr("id")
                .split("_");
            let partner_id = line_id[line_id.length-1];

            envelop.envelop_content[partner_id].amount = parseInt($(e).val());
        });

        // Delete lines
        for (let partner_id of envelop_to_update.lines_to_delete) {
            delete(envelop.envelop_content[partner_id]);
        }

        // Envelop comments
        envelop.comments = modal.find('.envelop_comments').val();

        update_envelop(envelop);
        toggle_success_alert("Enveloppe modifiée !");
    }
}

/**
 * Update an envelop in couchdb
 * @param {Object} envelop
 */
function update_envelop(envelop) {
    if (is_time_to('update_envelop', 1000)) {
        dbc.put(envelop, function callback(err, result) {
            envelop_to_update = null;

            if (!err && result !== undefined) {
                get_envelops();
            } else {
                alert("Erreur lors de la mise à jour de l'enveloppe. Si l'erreur persiste contactez un administrateur svp.");
                console.log(err);
            }
        });
    }
}

/**
 * archive and canceled an envelop from couchdb.
 * @param {Object} envelop
 */
function archive_canceled_envelop(envelop) {
    if (is_time_to('archive_canceled_envelop', 1000)) {
        envelop.archive = true;
        envelop.canceled = true;

        dbc.put(envelop, function callback(err, result) {
            if (!err && result !== undefined) {
                toggle_deleted_alert();
                get_envelops();
            } else {
                alert("Erreur lors de la suppression de l'enveloppe... Essaye de recharger la page et réessaye.");
                console.log(err);
            }
        });

    }
}

/**
 * Delete an envelop from couchdb.
 * @param {Object} envelop
 */
function delete_envelop(envelop) {
    if (is_time_to('delete_envelop', 1000)) {
        envelop._deleted = true;

        dbc.put(envelop, function callback(err, result) {
            if (!err && result !== undefined) {
                get_envelops();
            } else {
                alert("Erreur lors de la suppression de l'enveloppe... Essaye de recharger la page et réessaye.");
                console.log(err);
            }
        });

    }
}

/**
 * Send the request to save an envelop payments in Odoo. The envelop will be deleted from couchdb.
 * @param {String} type
 * @param {String} index
 */
function archive_envelop(type, index) {
    if (is_time_to('archive_envelop', 5000)) {
        $('#envelop_cashing_error').hide();
        $('#envelop_cashing_success').hide();
        // Loading on
        openModal();

        let envelop = get_envelop_from_type_index(type, index);

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
                closeModal();

                var display_success_alert = true;
                // Handle errors when saving payments
                var error_payments = response.error_payments;
                var error_message = "";

                for (var i = 0; i < error_payments.length; i++) {
                    if (error_payments[i].done == false) {
                        error_message += "<p>Erreur lors de l'enregistrement du paiement de <b>" + error_payments[i]['partner_name']
                + "</b> (id odoo : " + error_payments[i]['partner_id'] + ", valeur à encaisser : " + error_payments[i]['amount'] + "€).";
                        error_message += "<br/><b>L'opération est à reprendre manuellement dans Odoo pour ce paiement.</b>";

                        if ('error' in error_payments[i]) {
                            error_message += `<br/>(error: ${error_payments[i]['error']})`;
                        }

                        error_message += "</p>";
                    }
                }

                // If error during envelop deletion
                var response_envelop = response.envelop;

                if (response_envelop == "error") {
                    error_message += "<p>Erreur lors de la suppression de l'enveloppe.<br/>";
                    error_message += "<b>Sauf contre-indication explicite, les paiements ont bien été enregistrés.</b><br/>";
                    error_message += "Les paiements déjà comptabilisés ne le seront pas à nouveau, vous pouvez ré-essayer. Si l'erreur persiste, l'enveloppe devra être supprimée manuellement.</p>";
                    display_success_alert = false;
                }

                if (error_message !== "") {
                    $('#error_alert_txt').html(error_message);
                    toggle_error_alert();
                }

                if (display_success_alert) {
                    toggle_success_alert("Enveloppe encaissée !");
                }
            },
            error: function() {
                closeModal();
                alert('Erreur serveur. Merci de ne pas ré-encaisser l\'enveloppe qui a causé l\'erreur.');
            }
        });
    } else {
        alert("Par sécurité, il faut attendre 5s entre l'encaissement de deux enveloppes.");
    }
}

/**
 * Get all the envelops from couchdb
 */
function get_envelops() {
    dbc.allDocs({
        include_docs: true,
        attachments: true
    }).then(function (result) {
        set_envelops(result.rows);
    })
        .catch(function (err) {
            alert('Erreur lors de la récupération des enveloppes.');
            console.log(err);
        });
}

/**
 * Display the members from the search result in the "add payments to envelop" modal
 */
function display_possible_members() {
    modal.find('.search_member_results_area').show();
    modal.find('.search_member_results').empty();

    if (members_search_results.length > 0) {
        $(".search_results_text").show();

        for (member of members_search_results) {
            // Display results (possible members) as buttons
            var member_button = '<button class="btn--success btn_possible_member" member_id="'
                + member.id + '">'
                + member.barcode_base + ' - ' + member.name
                + '</button>';

            $('.search_member_results').append(member_button);
        }

        // Set action on member button click
        $('.btn_possible_member').on('click', function() {
            const mid = $(this).attr('member_id');

            selected_member = members_search_results.find(m => m.id == mid);
            members_search_results = [];

            modal.find('.search_member_input').val('');
            modal.find('.search_member_results').empty();
            modal.find('.search_member_results_area').hide();

            // Adding line for this member in modal...
            display_line_add_payment();
        });
    } else {
        $(".search_results_text").hide();
        $('.search_member_results').html(`<p>
            <i>Aucun résultat ! Vérifiez votre recherche...</i>
        </p>`);
    }
}

/**
 * Display a line for adding a member's payment in the "add payments to envelop" modal
 */
function display_line_add_payment() {
    let envelop = get_envelop_from_type_index(envelop_to_update.type, envelop_to_update.index);

    // Block adding payment if member is already in the envelop
    for (let env_partner_id in envelop.envelop_content) {
        if (env_partner_id == selected_member.id) {
            alert("Ce membre est déjà dans l'enveloppe, impossible de lui rajouter un paiement.\nVous pouvez modifier le montant de son paiement dans la fenêtre de modification de l'enveloppe.");

            return -1;
        }
    }

    modal.find('.search_member_area').hide();

    let modal_line = $('#templates #add_to_envelop_line_template');

    modal_line.find(".line_partner_name").text(selected_member.name);

    modal.find(".add_to_envelop_lines").append(modal_line.html());
    modal.find(".add_to_envelop_lines_area").show();

    // Add payment button
    $('.add_payment_button').off('click');
    $('.add_payment_button').on('click', function() {
        let amount = parseInt(modal.find(".line_partner_amount").val(), 10);

        if (isNaN(amount)) {
            modal.find(".line_partner_amount_error").show();
        } else {
            modal.find(".line_partner_amount_error").hide();

            let modal_confirm_add_payment = $('#templates #modal_confirm_add_payment');

            modal_confirm_add_payment.find(".amount").text(amount);
            modal_confirm_add_payment.find(".member").text(selected_member.name);
            modal_confirm_add_payment.find(".envelop").text(get_envelop_name(envelop, 'long'));

            openModal(
                modal_confirm_add_payment.html(),
                () => {
                    add_payment_to_envelop(amount, envelop);
                },
                "Confirmer"
            );

            modal.find(".btn-modal-ok").show();
        }
    });

    // Add shares button
    $('.add_shares_button').off('click');
    $('.add_shares_button').on('click', function() {
        let amount = parseInt(modal.find(".line_partner_amount").val(), 10);

        if (isNaN(amount)) {
            modal.find(".line_partner_amount_error").show();
        } else {
            modal.find(".line_partner_amount_error").hide();

            let modal_confirm_add_shares = $('#templates #modal_confirm_add_shares');

            modal_confirm_add_shares.find(".amount").text(amount);
            modal_confirm_add_shares.find(".member").text(selected_member.name);
            modal_confirm_add_shares.find(".envelop").text(get_envelop_name(envelop, 'long'));

            openModal(
                modal_confirm_add_shares.html(),
                () => {
                    add_shares_to_member(amount, envelop);
                },
                "Confirmer",
                false
            );

            modal.find(".btn-modal-ok").show();
        }
    });

    return null;
}

/**
 * Add a payment in an envelop & save in couchdb
 * @param {Int} amount
 * @param {Object} envelop
 * @param {Int} invoice_id
 * @param {String} message
 */
function add_payment_to_envelop(amount, envelop, invoice_id=null, message="Paiement ajouté !") {
    if (is_time_to('add_payment_to_envelop', 1000)) {
        envelop.envelop_content[selected_member.id] = {
            partner_name: selected_member.name,
            amount: amount
        };
        if (invoice_id != null) {
            envelop.envelop_content[selected_member.id].invoice_id = invoice_id;
        }
        update_envelop(envelop);
        toggle_success_alert(message);

        envelop_to_update = null;
        selected_member = null;

        get_envelops();
    }
}

/**
 * Send request to add shares & then add payment
 * @param {Int} amount
 * @param {Object} envelop
 */
function add_shares_to_member(amount, envelop) {
    if (is_time_to('add_shares_to_member', 1000)) {
        openModal();

        data = {
            partner_id: selected_member.id,
            amount: amount
        };

        $.ajax({
            type: "POST",
            url: "/members/add_shares_to_member",
            headers: { "X-CSRFToken": getCookie("csrftoken") },
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(data),
            success: function(response) {
                closeModal();

                invoice_id = response[0];
                add_payment_to_envelop(amount, envelop, invoice_id, "Parts sociales ajoutées !");
            },
            error: function() {
                closeModal();
                alert('Un erreur est survenue lors de l\'ajout de parts sociales.');
            }
        });
    }
}

$(document).ready(function() {
    if (typeof must_identify == "undefined" || coop_is_connected()) {
        get_envelops();

        // Hande change in couc db
        sync.on('change', function (info) {
            // handle change
            if (info.direction == 'pull') {
                get_envelops();
            }
        }).on('error', function (err) {
            // handle error
            console.log('erreur sync');
            console.log(err);
        });
    }
});
