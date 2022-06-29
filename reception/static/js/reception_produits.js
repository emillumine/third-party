/*
Logique :
Cette page peut avoir à traiter un groupe de commandes ou une unique commande.
Pour garder une unique logique, une commande unique sera considérée comme
  un groupe de une commande.

Sémantiquement, ici :
  list_to_process représente la liste des produits à réceptionner
  list_processed la liste des produit déjà réceptionnés
*/

/**
* Associative array of current order(s)
* If more than 1 element: group of orders
* If 1 element: single order
*/
var orders = {},
    group_ids = [];

var reception_status = null,
    list_to_process = [],
    list_processed = [],
    table_to_process = null,
    table_processed = null,
    editing_product = null, // Store the product currently being edited
    editing_origin = null, // Keep track of where editing_product comes from
    processed_row_counter = 0, // Order in which products were added in processed list
    user_comments = "",
    updatedProducts = [], // Keep record of updated products
    validProducts = [], // Keep record of directly validated products
    updateType = "", // step 1: qty_valid; step2: br_valid
    barcodes = null, // Barcodes stored locally
    priceToWeightIsCorrect = true,
    suppliers_products = [], // All products of current order(s) supplier(s)
    products_to_add = []; // Products to add to order

var dbc = null,
    sync = null,
    fingerprint = null;

/* UTILS */

function back() {
    document.location.href = "/reception";
}

/**
 * Dingle order or grouped orders?
 * @returns Boolean
 */
function is_grouped_order() {
    return Object.keys(orders).length > 1;
}

/**
 * Get distinct suppliers id of current orders
 * @returns Boolean
 */
function get_suppliers_id() {
    let suppliers_id = [];

    for (var order_id in orders) {
        if ('partner_id' in orders[order_id]) { // check for versions transition
            suppliers_id.push(orders[order_id].partner_id);
        }
    }

    return suppliers_id;
}

/** Search if the product being edited is already in the updated products.
  * Returns its index or -1.
  */
function searchUpdatedProduct() {
    try {
        if (editing_product != null) {
            for (var i=0; i < updatedProducts.length; i++) {
                if (updatedProducts[i].product_id[0] == editing_product.product_id[0]) {
                    return i;
                }
            }
        }
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'searchUpdatedProduct'};
        console.error(err);
        report_JS_error(err, 'reception');
    }

    return -1;
}

// Directly send a line to edition when barcode is read
function select_product_from_bc(barcode) {
    try {
        if (editing_product == null) {
            var scannedProduct = barcodes.get_corresponding_odoo_product(barcode);

            priceToWeightIsCorrect = true;

            if (scannedProduct == null) {
                alert("Le code-barre " + barcode + " ne correspond à aucun article connu.");

                return -1;
            }

            var foundProduct = {data: null, place: null};

            // Does the product come from to_process ?
            $.each(list_to_process, function(i, e) {
                if (e.product_id[0] == scannedProduct.data[barcodes['keys']['id']]) {
                    foundProduct.data = e;
                    foundProduct.place = 'to_process';
                }
            });

            // Does the product come from processed ?
            if (foundProduct.data == null) {
                $.each(list_processed, function(i, e) {
                    if (e.product_id[0] == scannedProduct.data[barcodes['keys']['id']]) {
                        foundProduct.data = JSON.parse(JSON.stringify(e));
                        foundProduct.data.product_qty = null; // Set qty to null from product already scanned
                        foundProduct.place = 'processed';
                    }
                });
            }

            if (foundProduct.data !== null) {
                if (foundProduct.data.product_uom[0] == 21) { //if qty is in weight
                    if (scannedProduct.rule === 'weight') {
                        editing_product = foundProduct.data;
                        foundProduct.weightAddition = true; // product weight is directly added
                        editProductInfo(foundProduct.data, scannedProduct.qty);
                        editing_product = null;
                    } else if (scannedProduct.rule === 'price_to_weight') {
                        openModal($('#templates #modal_confirm_price_to_weight').html(), price_to_weight_is_wrong, 'Non', false, true, price_to_weight_confirmed_callback(foundProduct, scannedProduct));
                        setupPopUpBtnStyle(scannedProduct);
                    }
                }

                if (scannedProduct.rule !== 'price_to_weight') {
                    if (foundProduct.data.product_uom[0] != 21) {
                        setLineEdition(foundProduct.data);
                    }

                    if (foundProduct.place === 'to_process') {
                        let row = table_to_process.row($('#'+foundProduct.data.product_id[0]));

                        remove_from_toProcess(row, foundProduct.data);
                    }
                    // Don't remove product from processed list
                }
            }
        }
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'select_product_from_bc'};
        console.error(err);
        report_JS_error(err, 'reception');
    }

    return 0;
}

/**
 * Update couchdb order
 * @param {int} order_id
 */
function update_distant_order(order_id) {
    orders[order_id].last_update = {
        timestamp: Date.now(),
        fingerprint: fingerprint
    };

    dbc.put(orders[order_id], (err, result) => {
        if (!err && result !== undefined) {
            orders[order_id]._rev = result.rev;
        } else {
            alert("Erreur lors de la sauvegarde de la commande... Si l'erreur persiste contactez un administrateur svp.");
            console.log(err);
        }
    });
}

/**
 * Update distant orders with local data
 * @param {int} order_id
 */
function update_distant_orders() {
    for (let order_id in orders) {
        orders[order_id].last_update = {
            timestamp: Date.now(),
            fingerprint: fingerprint
        };
    }

    dbc.bulkDocs(Object.values(orders)).then((response) => {
        // Update rev of current orders after their update
        for (let doc of response) {
            let order_id = doc.id.split('_')[1];

            orders[order_id]._rev = doc.rev;
        }
    })
        .catch((err) => {
            console.log(err);
        });
}

function price_to_weight_confirmed_callback(foundProduct, scannedProduct) {
    return function() {
        let newQty = null;

        if (priceToWeightIsCorrect) {
            newQty = scannedProduct.qty;
        } else {
            let tmp = Number((scannedProduct.value/document.getElementById("new_price_to_weight").value).toFixed(3));

            if (isFinite(tmp)) {
                newQty = tmp;
            }
        }

        if (foundProduct.data !== null && newQty != null) {
            if (foundProduct.place === 'to_process') {
                let row = table_to_process.row($('#'+foundProduct.data.product_id[0]));

                remove_from_toProcess(row, foundProduct.data);
            }
            editing_product = foundProduct.data;
            editProductInfo(foundProduct.data, newQty);
            editing_product = null;
            resetPopUpButtons();
        }
    };
}

function price_to_weight_is_wrong() {
    document.getElementById("new_price_to_weight").style.display = "";
    document.getElementsByClassName("btn--success")[0].style.display = "none";
    document.querySelector('#modal_closebtn_bottom').innerHTML = 'OK';
    priceToWeightIsCorrect = false;
}

function setupPopUpBtnStyle(p) {
    //On inverse en quelque sorte les boutons succes et d'annulation en mettant "Oui" sur le btn d'annulation
    // et "Non" sur le bouton de reussite.
    //Cela nous permet de reecrire moins de code puisque si la reponse est Oui on ne veut
    //rien modifier et sortir du pop up, ce qui correspond au comportement du bouton annulation
    //(ou aussi appeler cancel button)

    document.querySelector('#modal_closebtn_bottom').innerHTML = 'Oui';
    document.getElementById("modal_closebtn_bottom").style.backgroundColor = "green";
    document.getElementsByClassName("btn--success")[0].style.backgroundColor = "red";

    document.querySelector('#product_to_verify').innerHTML = p.data[0];
    document.querySelector('#price_to_verify').innerHTML = p.data[6];

    document.getElementById("new_price_to_weight").style.display = "none";
    document.getElementsByClassName("btn--success")[0].style.display = "";
}

function resetPopUpButtons() {
    document.getElementsByClassName("btn--success")[0].style.display = "";
    document.getElementsByClassName("btn--success")[0].style.backgroundColor = "";
    document.querySelector('#modal_closebtn_bottom').style.backgroundColor = "";
}

/* FETCH SERVER DATA */

/**
 * Get order(s) data from server
 * @param {Array} po_ids if set, fetch data for these po only
 */
function fetch_data(po_ids = null) {
    let po_to_fetch = (po_ids === null) ? group_ids : po_ids;

    try {
        $.ajax({
            type: 'POST',
            url: '../get_orders_lines',
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({'po_ids' : po_to_fetch}),
            success: function(data) {
                // for each order
                for (order_data of data.orders) {
                    // for each product in order
                    for (i in order_data.po) {
                        // If in step 2, find old qty in previous step data
                        if (
                            reception_status == 'qty_valid'
                            && "previous_steps_data" in orders[order_data.id_po]
                            && "False" in orders[order_data.id_po]["previous_steps_data"]
                            && "updated_products" in orders[order_data.id_po]["previous_steps_data"]["False"] // extra + secturity
                        ) {
                            // For each updated product in step 1
                            for (let step1_updated_product of orders[order_data.id_po]["previous_steps_data"]["False"]["updated_products"]) {
                                // If product found
                                if (step1_updated_product["product_id"][0] === order_data.po[i]["product_id"][0]) {
                                    // Add old qty
                                    order_data.po[i].old_qty = step1_updated_product.old_qty;
                                }
                            }
                        }

                        // Does product already exists in list_to_process?
                        var existing_index = null;

                        for (var j = 0; j < list_to_process.length; j++) {
                            if (order_data.po[i].product_id[0] == list_to_process[j].product_id[0]) {
                                existing_index = j;
                                break;
                            }
                        }

                        // Products already exists: it is present in different orders
                        if (existing_index != null) {
                            // Add order id and product id to product list for other orders data
                            if (!('other_orders_data' in list_to_process[existing_index])) {
                                list_to_process[existing_index]['other_orders_data'] = [];
                            }

                            list_to_process[existing_index].other_orders_data.push({
                                id_po : order_data.id_po,
                                id_product : order_data.po[i].id,
                                initial_qty : order_data.po[i].product_qty
                            });

                            // If in step 1, concatenate qty in list_to_process
                            if (reception_status == 'False') {
                                list_to_process[existing_index].product_qty += order_data.po[i].product_qty;
                                list_to_process[existing_index].package_qty += order_data.po[i].package_qty;
                                list_to_process[existing_index].product_qty_package += order_data.po[i].product_qty_package;
                            }

                        } else {
                            // Add order key in products
                            let order_full_data = orders[order_data.id_po];

                            order_data.po[i].order_key = order_full_data.key;

                            // Add product to list_to_process
                            list_to_process.push(order_data.po[i]);

                            // Save order id to keep track of where product comes from
                            list_to_process[list_to_process.length-1]['id_po'] = order_data.id_po;
                        }
                    }
                }

                initLists();
            },
            error: function() {
                alert('Les données n\'ont pas pu être récupérées, réessayez plus tard.');
            }
        });
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'fetch_data'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}

// Load barcodes at page loading, then barcodes are stored locally
var get_barcodes = async function() {
    if (barcodes == null) barcodes = await init_barcodes();
};

// Get labels to print for current orders from server
function get_pdf_labels() {
    try {
        if (is_time_to('print_pdf_labels', 10000)) {
            // Concatenate orders id into a string, separated with comas, to retrieve
            oids = group_ids.join(',');

            // Send request & diret download pdf
            var filename = "codebarres_" + group_ids[0] + ".pdf";

            $.ajax({
                url: "../../orders/get_pdf_labels?oids=" + oids,
                success: download.bind(true, "pdf", filename)
            });
        } else {
            alert("Vous avez cliqué il y a moins de 10s... Patience, la demande est en cours de traitement.");
        }
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'get_pdf_labels'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}

/**
 * Get products of order(s) supplier(s) if not already fetched
 */
function fetch_suppliers_products() {
    if (suppliers_products.length === 0) {
        openModal();

        let suppliers_id = get_suppliers_id();

        // Fetch supplier products
        $.ajax({
            type: 'GET',
            url: "/orders/get_supplier_products",
            data: {
                sids: suppliers_id
            },
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                suppliers_products = data.res.products;

                // Filter supplier products on products already in orders
                suppliers_products = suppliers_products.filter(p => list_to_process.findIndex(ptp => ptp.product_id[1] === p.name) === -1);
                suppliers_products = suppliers_products.filter(p => list_processed.findIndex(pp => pp.product_id[1] === p.name) === -1);

                closeModal();
                set_add_products_modal();
            },
            error: function(data) {
                err = {msg: "erreur serveur lors de la récupération des produits du fournisseur", ctx: 'get_supplier_products'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'reception');

                closeModal();
                alert('Erreur lors de la récupération des produits, réessayer plus tard.');
            }
        });
    } else {
        set_add_products_modal();
    }
}

/* LISTS HANDLING */

// Init Data & listeners
function initLists() {
    try {
        // Set action buttons for remaining items
        if (
            add_all_left_is_good_qties === "True" && reception_status == "False"
            ||
            add_all_left_is_good_prices === "True" && reception_status == "qty_valid"
        ) {
            $("#remaining_lines_actions_area").addClass("connected_actions");
            $("#all_left_is_good").show();
        }

        // Enable validation buttons now the data's here
        if (reception_status == "False") {
            document.getElementById("valid_qty").disabled = false;
            document.getElementById("valid_all_qties").disabled = false;
        } else if (reception_status == "qty_valid") {
            document.getElementById("valid_uprice").disabled = false;
            document.getElementById("valid_all_uprices").disabled = false;
        }

        // Set processed and to_process lists based on saved data
        for (var i = 0; i < updatedProducts.length; i++) {
            let product = updatedProducts[i];

            product['row_counter'] = -1;
            list_processed.push(product);
            let toProcess_index = list_to_process.findIndex(x => x.id == updatedProducts[i]['id']);

            if (toProcess_index > -1) {
                list_to_process.splice(toProcess_index, 1);
            }
        }

        for (var j = 0; j < validProducts.length; j++) {
            let toProcess_index = list_to_process.findIndex(x => x.id == validProducts[j]);

            if (toProcess_index > -1) {
                let product = list_to_process[toProcess_index];

                product['row_counter'] = -1;
                list_processed.push(product);
                list_to_process.splice(toProcess_index, 1);
            }
        }

        let columns_to_process = [];
        let columns_processed = [];

        // In case of group orders, add "Order" as first column for ordering
        if (is_grouped_order()) {
            columns_to_process.push({
                data:"order_key", title: "n°", className: "dt-body-center",
                width: "15px"
            });
        }

        columns_to_process = columns_to_process.concat([
            {data:"product_id.0", title: "id", visible: false},
            {data:"shelf_sortorder", title: "Rayon", className: "dt-body-center", width: "4%"},
            {
                data:"product_id.1",
                title:"Produit",
                render: function (data, type, full) {
                    // Add tooltip with barcode over product name
                    let display_barcode = "Aucun";

                    if ('barcode' in full) {
                        display_barcode = full.barcode;
                    }

                    return '<div class="tooltip">' + data
                        + ' <span class="tooltiptext tt_twolines">Code barre : '
                        + display_barcode + '</span> </div>';
                }
            },
            { data:"product_uom.1",
                title: "Unité vente",
                className:"dt-body-center",
                orderable: false,
                width: "5%",
                render: function (data) {
                    if (display_autres === "True" && data.toLowerCase().indexOf('unit') === 0) {
                        return "U";
                    } else {
                        return data;
                    }
                }
            },
            {
                data:"product_qty",
                title: "Qté",
                className:"dt-body-center",
                width: "5%",
                render: function (data, type, full) {
                    if (reception_status == "False") {
                        return data;
                    } else if ("old_qty" in full) {
                        return `${data}/${full.old_qty}`;
                    } else {
                        return `${data}/${data}`;
                    }
                }
            },
            {
                data:"price_unit",
                title:"Prix unit.",
                className:"dt-body-center",
                visible: (reception_status == "qty_valid"),
                width: "5%"
            },
            {
                title:"Editer",
                defaultContent: "<a class='btn toProcess_line_edit' href='#'><i class='far fa-edit'></i></a>",
                className:"dt-body-center",
                orderable: false,
                width: "5%"
            },
            {
                title:"Valider",
                defaultContent: "<a class='btn toProcess_line_valid' href='#'><i class='far fa-check-square'></i></a>",
                className:"dt-body-center",
                orderable: false,
                width: "5%"
            },
            {
                title:"",
                defaultContent: "<select class='select_product_action'><option value=''></option><option value='supplier_shortage'>Rupture fournisseur</option></select>",
                className:"dt-body-center",
                orderable: false,
                visible: display_autres === "True",
                width: "5%"
            }
        ]);

        columns_processed = [
            {data:"row_counter", title:"row_counter", visible: false}, // Hidden counter to display last row first
            {data:"shelf_sortorder", title: "Rayon", className:"dt-body-center", width: "4%"},
            {
                data:"product_id.1",
                title:"Produit",
                // width: "55%",
                render: function (data, type, full) {
                    // Add tooltip with barcode over product name
                    let display_barcode = "Aucun";

                    if ('barcode' in full) {
                        display_barcode = full.barcode;
                    }

                    let display = '<div class="tooltip">' + data
                                  + ' <span class="tooltiptext tt_twolines">Code barre : '
                                  + display_barcode + '</span> </div>';

                    if (full.supplier_shortage) {
                        display += ' <div class="tooltip"><i class="fas fa-info-circle"></i>'
                                  + ' <span class="tooltiptext tt_twolines">Rupture fournisseur'
                                  + '</span> </div>';
                    }

                    return display;
                }
            },
            {data:"product_uom.1", title: "Unité vente", className:"dt-body-center", orderable: false, width: "5%"},
            {
                data:"product_qty",
                title:"Qté",
                className:"dt-head-center dt-body-center",
                width: "5%",
                // visible: (reception_status == "False"),
                render: function (data, type, full) {
                    let disp = [
                        data,
                        (full.old_qty !== undefined) ? full.old_qty : data
                    ].join("/");

                    return disp;
                },
                orderable: false
            },
            {
                data:"price_unit",
                title:"Prix unit",
                className:"dt-body-center",
                visible: (reception_status == "qty_valid"),
                width: "5%",
            },
            {
                title:"Editer",
                defaultContent: "<a class='btn' id='processed_line_edit' href='#'><i class='far fa-edit'></i></a>",
                className:"dt-body-center",
                orderable: false,
                width: "5%",
            },
            {
                title:"Autres",
                className:"dt-body-center",
                orderable: false,
                visible: display_autres === "True",
                render: function (data, type, full) {
                    let disabled = (full.supplier_shortage) ? "disabled" : '';

                    return "<select class='select_product_action'>"
                          + "<option value=''></option>"
                          + "<option value='supplier_shortage' "+disabled+">Rupture fournisseur</option>"
                          + "</select>";
                }
            }
        ];

        // Init table for to_process content
        table_to_process = $('#table_to_process').DataTable({
            data: list_to_process,
            columns: columns_to_process,
            rowId : "product_id.0",
            order: [
                [
                    0,
                    "asc"
                ]
            ],
            scrollY: "33vh",
            scrollCollapse: true,
            paging: false,
            dom: 'lrtip', // Remove the search input from that table
            language: {url : '/static/js/datatables/french.json'},
            createdRow: function(row) {
                // Add class to rows with product with qty at 0
                var row_data = $('#table_to_process').DataTable()
                    .row(row)
                    .data();

                if (row_data !== undefined && row_data.product_qty === 0) {
                    for (var i = 0; i < row.cells.length; i++) {
                        const cell_node = row.cells[i];

                        $(cell_node).addClass('row_product_no_qty');
                    }
                }
            }
        });

        // Init table for processed content
        table_processed = $('#table_processed').DataTable({
            data: list_processed,
            columns: columns_processed,
            rowId : "product_id.0",
            order: [
                [
                    0,
                    "desc"
                ]
            ],
            scrollY: "28vh",
            scrollCollapse: true,
            paging: false,
            dom: 'lrtip', // Remove the search input from that table
            language: {url : '/static/js/datatables/french.json'},
            createdRow: function(row) {
                var row_data = $('#table_processed').DataTable()
                    .row(row)
                    .data();

                if (row_data !== undefined && row_data.product_qty === 0) {
                    for (var i = 0; i < row.cells.length; i++) {
                        const cell_node = row.cells[i];

                        $(cell_node).addClass('row_product_no_qty');
                    }
                }
            }
        });
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'initLists: init tables'};
        console.error(err);
        report_JS_error(err, 'reception');
    }

    /* Listeners */
    // Direct valid from to_process
    $('#table_to_process tbody').on('click', 'a.toProcess_line_valid', function () {
        if (is_time_to('reception_direct_valid_order_line', 500)) {
            try {
                let row = table_to_process.row($(this).parents('tr'));
                let data = row.data();

                add_to_processed(data);
                remove_from_toProcess(row, data);

                // Update product's order
                if (!orders[data.id_po]['valid_products']) {
                    orders[data.id_po]['valid_products'] = [];
                }
                orders[data.id_po]['valid_products'].push(data['id']);
                update_distant_order(data.id_po);

                // Reset search
                document.getElementById('search_input').value = '';
                $('table.dataTable').DataTable()
                    .search('')
                    .draw();

                // Re set focus on input
                document.getElementById('search_input').focus();
            } catch (e) {
                err = {msg: e.name + ' : ' + e.message, ctx: 'initLists: listener validate line'};
                console.error(err);
                report_JS_error(err, 'reception');
            }
        }
    });

    // Edit to_process line
    $('#table_to_process tbody').on('click', 'a.toProcess_line_edit', function () {
        try {
            // Prevent editing mutiple lines at a time
            if (editing_product == null) {
                var row = table_to_process.row($(this).parents('tr'));
                var data = row.data();

                // Product goes to editing
                editing_origin = "to_process";
                setLineEdition(data);
                remove_from_toProcess(row, data);

                document.getElementById('search_input').value = '';
                $('table.dataTable').DataTable()
                    .search('')
                    .draw();
            }
        } catch (e) {
            err = {msg: e.name + ' : ' + e.message, ctx: 'initLists : listener edit line from list to process'};
            console.error(err);
            report_JS_error(err, 'reception');
        }
    });

    $('#table_to_process tbody').on('change', '.select_product_action', function () {
        try {
            if ($(this).val() == 'supplier_shortage') {
                var row = table_to_process.row($(this).parents('tr'));
                var data = row.data();

                var modal_shortage = $('#modal_set_supplier_shortage');

                modal_shortage.find(".supplier_shortage_product").text(' ' + data.product_id[1]);
                modal_shortage.find(".supplier_shortage_supplier").text(' ' + data.partner_id[1]);

                openModal(
                    modal_shortage.html(),
                    function() {
                        set_supplier_shortage(row, data);
                    },
                    'Valider',
                    true,
                    true,
                    function() {
                        $(".select_product_action").val('');
                    }
                );
            }
        } catch (e) {
            err = {msg: e.name + ' : ' + e.message, ctx: 'initLists : listener set supplier shortage'};
            console.error(err);
            report_JS_error(err, 'reception');
        }
    });


    // Edit processed line
    $('#table_processed tbody').on('click', 'a#processed_line_edit', function () {
        try {
            // Prevent editing mutiple lines at a time
            if (editing_product == null) {
                var row = table_processed.row($(this).parents('tr'));
                var data = row.data();

                //Go to editing
                editing_origin = "processed";
                setLineEdition(row.data());
                remove_from_processed(row, data);

                document.getElementById('search_input').value = '';
                $('table.dataTable').DataTable()
                    .search('')
                    .draw();
            }
        } catch (e) {
            err = {
                msg: e.name + ' : ' + e.message,
                ctx: 'initLists: listener edit line from processed list'
            };
            console.error(err);
            report_JS_error(err, 'reception');
        }
    });

    $('#table_processed tbody').on('change', '.select_product_action', function () {
        try {
            if ($(this).val() == 'supplier_shortage') {
                var row = table_processed.row($(this).parents('tr'));
                var data = row.data();

                var modal_shortage = $('#modal_set_supplier_shortage');

                modal_shortage.find(".supplier_shortage_product").text(' ' + data.product_id[1]);
                modal_shortage.find(".supplier_shortage_supplier").text(' ' + data.partner_id[1]);

                openModal(
                    modal_shortage.html(),
                    function() {
                        set_supplier_shortage(row, data, true);
                    },
                    'Valider',
                    true,
                    true,
                    function() {
                        $(".select_product_action").val('');
                    }
                );
            }
        } catch (e) {
            err = {msg: e.name + ' : ' + e.message, ctx: 'initLists : listener set supplier shortage'};
            console.error(err);
            report_JS_error(err, 'reception');
        }
    });

    // Search input for both tables
    $('#search_input').on('keyup', function () {
        try {
            $('table.dataTable')
                .DataTable()
                .search(jQuery.fn.DataTable.ext.type.search.string(this.value)) // search without accents (see DataTable plugin)
                .draw();

        } catch (e) {
            err = {
                msg: e.name + ' : ' + e.message,
                ctx: 'initLists: listener search_input '
            };
            console.error(err);
            report_JS_error(err, 'reception');
        }
    });

    // Cancel line editing
    $('#edition_cancel').on('click', function () {
        if (editing_product != null) {
            if (editing_origin == "to_process") {
                add_to_toProcess(editing_product);
            } else if (editing_origin == "processed") {
                add_to_processed(editing_product, false);
            }
            clearLineEdition();
        }
    });
}

// Add a line to to_process
function add_to_toProcess(product) {
    try {
    // Add to list
        list_to_process.push(product);

        // Add to table (no data binding...)
        var rowNode = table_to_process.row.add(product).draw(false)
            .node();

        // Handle blinking effect for newly added row
        var onAnimationEnd = function() {
            rowNode.classList.remove('blink_me');
        };

        $(rowNode).addClass('blink_me');
        rowNode.addEventListener('animationend', onAnimationEnd);
        rowNode.addEventListener('webkitAnimationEnd', onAnimationEnd);
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'add_to_toProcess'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}

// Add a line to processed
function add_to_processed(product, withCounter = true) {
    try {
    // Add to list
        list_processed.push(product);

        // Add a counter to display first the last row added
        if (withCounter) {
            product.row_counter = processed_row_counter;
            processed_row_counter++;
        }

        // Add to table (no data binding...)
        var rowNode = table_processed.row.add(product).draw(false)
            .node();

        // Handle blinking efect for newly added row
        var onAnimationEnd = function() {
            rowNode.classList.remove('blink_me');
        };

        $(rowNode).addClass('blink_me');
        rowNode.addEventListener('animationend', onAnimationEnd);
        rowNode.addEventListener('webkitAnimationEnd', onAnimationEnd);
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'add_to_processed'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}

// Remove a line from to_process
function remove_from_toProcess(row, product) {
    try {
    // Remove from list
        var index = list_to_process.indexOf(product);

        if (index > -1) {
            list_to_process.splice(index, 1);
        }

        //Remove from table
        row.remove().draw();
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'remove_from_processed'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}

// Remove a line from processed
function remove_from_processed(row, product) {
    try {
    // Remove from list
        var index = list_processed.indexOf(product);

        if (index > -1) {
            list_processed.splice(index, 1);
        }

        //Remove from table
        row.remove().draw();

    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'remove_from_processed'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}

// Indicate the product is on supplier shortage.
// Direct validation from to_process & set qty to 0
function set_supplier_shortage(row, product, from_processed = false) {
    try {
        product.supplier_shortage = true;

        // Step 1: set qty to 0
        if (reception_status == 'False') {
            if (!from_processed) {
                product.old_qty = product.product_qty;
            }
            product.product_qty = 0;
        // Step 2: for consistency purposes, updated products need these fields to be set
        } else {
            if (!from_processed) {
                product.old_price_unit = product.price_unit;
                product.new_shelf_price = null;
            }
        }

        // Create 'updated products' list in order if doesn't exists
        if (!orders[product.id_po]['updated_products'])
            orders[product.id_po]['updated_products'] = [];

        if (from_processed) {
            // Look for product in order's updated products list
            let already_updated = false;

            for (i in orders[product.id_po]['updated_products']) {
                if (orders[product.id_po]['updated_products'][i]['id']
                    == product['id']) {

                    orders[product.id_po]['updated_products'][i] = product;
                    already_updated = true;
                }
            }

            // If not updated before, add product to updated list...
            if (!already_updated) {
                orders[product.id_po]['updated_products'].push(product);

                // ... and remove product from 'direct validated' products if was there
                if ('valid_products' in orders[product.id_po]) {
                    for (i in orders[product.id_po]['valid_products']) {
                        if (orders[product.id_po]['valid_products'][i] == product['id']) {
                            orders[product.id_po]['valid_products'].splice(i, 1);
                        }
                    }
                }
            }

        } else {
            // Add the product to the updated products
            updatedProducts.push(product);
            orders[product.id_po]['updated_products'].push(product);
        }

        // Re-add product in table
        if (from_processed) {
            remove_from_processed(row, product);
        } else {
            remove_from_toProcess(row, product);
        }
        add_to_processed(product);

        // Update product's order
        update_distant_order(product.id_po);

        // Reset search
        document.getElementById('search_input').value = '';
        $('table.dataTable').DataTable()
            .search('')
            .draw();
        document.getElementById('search_input').focus();
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'set_supplier_shortage'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}


/* EDITION */

// Set edition
function setLineEdition(product) {
    editing_product = product;
    // name
    document.getElementById('product_name').innerHTML = editing_product.product_id[1];

    // intput
    if (reception_status == "qty_valid")
        document.getElementById('edition_input').value = editing_product.price_unit;
    else
        document.getElementById('edition_input').value = editing_product.product_qty;

    document.getElementById("edition_input").focus();

    // uom
    if (editing_product.product_uom[0] == 1) { // Unit
        if (reception_status == 'False') {
            document.getElementById('product_uom').innerHTML = ' unité(s)';
            $('#edition_input').attr('type', 'number')
                .attr('step', 1)
                .attr('max', 9999);
        } else {
            document.getElementById('product_uom').innerHTML = ' / unité';
            $('#edition_input').attr('type', 'number')
                .attr('step', 0.01)
                .attr('max', 9999);
        }
    } else if (editing_product.product_uom[0] == 21) { // kg
        if (reception_status == 'False') {
            document.getElementById('product_uom').innerHTML = ' kg';
            $('#edition_input').attr('type', 'number')
                .attr('step', 0.001)
                .attr('max', 9999);
        } else {
            document.getElementById('product_uom').innerHTML = ' / kg';
            $('#edition_input').attr('type', 'number')
                .attr('step', 0.01)
                .attr('max', 9999);
        }
    }

    // Make edition area blink when edition button clicked
    container_edition.classList.add('blink_me');
}

// Clear edition
function clearLineEdition() {
    editing_product = null;

    // Reset DOM values
    document.getElementById('product_name').innerHTML = '';
    document.getElementById('edition_input').value = null;
    document.getElementById('search_input').focus();
    document.getElementById('product_uom').innerHTML = '';
}

/**
  * Update a product info : qty or unit price
  * @param {Object} productToEdit
  * @param {Float} value if set, use it as new value
  * @param {Boolean} batch if true, don't update couchdb data here
  * @returns
  */
function editProductInfo (productToEdit, value = null, batch = false) {
    try {
    // Check if the product is already in the 'updated' list
        var index = searchUpdatedProduct();
        var firstUpdate = false;
        var isValid = false;
        let newValue = value;
        var addition = false;

        // If 'value' parameter not set, get value from edition input
        if (value == null) {
            newValue = parseFloat(document.getElementById('edition_input').value.replace(',', '.'));
            newValue = isFinite(newValue) ? newValue : 0;
        }

        // addition mode = weight is directly added from scanned product
        $.each(list_processed, function(i, e) {
            if (
                e.product_id[0] == productToEdit.product_id[0]
                && "weightAddition" in productToEdit
                && productToEdit.weightAddition === true
            ) {
                addition = true;
                productToEdit = e;
                newValue = Number((newValue + productToEdit.product_qty).toFixed(3));
            }
        });

        // If qty edition & Check if qty changed
        if (reception_status == "False") {
            firstUpdate = (index == -1); //first update

            if (productToEdit.product_qty != newValue) {
                if (firstUpdate) {
                    productToEdit.old_qty = productToEdit.product_qty;
                } else {
                    //if it is not the first update AND newValue is equal to the validation qty then the product is valid (qty not changed)
                    isValid = (newValue === productToEdit.old_qty);
                }

                // Edit product info
                productToEdit.product_qty = newValue;

                /*
                    If qty has changed, we choose to set detailed values as follow:
                    1 package (product_qty_package) of X products (package_qty)
                */
                productToEdit.product_qty_package = 1;
                productToEdit.package_qty = productToEdit.product_qty;

            } else if (firstUpdate) {
                // if the product is updated for the first time and productQty is equal to the newValue then the product is validated
                isValid = true;
            }
        }

        // Check if price changed
        if (reception_status == "qty_valid" && productToEdit.price_unit != newValue) {
            if (index == -1) { // First update
                productToEdit.old_price_unit = productToEdit.price_unit;
                productToEdit.new_shelf_price = null;

                if (! isNaN(productToEdit.p_coeff)) {
                    try {
                        new_shelf_price = parseFloat(newValue * productToEdit.p_coeff);
                        old_shelf_price = parseFloat(productToEdit.p_price * productToEdit.p_coeff);
                        if (Math.abs(new_shelf_price - old_shelf_price) > 0.001)
                            productToEdit.new_shelf_price = new_shelf_price.toFixed(2);
                    } catch (e) {
                        err = {msg: e.name + ' : ' + e.message, ctx: 'computing new_shelf_price'};
                        console.error(err);
                        report_JS_error(err, 'reception');
                    }
                }

                firstUpdate = true;
            } else if (productToEdit.old_price_unit == newValue) {
                productToEdit.new_shelf_price = null;
            }

            productToEdit.price_unit = newValue;
        }

        // If the product info has been updated and for the first time
        if (firstUpdate) {
            updatedProducts.push(productToEdit);

            //if product is validated thru edition -> add to valid_products
            if (isValid) {
                // Create 'valid_products' list in order if not exists
                if (!orders[productToEdit.id_po]['valid_products']) {
                    orders[productToEdit.id_po]['valid_products'] = [];
                }
                orders[productToEdit.id_po]['valid_products'].push(productToEdit['id']);
            } else {
                // Create 'updated_products' list in order if not exists
                if (!orders[productToEdit.id_po]['updated_products']) {
                    orders[productToEdit.id_po]['updated_products'] = [];
                }

                // Add product to order's updated products if first update
                orders[productToEdit.id_po]['updated_products'].push(productToEdit);

                // May have been directly validated then updated from processed list
                //  -> remove from 'valid_products' list
                for (i in orders[productToEdit.id_po]['valid_products']) {
                    if (orders[productToEdit.id_po]['valid_products'][i] == productToEdit['id']) {
                        orders[productToEdit.id_po]['valid_products'].splice(i, 1);
                    }
                }
            }
        } else {
            if (isValid) {
                //if product is valid -> remove from updated_products list and add to valid_products list
                //removing from updated_products
                for (i in orders[productToEdit.id_po]['updated_products']) {
                    if (
                        orders[productToEdit.id_po]['updated_products'][i]['product_id'][0]
                            == productToEdit['product_id'][0]
                    ) {
                        orders[productToEdit.id_po]['updated_products'].splice(i, 1);
                    }
                }

                //add to valid_products
                // Create 'valid_products' list in order if not exists
                if (!orders[productToEdit.id_po]['valid_products']) {
                    orders[productToEdit.id_po]['valid_products'] = [];
                }
                orders[productToEdit.id_po]['valid_products'].push(productToEdit['id']);

            } else {
                // Look for product in order's updated products list
                for (i in orders[productToEdit.id_po]['updated_products']) {
                    if (orders[productToEdit.id_po]['updated_products'][i]['product_id'][0]
                == productToEdit['product_id'][0]) {
                        orders[productToEdit.id_po]['updated_products'][i] = productToEdit;
                    }
                }
            }
        }

        if (batch === false) {
            // Update product order
            update_distant_order(productToEdit.id_po);
        }

        // Remove product from processed list if:
        //  - we're adding directly weight from scanned product
        //  - product comes from processed list
        if (addition === true || firstUpdate === false) {
            let row = table_processed.row($('#'+productToEdit.product_id[0]));

            remove_from_processed(row, productToEdit);
        }

        add_to_processed(productToEdit);
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'edit product info'};
        console.error(err);
        report_JS_error(err, 'reception');
    }

    return true;
}

// Validate product edition
function validateEdition(form = null) {
    if (editing_product != null) {
        if (editProductInfo(editing_product)) {
            clearLineEdition();
        }
    }
}

// Set the quantity to 0 for all the products in to_process
function setAllQties() {
    // Iterate over all rows in to_process
    table_to_process.rows().every(function () {
        var data = this.data();

        editProductInfo(data, 0, true);

        return true;
    });
    list_to_process = [];
    table_to_process.rows().remove()
        .draw();

    // Batch update orders
    update_distant_orders();
}

/* ACTIONS */

function print_product_labels() {
    try {
        if (is_time_to('print_pdt_labels', 10000)) {
            $.ajax("../../orders/print_product_labels?oids=" + group_ids.join(','))
                .done(function() {
                    alert('Impression des étiquettes à coller sur les articles lancée.');
                });
        } else {
            alert("Vous avez cliqué il y a moins de 10s... Patience, la demande est en cours de traitement.");
        }
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'print_product_labels'};
        console.error(err);
        report_JS_error(err, 'reception');
    }
}

/** DEPRECATED, printing is fired automaticaly now from server side. **/
// Send request to print a new shelf labels file for products with new price
// function print_etiquettes() {
//   try {
//     // Additionnal security to be sure request isn't sent during step 1
//     if (reception_status == 'qty_valid') {
//       // For all products with updated price
//       for (i in updatedProducts) {
//         // Send request
//         if (updatedProducts[i].new_shelf_price) {
//           $.ajax({
//             url: tools_server + "/products/label_print/"
//             + updatedProducts[i].product_tmpl_id + "/"
//             + updatedProducts[i].new_shelf_price
//           });
//         }
//
//       }
//
//       document.getElementById("etiquettesToPrint").innerHTML = "<br/><h5><b>Impression lancée !</b></h5>";
//     }
//   } catch (e) {
//     err = {msg: e.name + ' : ' + e.message, ctx: 'print_etiquettes'}
//     console.error(err)
//     report_JS_error(err, 'reception')
//   }
// }

// Verifications before sending BC update
function pre_send(type) {
    if (list_to_process.length > 0) {
        alert("Il reste des produits à traiter dans la commande.");
    } else {
        let modal_next_step = '#templates #modal_prices_validation';

        updateType = type;

        if (type == 'qty_valid') {
            modal_next_step = '#templates #modal_qties_validation';
        }
        openModal($(modal_next_step).html(), data_validation, 'Confirmer', false);
    }
}

function data_validation() {
    openModal();

    $.ajax({
        type: "POST",
        url: "../data_validation",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(group_ids),
        success: function(data) {
            if (data.unprocessable.length == 0) {
                // No product unprocessable, do process
                send();
            } else {
                $("#modal_unprocessable_porducts #list_unprocessable_porducts").html('');
                for (p of data.unprocessable) {
                    $("#modal_unprocessable_porducts #list_unprocessable_porducts").append("<li>" + p[1] + "</li>");
                }
                openModal($("#modal_unprocessable_porducts").html(), function() {
                    return 0;
                }, 'Confirmer', true, false);
            }
        },
        error: function(data) {
            // if error during validation, report error & go on so we don't block the process
            err = {msg: "erreur serveur lors de la validation des données", ctx: 'data_validation'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            console.error(err);
            report_JS_error(err, 'reception');

            send();
        }
    });
}

// Send the request to the server
function send() {
    try {
        // Loading on
        openModal();

        /* Prepare data for orders update */
        // Only send to server the updated lines
        var update_data = {
            update_type: updateType,
            orders: {}
        };

        // Set orders in update data with empty list of updated products
        for (order_id in orders) {
            update_data.orders[order_id] = {'po' : []};
        }

        // for each updated product, add it to its order list
        for (i in updatedProducts) {

            /* ---> The following part concerns products found in different orders */
            if ('other_orders_data' in updatedProducts[i]) {
                // for each other order of product
                for (other_order_data of updatedProducts[i].other_orders_data) {
                    // Make a clone (deep copy) of the product object
                    let product_copy = $.extend(true, {}, updatedProducts[i]);

                    // Set correct order line id for this product
                    product_copy.id = other_order_data.id_product;

                    // If in step 1, dispatch quantity in other orders
                    if (reception_status == 'False') {
                        // Reset initial qties in respective orders
                        product_copy.old_qty = other_order_data.initial_qty;
                        for (j in orders[updatedProducts[i].id_po]['updated_products']) {
                            if (orders[updatedProducts[i].id_po]['updated_products'][j].product_id[0]
                            == product_copy.product_id[0]) {
                                orders[updatedProducts[i].id_po]['updated_products'][j].old_qty -= other_order_data.initial_qty;
                                break;
                            }
                        }

                        if (product_copy.product_uom[0] == 21 && updatedProducts[i].product_qty > 0.1) { // kg
                            // Add minimum qty in other orders
                            product_copy.product_qty_package = 1;
                            product_copy.package_qty = 0.1;
                            product_copy.product_qty = 0.1;

                            // Remove this qty from first order
                            updatedProducts[i].package_qty -= 0.1;
                            updatedProducts[i].product_qty -= 0.1;
                        } else if (product_copy.product_uom[0] == 1 && updatedProducts[i].product_qty > 1) { // Unit
                            product_copy.product_qty_package = 1;
                            product_copy.package_qty = 1;
                            product_copy.product_qty = 1;

                            updatedProducts[i].package_qty -= 1;
                            updatedProducts[i].product_qty -= 1;
                        } else { // Not handled, all qty in one order
                            product_copy.product_qty_package = 0;
                            product_copy.package_qty = 0;
                            product_copy.product_qty = 0;
                        }
                    }

                    /* Add product to the other orders it belongs to */
                    // In update data
                    update_data.orders[other_order_data.id_po]['po'].push(product_copy);

                    // Add it to the 'updated products' of other orders (for error report)
                    if (!('updated_products' in orders[other_order_data.id_po])) {
                        orders[other_order_data.id_po]['updated_products'] = [];
                    }

                    orders[other_order_data.id_po]['updated_products'].push(product_copy);
                }
            }
            /* <--- */

            // Add product to order's prod list
            prod_order_id = updatedProducts[i].id_po;
            update_data.orders[prod_order_id]['po'].push(updatedProducts[i]);
        }

        /* Create the error report */
        // Send changes between items to process and processed items
        var error_report_data = {
            'group_amount_total' : 0,
            'update_type' : updateType,
            'updated_products' : updatedProducts,
            'user_comments': user_comments,
            'orders' : []
        };

        for (let i in orders) {
            error_report_data.group_amount_total += orders[i].amount_total;
            error_report_data.orders.push(orders[i]);
        }

        //Create list of articl with no barcode
        no_barcode_list = [];
        for (var i = 0; i < list_processed.length; i++) {
            if (list_processed[i].product_qty != 0 && (list_processed[i].barcode == false || list_processed[i].barcode == null || list_processed[i].barcode == "")) {
                no_barcode_list.push([
                    list_processed[i]["product_id"][0],
                    list_processed[i]["product_id"][1]
                ]);
            }
        }

        data_send_no_barcode={
            "order" : orders[order_data['id_po']],
            "no_barcode_list" : no_barcode_list
        };


        // Send of articl with no barcode to mail send
        if (no_barcode_list.length > 0) {
            $.ajax({
                type: "POST",
                url: "../send_mail_no_barcode",
                dataType: "json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data_send_no_barcode),
                success: function() {},
                error: function() {
                    alert('Erreur dans l\'envoi des produite sont barre code.');
                }
            });
        }

        // Send request for error report
        $.ajax({
            type: "POST",
            url: "../save_error_report",
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(error_report_data),
            success: function() {},
            error: function() {
                closeModal();
                alert('Erreur dans l\'envoi du rapport.');
            }
        });

        /* Update orders */
        $.ajax({
            type: "PUT",
            url: "../update_orders",
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(update_data),
            success: function() {
                closeModal();

                try {
                    // If step 1 (counting)
                    if (reception_status == "False") {
                        /* Open pop-up with procedure explanation */
                        var barcodes_to_print = false;

                        // Select products with local barcode and without barcode, when qty > 0
                        for (var i = 0; i < list_processed.length; i++) {
                            if (list_processed[i].product_qty != 0) {
                                // set DOM data
                                if (typeof(list_processed[i].barcode) == "string" && list_processed[i].barcode.startsWith(fixed_barcode_prefix) && !barcodes_to_print) {
                                    // Products with barcode to print (local barcode)
                                    document.getElementById("barcodesToPrint").hidden = false;
                                    document.getElementById("nothingToDo").hidden = true;

                                    barcodes_to_print = true;
                                } /* else if (list_processed[i].barcode == false || list_processed[i].barcode == null || list_processed[i].barcode == "") {
                                    // Products with no barcode
                                    var node = document.createElement('li');
                                    let textNode = document.createTextNode(list_processed[i]["product_id"][1]);

                                    node.appendChild(textNode);
                                    document.getElementById('barcodesEmpty_list').appendChild(node);

                                    if (document.getElementById("barcodesEmpty").hidden) {
                                        document.getElementById("barcodesEmpty").hidden = false;
                                        document.getElementById("nothingToDo").hidden = true;
                                    }
                                }*/
                            }
                        }

                        for (let i = 0; i < no_barcode_list.length; i++) {
                            var node = document.createElement('li');
                            let textNode = document.createTextNode(no_barcode_list[i]);

                            node.appendChild(textNode);
                            document.getElementById('barcodesEmpty_list').appendChild(node);

                            if (document.getElementById("barcodesEmpty").hidden) {
                                document.getElementById("barcodesEmpty").hidden = false;
                                document.getElementById("nothingToDo").hidden = true;
                            }
                        }

                        // Set order(s) name in popup DOM
                        if (is_grouped_order() === false) { // Single order
                            document.getElementById("order_ref").innerHTML = orders[Object.keys(orders)[0]].name;
                        } else { // group
                            document.getElementById("success_order_name_container").hidden = true;
                            document.getElementById("success_orders_name_container").hidden = false;

                            for (order_id in orders) {
                                var p_node = document.createElement('p');

                                var span_node = document.createElement('span');

                                span_node.className = 'order_ref_reminder';
                                let textNode = document.createTextNode(orders[order_id].name);

                                span_node.appendChild(textNode);

                                textNode = document.createTextNode(orders[order_id].partner
                                            + ' du ' + orders[order_id].date_order + ' : ');
                                p_node.appendChild(textNode);
                                p_node.appendChild(span_node);

                                document.getElementById("orders_ref").appendChild(p_node);
                            }
                        }

                        openModal(
                            $('#modal_qtiesValidated').html(),
                            back,
                            'Retour à la liste des commandes',
                            true,
                            false
                        );

                        /* Not last step: update distant data */
                        for (let order_id in orders) {
                            // Save current step updated data
                            orders[order_id].previous_steps_data = {};
                            orders[order_id].previous_steps_data[reception_status] = {
                                updated_products: orders[order_id].updated_products || [],
                                user_comments: user_comments
                            };
                            orders[order_id].reception_status = updateType;

                            // Unlock order
                            orders[order_id].last_update = {
                                timestamp: null,
                                fingerprint: null
                            };

                            // Delete temp data
                            delete orders[order_id].valid_products;
                            delete orders[order_id].updated_products;
                        }

                        dbc.bulkDocs(Object.values(orders)).catch((err) => {
                            console.log(err);
                        });
                    } else {
                        // Print etiquettes with new prices
                        if (updatedProducts.length > 0) {
                            document.getElementById("etiquettesToPrint").hidden = false;
                        }

                        openModal(
                            $('#templates #modal_pricesValidated').html(),
                            back,
                            'Retour à la liste des commandes',
                            true,
                            false
                        );

                        /* Last step: Clear distant data */
                        // Delete orders doc
                        for (let order_id in orders) {
                            orders[order_id]._deleted = true;
                        }

                        // Remove orders group
                        dbc.get("grouped_orders").then((doc) => {
                            let couchdb_update_data = Object.values(orders);

                            // We're in a group, remove it & update groups doc
                            if (is_grouped_order()) {
                                let groups_doc = doc;

                                let first_order_id = parseInt(Object.keys(orders)[0]);

                                for (let i in groups_doc.groups) {
                                    if (groups_doc.groups[i].includes(first_order_id)) {
                                        groups_doc.groups.splice(i, 1);
                                        break;
                                    }
                                }

                                couchdb_update_data.push(groups_doc);
                            }

                            return dbc.bulkDocs(couchdb_update_data);
                        })
                            .catch(function (err) {
                                console.log(err);
                            });
                    }

                    // Back if modal closed
                    $('#modal_closebtn_top').on('click', back);
                    $('#modal_closebtn_bottom').on('click', back);
                } catch (ee) {
                    err = {msg: ee.name + ' : ' + ee.message, ctx: 'callback update_orders'};
                    console.error(err);
                    report_JS_error(err, 'reception');
                }
            },
            error: function() {
                closeModal();
                alert('Erreur lors de la sauvegarde des données.');
            }
        });
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'send'};
        console.error(err);
        report_JS_error(err, 'reception');
        alert('Erreur : ' + err.msg);
    }
}

// Fired from verification modal for 'all prices' validation
function confirmPricesAllValid() {
    updateType = 'br_valid';
    send();
}

// Fired from All left is good modal
function confirm_all_left_is_good() {
    // all products left are to be considered as well filled
    // Iterate over all rows in to_process
    table_to_process.rows().every(function () {
        let data = this.data();
        var value = null;

        if (reception_status == "False") {
            value = data.product_qty;
        } else {
            value = data.price_unit;
        }
        editProductInfo(data, value, true);

        return true;
    });
    list_to_process = [];
    table_to_process.rows().remove()
        .draw();

    // Batch update orders
    update_distant_orders();
    closeModal();
}

function saveErrorReport() {
    user_comments = document.getElementById("error_report").value;

    // Save comments in all orders
    for (order_id of Object.keys(orders)) {
        orders[order_id].user_comments = user_comments;
        update_distant_order(order_id);
    }

    document.getElementById("search_input").focus();
}

/**
 * Check if all qty inputs are set first.
 * Adding products leads to creating a new order (for each supplier) that will be grouped with the current one(s)
 */
function add_products_action() {
    let qty_inputs = $("#modal .products_lines").find(".product_qty_input");
    let has_empty_qty_input = false;

    for (let qty_input of qty_inputs) {
        if ($(qty_input).val() === "") {
            has_empty_qty_input = true;
            $(qty_input).siblings(".product_qty_input_alert")
                .show();
        } else {
            $(qty_input).siblings(".product_qty_input_alert")
                .hide();
        }
    }

    if (products_to_add.length > 0 && qty_inputs.length > 0 && has_empty_qty_input === false) {
        create_orders();
    }
}

/**
 * Send request to create the new orders
 */
function create_orders() {
    let orders_data = {
        "suppliers_data": {}
    };

    // Mock order date_planned : today
    let date_object = new Date();

    formatted_date = date_object.toISOString().replace('T', ' ')
        .split('.')[0]; // Get ISO format bare string

    for (let supplier_id of get_suppliers_id()) {
        orders_data.suppliers_data[supplier_id] = {
            date_planned: formatted_date,
            lines: []
        };
    }

    // Prepare data: get products with their qty
    for (let p of products_to_add) {
        // Get product qty from input
        let product_qty = 0;

        let add_products_lines = $("#modal .add_product_line");

        for (let i = 0; i < add_products_lines.length; i++) {
            let line = add_products_lines[i];

            if ($(line).find(".product_name")
                .text() === p.name) {
                product_qty = parseFloat($(line).find(".product_qty_input")
                    .val());
                break;
            }
        }

        let p_supplierinfo = p.suppliersinfo[0]; // product is ordered at its first supplier
        const supplier_id = p_supplierinfo.supplier_id;

        orders_data.suppliers_data[supplier_id].lines.push({
            'package_qty': p_supplierinfo.package_qty,
            'product_id': p.id,
            'name': p.name,
            'product_qty_package': (product_qty / p_supplierinfo.package_qty).toFixed(2),
            'product_qty': product_qty,
            'product_uom': p.uom_id[0],
            'price_unit': p_supplierinfo.price,
            'supplier_taxes_id': p.supplier_taxes_id,
            'product_variant_ids': p.product_variant_ids,
            'product_code': p_supplierinfo.product_code
        });
    }

    // Remove supplier from order data if no lines
    for (const supplier_id in orders_data.suppliers_data) {
        if (orders_data.suppliers_data[supplier_id].lines.length === 0) {
            delete(orders_data.suppliers_data[supplier_id]);
        }
    }

    openModal();
    $("#modal em:contains('Chargement en cours...')").append("<br/>L'opération peut prendre un certain temps...");

    $.ajax({
        type: "POST",
        url: "/orders/create_orders",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(orders_data),
        success: (result) => {
            po_ids = [];
            for (let po of result.res.created) {
                po_ids.push(po.id_po);
            }

            // Get orders data as needed by the module with order lines
            $.ajax({
                type: 'GET',
                url: "/reception/get_list_orders",
                dataType:"json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                data: {
                    poids: po_ids,
                    get_order_lines: true
                },
                success: function(result2) {
                    let current_orders_key = group_ids.length;

                    for (let new_order of result2.data) {
                        // Add key (position in orders list) to new orders data
                        current_orders_key += 1;
                        new_order.key = current_orders_key;

                        // Consider new order lines as updated products
                        new_order.updated_products = new_order.po;
                        delete(new_order.po);

                        // Add necessary data to order updated products
                        for (let noup of new_order.updated_products) {
                            noup.order_key = current_orders_key;
                            noup.id_po = String(new_order.id);
                            noup.old_qty = 0; // products weren't originally ordered
                        }

                        // Create couchdb doc for the new order
                        create_order_doc(new_order);
                    }

                    dbc.get("grouped_orders").then((doc) => {
                        // Not a group (yet)
                        if (group_ids.length === 1) {
                            group_ids = group_ids.concat(po_ids);
                            doc.groups.push(group_ids);
                        } else {
                            for (let i in doc.groups) {
                                // If group found in saved distatnt groups
                                if (group_ids.findIndex(e => e == doc.groups[i][0]) !== -1) {
                                    doc.groups[i] = doc.groups[i].concat(po_ids);
                                    doc.groups[i].sort();
                                    group_ids = doc.groups[i];
                                }
                            }
                        }

                        dbc.put(doc, () => {
                            // Update screen
                            // The easy way: reload page now all data is correctly set.
                            window.location.reload();
                        });
                    });
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
        },
        error: function(data) {
            let msg = "erreur serveur lors de la création des product orders";

            err = {msg: msg, ctx: 'create_orders', data: orders_data};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'reception');

            closeModal();
            alert('Erreur lors de la création des commandes. Veuillez ré-essayer plus tard.');
        }
    });
}

/**
 * Create a couchdb document for an order
 *
 * @param {Object} order_data
 */
function create_order_doc(order_data) {
    const order_doc_id = 'order_' + order_data.id;

    order_data._id = order_doc_id;
    order_data.last_update = {
        timestamp: Date.now(),
        fingerprint: fingerprint
    };

    dbc.put(order_data).then(() => {})
        .catch((err) => {
            error = {
                msg: 'Erreur dans la creation de la commande dans couchdb',
                ctx: 'create_order_doc',
                details: err
            };
            report_JS_error(error, 'reception');
            console.log(error);
        });
}

/* DOM */

function openFAQ() {
    openModal($("div#modal_FAQ_content").html(), function() {}, 'Compris !', true, false);
}

function openErrorReport() {
    openModal($('#templates #modal_error_report').html(), saveErrorReport, 'Confirmer');

    // listener for error report textarea
    // this is necessary because default behavior is overwritten by the listener defined in jquery.pos.js;
    $("#error_report").keypress(function(e) {
        var key = e.keyCode;

        if (key === 13) {
            this.value += "\n";
        }
    });

    var textarea = document.getElementById("error_report");

    textarea.value = (user_comments != undefined) ? user_comments : "";
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

/**
 * Set the autocomplete on add products modal, search product input.
 * If extists, destroys instance and recreate it.
 * Filter autocomplete data by removing products already selected.
 */
function set_products_autocomplete() {    
    // Filter autocomplete products on products already selected
    let autocomplete_products = suppliers_products.filter(p => products_to_add.findIndex(pta => pta.name === p.name) === -1);
    
    try {
        $("#modal .search_product_input").autocomplete("destroy");
    } catch (error) {
        // autocomplete not set yet, do nothing
    }

    $("#modal .search_product_input").autocomplete({
        source: autocomplete_products.map(p => p.name),
        classes: {
            "ui-autocomplete": "autocomplete_dropdown"
        },
        delay: 0,
        select: function(event, ui) {
            // Action called when an item is selected
            event.preventDefault();
            let product_name = ui.item.label;

            // extra secutiry but shouldn't happen
            if (products_to_add.findIndex(p => p.name === product_name) === -1) {
                let product = suppliers_products.find(p => p.name === product_name);

                products_to_add.push(product);

                // Display
                let add_product_template = $("#add_product_line_template");

                add_product_template.find(".product_name").text(product_name);
                $("#modal .products_lines").append(add_product_template.html());

                if (products_to_add.length === 1) {
                    $("#modal .products_lines").show();
                }

                $(".remove_line_icon").off("click");
                $(".remove_line_icon").on("click", remove_product_line);

                // Reset search elements
                $("#modal .search_product_input").val('');
                set_products_autocomplete();
            }
        }
    });
}

/**
 * Remove product from list of products to add & remove line from DOM
 * @param {Event} e
 */
function remove_product_line(e) {
    let product_line = $(e.target).closest(".add_product_line");
    let product_name = product_line.find(".product_name").text();
    let product_to_add_index = products_to_add.findIndex(p => p.name === product_name);

    products_to_add.splice(product_to_add_index, 1);
    product_line.remove();
    set_products_autocomplete();
}

/**
 * Set & display the modal to search products.
 * If no products to add, display the according modal.
 */
function set_add_products_modal() {
    if (suppliers_products.length === 0) {
        let modal_no_product_to_add = $("#modal_no_product_to_add");

        openModal(
            modal_no_product_to_add.html(),
            () => {},
            'OK'
        );
    } else {
        let add_products_modal = $("#modal_add_products");
    
        openModal(
            add_products_modal.html(),
            add_products_action,
            'Ajouter les produits',
            false
        );
    
        products_to_add = []; // Reset on modal opening
        set_products_autocomplete();
    }
}
    

/**
 * Init the page according to order(s) data (texts, colors, events...)
 *
 * @param {Array} partners_display_data
 */
function init_dom(partners_display_data) {
    // Back button
    $('#back_button').on('click', function () {
        // Liberate current orders
        for (let order_id in orders) {
            orders[order_id].last_update = {
                timestamp: null,
                fingerprint: null
            };
        }

        dbc.bulkDocs(Object.values(orders)).then(() => {
            back();
        })
            .catch((err) => {
                console.log(err);
            });
    });

    // Grouped orders
    if (is_grouped_order()) {
        $('#partner_name').html(Object.keys(orders).length + " commandes");

        // Display order data for each order
        var msg = "";

        for (display_partner_data of partners_display_data) {
            if (msg != "") {
                msg += ", ";
            }
            msg += display_partner_data;
        }
        $('#container_multiple_partners').append('<h6> ' + msg + '</h6>');
    } else {
        $('#partner_name').html(orders[Object.keys(orders)[0]].partner);
    }

    /* Set DOM according to reception status */
    if (reception_status == "qty_valid") { // Step 2
        // Header
        document.getElementById('header_step_two').classList.add('step_two_active');
        var check_icon = document.createElement('i');

        check_icon.className = 'far fa-check-circle';
        document.getElementById('header_step_one_content').appendChild(check_icon);

        // Products lists containers
        document.getElementById('container_left').style.border = "3px solid #0275D8"; // container qty_checked
        document.getElementById('container_right').style.border = "3px solid #5CB85C"; // container processed items
        document.getElementById('header_container_left').innerHTML = "Prix à mettre à jour";
        document.getElementById('header_container_right').innerHTML = "Prix mis à jour";

        // Edition
        document.getElementById('edition_header').innerHTML = "Editer les prix";
        document.getElementById('edition_input_label').innerHTML = "Prix unit.";

        // Validation buttons
        document.getElementById("valid_all").innerHTML = "<button class='btn--danger full_width_button' id='valid_all_uprices' onclick=\"openModal($('#templates #modal_no_prices').html(), confirmPricesAllValid, 'Confirmer', false);\" disabled>Pas de prix sur le bon de livraison</button>";
        document.getElementById("validation_button").innerHTML = "<button class='btn--success full_width_button' id='valid_uprice' onclick=\"pre_send('br_valid')\" disabled>Valider la mise à jour des prix</button>";

        // Modal content after validation
        $("#modal_pricesValidated").load("/reception/reception_pricesValidated");
    } else if (reception_status == "False") { // Step 1
        document.getElementById('header_step_one').classList.add('step_one_active');

        document.getElementById('container_left').style.border = "3px solid #212529"; // container products to process
        document.getElementById('container_right').style.border = "3px solid #0275D8"; // container qty_checked
        document.getElementById('header_container_left').innerHTML = "Produits à compter";
        document.getElementById('header_container_right').innerHTML = "Produits déjà comptés";

        document.getElementById('edition_header').innerHTML = "Editer les quantités";
        document.getElementById('edition_input_label').innerHTML = "Qté";

        // Add products button
        document.getElementById('add_products_button').style.display = "block";

        document.getElementById("valid_all").innerHTML = "<button class='btn--danger full_width_button' id='valid_all_qties' onclick=\"openModal($('#templates #modal_no_qties').html(), setAllQties, 'Confirmer');\" disabled>Il n'y a plus de produits à compter</button>";
        document.getElementById("validation_button").innerHTML = "<button class='btn--primary full_width_button' id='valid_qty' onclick=\"pre_send('qty_valid')\" disabled>Valider le comptage des produits</button>";

        $("#modal_qtiesValidated").load("/reception/reception_qtiesValidated");
    } else {
        // Extra security, shouldn't get in here: reception status not valid
        back();
    }

    // Load modals content
    $("#modal_FAQ_content").load("/reception/reception_FAQ");
    $("#modal_qtiesValidated").load("/reception/reception_qtiesValidated");
    $("#modal_pricesValidated").load("/reception/reception_pricesValidated");

    // Handling blinking effect
    var container_edition = document.querySelector('#container_edition');

    container_edition.addEventListener('animationend', onAnimationEnd);
    container_edition.addEventListener('webkitAnimationEnd', onAnimationEnd);

    function onAnimationEnd() {
        container_edition.classList.remove('blink_me');
    }

    // Disable mousewheel on an input number field when in focus
    $('#edition_input').on('focus', function () {
        $(this).on('wheel.disableScroll', function (e) {
            e.preventDefault();
        });
    })
        .on('blur', function () {
            $(this).off('wheel.disableScroll');
        });

    // client-side validation of numeric inputs, optionally replacing separator sign(s).
    $("input.number").on("keydown", function (e) {
        // allow function keys and decimal separators
        if (
        // backspace, delete, tab, escape, enter, comma and .
            $.inArray(e.keyCode, [
                46,
                8,
                9,
                27,
                13,
                110,
                188,
                190
            ]) !== -1 ||
          // Ctrl/cmd+A, Ctrl/cmd+C, Ctrl/cmd+X
          ($.inArray(e.keyCode, [
              65,
              67,
              88
          ]) !== -1 && (e.ctrlKey === true || e.metaKey === true)) ||
          // home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {

            /*
          // optional: replace commas with dots in real-time (for en-US locals)
          if (e.keyCode === 188) {
              e.preventDefault();
              $(this).val($(this).val() + ".");
          }

          // optional: replace decimal points (num pad) and dots with commas in real-time (for EU locals)
          if (e.keyCode === 110 || e.keyCode === 190) {
              e.preventDefault();
              $(this).val($(this).val() + ",");
          }
          */

            return;
        }
        // block any non-number
        if (
        //Figures entered with Shift + key (59 ==> .)
            (e.shiftKey && ((e.keyCode < 48 || e.keyCode > 57) && e.keyCode !== 59)) ||
          //Numeric keyboard
          (!e.shiftKey && (e.keyCode < 96 || e.keyCode > 105))
        ) {
            e.preventDefault();
        }
    });

    $("#edition_input").keypress(function(event) {
        // Force validation when enter pressed in edition
        if (event.keyCode == 13 || event.which == 13) {
            validateEdition();
        }
    });

    $("#add_products_button").on('click', () => {
        if (reception_status == "False") {
            let pswd = prompt('Merci de demander à un.e salarié.e le mot de passe pour ajouter des produits à la commande');

            // Minimum security level
            if (pswd == add_products_pswd) {
                fetch_suppliers_products();
            } else if (pswd == null) {
                return;
            } else {
                alert('Mauvais mot de passe !');
            }
        }
    });

    // Barcode reader
    $(document).pos();
    $(document).on('scan.pos.barcode', function(event) {
        //access `event.code` - barcode data
        var barcode = event.code;

        if (barcode.length >=13) {
            barcode = barcode.substring(barcode.length-13);
        } else if (barcode.length == 12 && barcode.indexOf('0') !== 0) {
        // User may use a scanner which remove leading 0
            barcode = '0' + barcode;
        } else if (barcode.length >= 8) {
            // For EAN8
            barcode = barcode.substring(barcode.length-8);
        } else {
        //manually submitted after correction
            var barcode_input = $('#search_input');

            barcode = barcode_input.val();
        }

        document.getElementById('search_input').value = '';
        $('table.dataTable').DataTable()
            .search('')
            .draw();
        select_product_from_bc(barcode);
    });
}


$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    fingerprint = new Fingerprint({canvas: true}).get();

    // Load barcodes
    get_barcodes();

    // Get Route parameter
    let pathArray = window.location.pathname.split('/');
    let id = pathArray[pathArray.length-1];

    // Init couchdb
    dbc = new PouchDB(couchdb_dbname),
    sync = PouchDB.sync(couchdb_dbname, couchdb_server, {
        live: true,
        retry: true,
        auto_compaction: false
    });

    sync.on('change', function (info) {
        if (info.direction === "pull") {
            for (const doc of info.change.docs) {
                // Redirect if one of the current order is being modified somewhere else
                if (String(doc.id) in orders && orders[doc.id]._rev !== doc._rev) {
                    alert("Un autre navigateur est en train de modifier cette commande ! Vous allez être redirigé.e.");
                    back();
                }
            }
        }
    }).on('error', function (err) {
        if (err.status === 409) {
            alert("Une erreur de synchronisation s'est produite, la commande a sûrement été modifiée sur un autre navigateur. Vous allez être redirigé.e.");
            back();
        }
        console.log('erreur sync', err);
    });

    // Disable alert errors from datatables
    $.fn.dataTable.ext.errMode = 'none';

    // Listen for errors in tables with custom behavior
    $('#table_to_process').on('error.dt', function (e, settings, techNote, message) {
        var err_msg = message;

        try {
            var split = message.split(" ");
            var row_number = null;

            for (var i = 0; i < split.length; i++) {
                if (split[i] == "row")
                    row_number = split[i+1];
            }

            row_number = row_number.replace(',', '');
            var row_data = $('#table_to_process').DataTable()
                .row(row_number)
                .data();

            err_msg += " - Order id: " + row_data.id_po;
            err_msg += " - Product: " + row_data.product_id[1];
        } catch (e) {
            console.log(e);
        }

        err = {msg: err_msg, ctx: 'datatable: table to_process'};
        console.error(err);
        report_JS_error(err, 'reception');
    });

    $('#table_processed').on('error.dt', function (e, settings, techNote, message) {
        var err_msg = message;

        try {
            var split = message.split(" ");
            var row_number = null;

            for (var i = 0; i < split.length; i++) {
                if (split[i] == "row")
                    row_number = split[i+1];
            }

            row_number = row_number.replace(',', '');
            var row_data = $('#table_processed').DataTable()
                .row(row_number)
                .data();

            err_msg += " - Order id: " + row_data.id_po;
            err_msg += " - Product: " + row_data.product_id[1];
        } catch (e) {
            console.log(e);
        }

        err = {msg: err_msg, ctx: 'datatable: table processed'};
        console.error(err);
        report_JS_error(err, 'reception');
    });

    /* Get order info from couchdb */
    // Get order groups
    let order_groups = [];

    dbc.get("grouped_orders").then((doc) => {
        order_groups = doc.groups;

        for (let group of order_groups) {
            for (group_order_id of group) {
                if (group_order_id == id) {
                    // We're in a group!
                    group_ids = group;
                }
            }
        }

        // if not in group, add current order to group (1 order = group of 1)
        if (group_ids.length == 0) {
            group_ids.push(parseInt(id));
        }

        let partners_display_data = [];

        dbc.allDocs({
            include_docs: true
        }).then(function (result) {
            // for each order in the group
            for (let i in group_ids) {
                // find order
                let order_id = group_ids[i];
                let order = result.rows.find(el => el.id == 'order_' + order_id);

                order = order.doc;
                order.key = parseInt(i) + 1;
                orders[order_id] = order;

                // Add each order's already updated and validated products to common list
                if (order["updated_products"]) {
                    updatedProducts = updatedProducts.concat(order["updated_products"]);
                }

                if (order["valid_products"]) {
                    validProducts = validProducts.concat(order["valid_products"]);
                }

                // Prepare data to display in 'partner name' area
                partners_display_data.push(`<span class="title_partner_key">${order.key}.</span> ${order.partner} du ${order.date_order}`);
            }

            // Set current reception status: take first order's
            reception_status = orders[Object.keys(orders)[0]].reception_status;

            // Load saved user comments, get it from first order
            user_comments = orders[Object.keys(orders)[0]].user_comments || "";

            // Indicate that these orders are used in this navigator
            update_distant_orders();

            // Fetch orders data
            fetch_data();

            init_dom(partners_display_data);
        })
            .catch(function (e) {
                let msg = ('message' in e && 'name' in e) ? e.name + ' : ' + e.message : '';

                err = {msg, ctx: 'page init - get orders from couchdb', details: e};
                console.error(err);
                report_JS_error(err, 'reception');

                // Should be there, redirect
                alert("Erreur au chargement de cette commande. Vous allez être redirigé.");
                back();
            });
    })
        .catch(function (e) {
            let msg = ('message' in e && 'name' in e) ? e.name + ' : ' + e.message : '';

            err = {msg, ctx: 'page init - get grouped orders', details: e};
            console.error(err);
            report_JS_error(err, 'reception');

            // Should be there, redirect
            alert("Erreur au chargement de cette commande. Vous allez être redirigé.");
            back();
        });
});
