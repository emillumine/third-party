var orders = [],
    order = {
        'id' : null
    },
    table_orders = null,
    callback_update = false,
    callback_report = false,
    selection_type = null,
    order_groups = {
        _id: null,
        groups: []
    },
    dbc = null,
    sync = null;


/* UTILS */

/**
 * Wait for both ajax callbacks for reloading to avoid a js error
 *   -> reloading when ajax call not answered causes a popup to appear, which can be confusing
 */
function reload() {
    if (callback_update && callback_report)
        document.location.reload();
}

function goto(id) {
    document.location.href = "produits/" + id;
}

/**
 * Go to Products page for an existing group
 * @param {int} group_index index of group in groups array
 */
function group_goto(group_index) {
    console.log(order_groups.groups);
    // Make sure a couchdb document exists for all group's orders
    for (let i in order_groups.groups[group_index]) {
        let order_data = null;

        // Find order data
        for (let order of orders) {
            if (order.id == order_groups.groups[group_index][i]) {
                order_data = order;
            }
        }

        create_order_doc(order_data);
    }

    // go to first order
    goto(order_groups.groups[group_index][0]);
}

/**
 * Create a couchdb document for an order if it doesn't exist
 * @param {Object} order_data
 * @param {Boolean} goto if true, go to order page
 */
function create_order_doc(order_data, go_to_order = false) {
    const order_doc_id = 'order_' + order_data.id;

    dbc.get(order_doc_id).then(() => {
        if (go_to_order === true) {
            goto(order_data.id);
        }
    })
        .catch(function (err) {
        // Create if doesn't exist
            if (err.status === 404) {
                let order_doc = { ...order_data };

                order_doc._id = order_doc_id;

                dbc.put(order_doc, (err) => {
                    if (!err) {
                        if (go_to_order === true) {
                            goto(order_data.id);
                        }
                    } else {
                        error = {
                            msg: 'Erreur dans la creation de la commande dans couchdb',
                            ctx: 'validatePrices',
                            details: err
                        };
                        report_JS_error(error, 'reception');
                        console.log(error);
                    }
                });
            }
        });
}

/* ACTIONS */

/**
 * Validate all prices of an order
 */
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
            // Remove order
            dbc.get(`order_${order['id']}`).then((doc) => {
                return dbc.remove(doc);
            })
                .then(() => {
                    callback_update = true;
                    reload();
                })
                .catch((err) => {
                // No doc found
                    console.log(err);
                    reload();
                });
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

/**
 * Action fired when orders are grouped (new group)
 * @returns
 */
function group_action() {
    let pswd = prompt('Merci de demander à un.e salarié.e le mot de passe pour fusionner ces commandes.');

    // Minimum security level
    if (pswd == merge_orders_pswd) {
        let selected_data = table_orders.rows('.selected').data();
        let group_ids = [];

        for (let i = 0; i < selected_data.length; i++) {
            // Select group orders id
            group_ids.push(selected_data[i].id);

            // Create doc for each group order if doesn't exist
            create_order_doc(selected_data[i]);
        }

        group_ids.sort();

        // Save group
        order_groups.groups.push(group_ids);
        dbc.put(order_groups, (err) => {
            if (!err) {
                goto(group_ids[0]);
            } else {
                alert("Une erreur est survenue lors de la création du groupe. Veuillez ré-essayer plus tard svp.");
                console.log(err);
            }
        });

    } else if (pswd == null) {
        return;
    } else {
        alert('Mauvais mot de passe !');
    }
}

/* DISPLAY */

/**
 * Display the order groups.
 * Remove the grouped orders from the order table to prevent grouping in multiple groups.
 */
function display_grouped_orders() {
    if (table_orders !== null) {
        let groups_display_content = "<ul>";

        for (let group_index in order_groups.groups) {
            let group_orders = [];

            // Extract every order in the groups from the orders table
            for (group_order_id of order_groups.groups[group_index]) {
                // Look for order in datatable"
                for (let i = 0; i < table_orders.rows().data().length; i++) {
                    if (group_order_id == table_orders.rows(i).data()[0].id) {
                        var order = table_orders.rows(i).data()[0];

                        group_orders.push(order);

                        // remove table row
                        table_orders.rows(i).remove()
                            .draw();
                    }
                }
            }

            // Display group
            document.getElementById("container_groups").hidden = false;
            let group_row = `<li class="group_line"> Commandes de `;

            for (let i in group_orders) {
                if (i == group_orders.length-1) { // last element of list
                    group_row += "<b>" + group_orders[i].partner + "</b> du " + group_orders[i].date_order + " : ";
                } else {
                    group_row += "<b>" + group_orders[i].partner + "</b> du " + group_orders[i].date_order + ", ";
                }
            }

            if (group_orders[0].reception_status == 'False') {
                group_row += "<button class='btn--primary' onClick='group_goto("
                    + group_index
                    + ")'>Compter les produits</button>";
            } else {
                group_row += "<button class='btn--success' onClick='group_goto("
                    + group_index
                    + ")'>Mettre à jour les prix</button>";
            }

            group_row += "</li>";
            groups_display_content += group_row;
        }
        $('#container_groups').show();
        $('#groups_items').append(groups_display_content);
    }
}

/**
 * Display the main orders table
 */
function display_orders_table() {
    table_orders = $('#orders').DataTable({
        data: orders,
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
                    case 'False':
                        return "<span class='btn--primary'>Compter les produits</span>";

                    case 'done':
                        return "<span class='btn'><i class='far fa-check-circle'></i> Terminé</span>";
                    case 'uprice_valid':
                        return "<span class='btn--primary'>Mise à jour du prix OK</span>";
                    case "valid_pending":
                        return "<span class='btn--info'>En attente de validation</span>";

                    case 'legacy':
                        return "<span class='btn--success'>Legacy</span>";
                    case 'error_pack_op':
                        return "<span class='btn--danger'>Erreur pack operations</span>";

                    case 'error_transfer':
                        return "<span class='btn--danger'>Erreur de transfert</span>";
                    case 'error_picking':
                        return "<span class='btn--danger'>Erreur validation quantité</span>";
                    case '/error_uprice':
                        return "<span class='btn--danger'>Erreur mise à jour du prix</span>";

                    default:
                        return "<span class='btn--warning'>Status inconnu : " + data + "</span>";
                    }
                },
                width: "20%"
            } //error_transfert ou error_pack_op
        ],
        dom: 'rtip',
        order: [
            [
                1,
                "asc"
            ]
        ],
        iDisplayLength: 25,
        language: {url : '/static/js/datatables/french.json'}
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
            // Click action only for specific reception status
            if (row_data.reception_status == "qty_valid" || row_data.reception_status == "False") {
                // Use couchdb to pass order data to next page
                create_order_doc(row_data, true);
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
}


$(document).ready(function() {
    openModal();
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    // Init couchdb
    dbc = new PouchDB(couchdb_dbname),
    sync = PouchDB.sync(couchdb_dbname, couchdb_server, {
        live: true,
        retry: true,
        auto_compaction: false
    });

    // TODO sync on change : get data, update data & dom
    sync.on('change', function (info) {
        console.log(info);
    }).on('error', function (err) {
        console.log(err);
    });

    // TODO on button click to access order: verif fingerprint & timestamp

    // Get or create order groups doc
    dbc.get("grouped_orders").then((doc) => {
        order_groups = doc;
    })
        .catch(function (err) {
            console.log(err);
            if (err.status === 404) {
            // Create if doesn't exist
                dbc.put(order_groups, (err, result) => {
                    if (!err) {
                        order_groups._rev = result.rev;
                    } else {
                        console.log("document pour les groupes déjà créé");
                        console.log(err);
                    }
                });
            }
        });

    // Set date format for DataTable so date ordering can work
    $.fn.dataTable.moment('D/M/Y');

    // Get orders
    $.ajax({
        type: 'GET',
        url: "/reception/get_list_orders",
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            orders = data.data;
            display_orders_table();
            display_grouped_orders();
            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des commandes", ctx: 'get_list_orders'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la récupération des commandes, rechargez la page plus tard.');
        }
    });
});
