var order = {
        'id' : null
    },
    table_orders = null,
    callback_update = false,
    callback_report = false,
    selection_type = null,
    saved_groups = [];

/* UTILS */

// Wait for both ajax callbacks for reloading to avoid a js error
//  -> reloading when ajax call not answered causes a popup to appear, can be confusing
function reload() {
    if (callback_update && callback_report)
        document.location.reload();
}

function goto(id) {
    document.location.href = "produits/" + id;
}

/*
 * Go to Products page for an existing group
 * params :
 *  i : index of group in 'saved_groups' array
*/
function group_goto(i) {
    // Make sure all group's orders are saved in local storage
    for (j in saved_groups[i]) {
        set_local_storage(saved_groups[i][j]);
    }

    // go to one of group's order Products page
    goto(saved_groups[i][0].id);
}

/*
 * Set local storage for given order
 */
function set_local_storage(order_data) {
    if (Modernizr.localstorage) {
        var stored_order = JSON.parse(localStorage.getItem('order_' + order_data.id));

        // Set local storage if key doesn't exist
        if (stored_order == null) {
            localStorage.setItem("order_" + order_data.id, JSON.stringify(order_data));
        }
    }
}

/*
 * Remove from local storage orders that have a wrong status
 *  (-> order has been updated elsewhere)
 */
function clean_local_storage() {
    var stored_order = null;

    // Loop through local storage
    for (key of Object.keys(localStorage)) {
        if (key.startsWith('order_')) {
            stored_order = JSON.parse(localStorage.getItem(key));

            // Loop through orders in table to find match
            var i = 0;
            var found = false;

            while (i < table_orders.rows().data().length && !found) {
                var uptodate_order = table_orders.rows(i).data()[0];

                // If status in local storage is wrong
                if (stored_order.id == uptodate_order.id
                    && stored_order.reception_status != uptodate_order.reception_status) {

                    // Remove from local storage
                    localStorage.removeItem("order_" + uptodate_order.id);

                    // Evolution: warn user (order modified elsewhere, local data has been deleted)
                    found = true;
                }

                i++;
            }

            if (!found) {
                // Remove too if order isn't in server data
                localStorage.removeItem("order_" + stored_order.id);
            }
        }
    }
}

function create_groups_from_server_data() {
    // Get array of stored grouped orders
    var grouped_orders = JSON.parse(localStorage.getItem('grouped_orders'));

    // Create if not exists
    if (grouped_orders == null) {
        grouped_orders = [];
    } else {
        // Remove from server data groups already in local storage
        for (stored_group of grouped_orders) {
            for (sg_order_item of stored_group) {
                for (i in server_stored_groups) {
                    if (server_stored_groups[i].includes(sg_order_item)) {
                        server_stored_groups.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }

    // Add server groups to stored groups
    grouped_orders = grouped_orders.concat(server_stored_groups);
    localStorage.setItem('grouped_orders', JSON.stringify(grouped_orders));
}

/*
 * If there are groups in local storage, extract them from the table, set the groups actions.
 */
function extract_grouped_orders() {
    var saved_grouped_orders = JSON.parse(localStorage.getItem('grouped_orders'));
    var groups_to_delete = []; // indexes

    // if there are grouped orders
    if (saved_grouped_orders != null) {
        // for each group
        for (group_index in saved_grouped_orders) {
            var g = [];
            // for each order in group

            for (group_element_id of saved_grouped_orders[group_index]) {
                // Look for order in datatable
                for (var i = 0; i < table_orders.rows().data().length; i++) {
                    if (group_element_id == table_orders.rows(i).data()[0].id) {
                        var order = table_orders.rows(i).data()[0];

                        g.push(order);

                        // remove raw from table
                        table_orders.rows(i).remove()
                            .draw();
                    }
                }
            }

            // No order found, delete group and skip the rest
            if (g.length == 0) {
                groups_to_delete.push(group_index);
                continue;
            }

            // Display group
            document.getElementById("container_groups").hidden = false;
            var group_row = "<ul> <li> Commandes de ";

            for (i in g) {
                if (i == g.length-1) { // last element of list
                    group_row += "<b>" + g[i].partner + "</b> du " + g[i].date_order + " : ";
                } else {
                    group_row += "<b>" + g[i].partner + "</b> du " + g[i].date_order + ", ";
                }
            }

            if (g[0].reception_status == 'False') {
                group_row += "<button class='btn--primary' onClick='group_goto("
                    + saved_groups.length
                    + ")'>Compter les produits</button>";
            } else {
                group_row += "<button class='btn--success' onClick='group_goto("
                    + saved_groups.length
                    + ")'>Mettre à jour les prix</button>";
            }

            group_row += "</li>";
            $('#groups_items').append(group_row);

            saved_groups.push(g);
        }
    }

    if (groups_to_delete.length > 0) {
        for (index of groups_to_delete) {
            saved_grouped_orders.splice(index, 1);
        }
        localStorage.setItem('grouped_orders', JSON.stringify(saved_grouped_orders));
    }
}

/* ACTIONS */

// Validate all prices of an order
function validatePrices() {
    // Loading on
    openModal();

    var update_data = {
        'update_type' : 'br_valid',
        'orders' : {}
    };

    update_data.orders[order['id']] = { 'po' : [] };

    $.ajax({
        type: "PUT",
        url: "/reception/update_orders",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(update_data),
        success: function() {
            localStorage.removeItem("order_" + order["id"]);
            callback_update = true;
            reload();
        },
        error: function() {
            closeModal();
            alert('Erreur dans la validation des prix');
        }
    });

    // Send changes between BC and BR
    order['updated_products'] = [];

    var updates = {
        'group_amount_total' : order['amount_total'],
        'update_type' : 'br_vaid',
        'updated_products' : [],
        'user_comments': "",
        'orders' : [order]
    };

    $.ajax({
        type: "POST",
        url: "/reception/save_error_report",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(updates),
        success: function() {
            callback_report = true;
            reload();
        },
        error: function() {
            closeModal();
            alert('Erreur dans l\'envoi du rapport.');
            err = {msg: 'Erreur dans l\'envoi du rapport.', ctx: 'validatePrices'};
            report_JS_error(err, 'reception');
        }
    });
}


// Action fired when orders are grouped (new group)
function group_action() {
    var pswd = prompt('Merci de demander à un.e salarié.e le mot de passe pour fusionner ces commandes.');

    if (pswd == merge_orders_pswd) { // Minimum security level
        // Use local storage to pass order data to next page
        if (Modernizr.localstorage) {
            var selected_data = table_orders.rows('.selected').data();
            var group_ids = [];

            // Select orders id
            for (var i = 0; i < selected_data.length; i++) {
                group_ids.push(selected_data[i].id);
            }

            // Notify server that group is created
            $.ajax({
                type: "POST",
                url: "/reception/save_order_group",
                dataType: "json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(group_ids),
                success: function() {
                    var min_id = 9999999;

                    for (var i = 0; i < selected_data.length; i++) {
                        // get smallest id
                        if (selected_data[i].id < min_id) {
                            min_id = selected_data[i].id;
                        }

                        // Add each order to local storage
                        set_local_storage(selected_data[i]);
                    }

                    // Get array of grouped orders
                    var grouped_orders = JSON.parse(localStorage.getItem('grouped_orders'));

                    // Create if not exists
                    if (grouped_orders == null) {
                        grouped_orders = [];
                    }

                    // Add group
                    grouped_orders.push(group_ids);

                    // store grouped orders array
                    localStorage.setItem('grouped_orders', JSON.stringify(grouped_orders));

                    // Go to products page of order with smallest id
                    goto(min_id);
                },
                error: function(data) {
                    if (data != null && data.status == 409) {
                        alert("Un groupe a déjà été formé sur un autre poste "
                        + "avec au moins l'une des commandes sélectionnées. Merci de rafraichir la page.");
                    }
                }
            });


        } else {
            alert("Le local storage n'est pas disponible. Merci de contacter un.e salarié.e !");
        }

    } else if (pswd == null) {
        return;
    } else {
        alert('Mauvais mot de passe !');
    }
}


$(document).ready(function() {
    openModal();

    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    // Set date format for DataTable so date ordering can work
    $.fn.dataTable.moment('D/M/Y');

    table_orders = $('#orders').DataTable({
        ajax: "get_list_orders",
        columns:[
            {
                data:"id",
                title:"Sélectionner",
                className:"dt-body-center",
                render: function (data) {
                    return '<input type="checkbox" id="select_bc_'+data+'" value="'+data+'">';
                },
                width: "4%",
                orderable: false
            },
            {data:"date_order", "title":"Date Commande", "width": "8%", "className":"dt-body-center"},
            {
                data:"partner",
                title:"Fournisseur",
                render: function (data, type, full) {
                    // Add tooltip with PO over partner name
                    return '<div class="tooltip">' + data + ' <span class="tooltiptext">' + full.name + '</span> </div>';
                }
            },
            {
                data:"reception_status",
                className:"dt-body-center",
                render: function (data) {
                    if (data == "qty_valid") {
                        return "<span class='btn--danger'>Pas de prix sur le bon de livraison</span>";
                    } else {
                        return "";
                    }
                },
                orderable: false,
                width: "20%"
            },
            {
                data:"reception_status",
                title:"Statut",
                className:"dt-body-center",
                render: function (data) {
                    switch (data) {
                    case 'qty_valid':
                        return "<span class='btn--success'>Mettre à jour les prix</span>";
                    case 'br_valid':
                        return "<span class='btn'><i class='far fa-check-circle'></i> Réception OK</span>";
                    default:
                        return "<span class='btn--primary'>Compter les produits</span>";
                    }
                },
                width: "20%"
            }
        ],
        dom: 'rtip',
        order: [
            [
                1,
                "asc"
            ]
        ],
        iDisplayLength: 25,
        language: {url : '/static/js/datatables/french.json'},
        initComplete: function() { // After data is loaded
            clean_local_storage();
            create_groups_from_server_data();
            extract_grouped_orders();
            closeModal();
        }
    });

    // Set rows event on click
    $('#orders').on('click', 'tbody td', function () {
        var row_data = table_orders.row($(this)).data();

        // Click on row, except cells with button
        if (this.cellIndex < 3 || this.cellIndex == 3 && row_data.reception_status != "qty_valid") {
            // Set row as selected
            $(this.parentElement).toggleClass('selected');
            if (this.parentElement.classList.contains('selected')) {
                document.getElementById("select_bc_"+row_data.id).checked = true;
            } else {
                document.getElementById("select_bc_"+row_data.id).checked = false;
            }

            // Get selected rows
            var selected_data = table_orders.rows('.selected').data();

            // if some rows already selected
            if (selected_data.length > 0) {
                // If one row selected, set selection type
                if (selected_data.length == 1) {
                    // set selection type (in case of first select)
                    selection_type = selected_data[0].reception_status;

                    // Can't group 1 order
                    document.getElementById("group_action").hidden = true;
                } else {
                    // block selection if trying to select a BC with different status
                    if (row_data.reception_status != selection_type) {
                        // unselect
                        $(this.parentElement).toggleClass('selected');
                        document.getElementById("select_bc_"+row_data.id).checked = false;

                        alert('Vous ne pouvez pas grouper des commandes qui ont un statut différent.');
                    } else {
                        //display 'group action' button
                        document.getElementById("group_action").hidden = false;

                        // 'group action' button styling, according to orders status
                        if (selected_data[0].reception_status == 'False') {
                            document.getElementById('group_action').classList.remove('btn--success');
                            document.getElementById('group_action').classList.add('btn--primary');
                            document.getElementById('group_action').innerHTML = 'Compter les produits des commandes sélectionnées';
                        } else {
                            document.getElementById('group_action').classList.remove('btn--primary');
                            document.getElementById('group_action').classList.add('btn--success');
                            document.getElementById('group_action').innerHTML = 'Mettre à jour les prix des commandes sélectionnées';
                        }
                    }
                }

            } else {
                selection_type = null;
                document.getElementById("group_action").hidden = true;
            }
        } else if (this.cellIndex == 4) { // Click on last cell button -> go to products page
            // Extra security if order with a different status gets lost in here
            if (row_data.reception_status == "qty_valid" || row_data.reception_status == "False") {
                // Use local storage to pass order data to next page
                set_local_storage(row_data);

                goto(row_data.id);
            }
        } else if (this.cellIndex == 3 && row_data.reception_status == "qty_valid") {
            // If 'update prices' step, click on before-last cell -> validate all prices
            order = row_data;
            openModal($('#modal_no_prices').html(), validatePrices, 'Confirmer', false);
        }
    });

    // Search input
    $('#search_input').on('keyup', function () {
        table_orders
            .search(jQuery.fn.DataTable.ext.type.search.string(this.value))
            .draw();
    });


});
