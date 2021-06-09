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
    is_group = false,
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
    barcodes = null; // Barcodes stored locally


/* UTILS */

function back() {
    document.location.href = "/reception";
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
            let p = barcodes.get_corresponding_odoo_product(barcode);

            if (p == null) {
                alert("Le code-barre " + barcode + " ne correspond à aucun article connu.");

                return -1;
            }

            var found = {data: null, place: null};

            $.each(list_to_process, function(i, e) {
                if (e.product_id[0] == p.data[barcodes['keys']['id']]) {
                    found.data = e;
                    found.place = 'to_process';
                }
            });

            if (found.data != null) {
                $.each(list_processed, function(i, e) {
                    if (e.product_id[0] == p.data[barcodes['keys']['id']]) {
                        found.data = e;
                        found.place = 'processed';
                    }
                });
            }

            if (found.data !== null) {
                setLineEdition(found.data);
                if (found.place === 'to_process') {
                    let row = table_to_process.row($('#'+found.data.product_id[0]));

                    remove_from_toProcess(row, found.data);
                } else {
                    let row = table_processed.row($('#'+found.data.product_id[0]));

                    remove_from_processed(row, found.data);
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

/* INIT */

// Get order(s) data from server
function fetch_data() {
    try {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
        $.ajax({
            type: 'POST',
            url: '../get_orders_lines',
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({'po_ids' : group_ids}),
            success: function(data) {
                // for each order
                for (order_data of data.orders) {
                    // for each product in order
                    for (i in order_data.po) {
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


/* LISTS HANDLING */

// Init Data & listeners
function initLists() {
    try {
    // Un-disable validation buttons now the data's here
        if (reception_status == "False") {
            document.getElementById("valid_qty").disabled = false;
            document.getElementById("valid_all_qties").disabled = false;
        } else if (reception_status == "qty_valid") {
            document.getElementById("valid_uprice").disabled = false;
            document.getElementById("valid_all_uprices").disabled = false;
        }

        // Set lists with local storage content
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

        // Init table for to_process content
        table_to_process = $('#table_to_process').DataTable({
            data: list_to_process,
            columns:[
                {data:"product_id.0", title: "id", visible: false},
                {data:"shelf_sortorder", title: "Rayon", className: "dt-body-center"},
                {
                    data:"product_id.1",
                    title:"Produit",
                    width: "45%",
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
                {data:"product_uom.1", title: "Unité vente", className:"dt-body-center", orderable: false},
                {
                    data:"product_qty",
                    title: "Qté",
                    className:"dt-body-center",
                    visible: (reception_status == "False")
                },
                {
                    data:"price_unit",
                    title:"Prix unit.",
                    className:"dt-body-center",
                    visible: (reception_status == "qty_valid")
                },
                {
                    title:"Editer",
                    defaultContent: "<a class='btn' id='toProcess_line_edit' href='#'><i class='far fa-edit'></i></a>",
                    className:"dt-body-center",
                    orderable: false
                },
                {
                    title:"Valider",
                    defaultContent: "<a class='btn' id='toProcess_line_valid' href='#'><i class='far fa-check-square'></i></a>",
                    className:"dt-body-center",
                    orderable: false
                },
                {
                    title:"Autres",
                    defaultContent: "<select class='select_product_action'><option value=''></option><option value='supplier_shortage'>Rupture fournisseur</option></select>",
                    className:"dt-body-center",
                    orderable: false,
                    visible: display_autres
                }
            ],
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
            language: {url : '/static/js/datatables/french.json'}
        });

        // Init table for processed content
        table_processed = $('#table_processed').DataTable({
            data: list_processed,
            columns:[
                {data:"row_counter", title:"row_counter", visible: false}, // Hidden counter to display last row first
                {data:"shelf_sortorder", title: "Rayon", className:"dt-body-center"},
                {
                    data:"product_id.1",
                    title:"Produit",
                    width: "55%",
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
                {data:"product_uom.1", title: "Unité vente", className:"dt-body-center", orderable: false},
                {
                    data:"product_qty",
                    title:"Qté",
                    className:"dt-body-center",
                    visible: (reception_status == "False")
                },
                {
                    data:"price_unit",
                    title:"Prix unit",
                    className:"dt-body-center",
                    visible: (reception_status == "qty_valid")
                },
                {
                    title:"Editer",
                    defaultContent: "<a class='btn' id='processed_line_edit' href='#'><i class='far fa-edit'></i></a>",
                    className:"dt-body-center",
                    orderable: false
                },
                {
                    title:"Autres",
                    className:"dt-body-center",
                    orderable: false,
                    visible: display_autres,
                    render: function (data, type, full) {
                        let disabled = (full.supplier_shortage) ? "disabled" : '';

                        return "<select class='select_product_action'>"
                              + "<option value=''></option>"
                              + "<option value='supplier_shortage' "+disabled+">Rupture fournisseur</option>"
                              + "</select>";
                    }
                }
            ],
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
            language: {url : '/static/js/datatables/french.json'}
        });
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'initLists: init tables'};
        console.error(err);
        report_JS_error(err, 'reception');
    }

    /* Listeners */
    // Direct valid from to_process
    $('#table_to_process tbody').on('click', 'a#toProcess_line_valid', function () {
        if (is_time_to('reception_direct_valid_order_line', 500)) {
            try {
                var row = table_to_process.row($(this).parents('tr'));
                var data = row.data();

                add_to_processed(data);
                remove_from_toProcess(row, data);

                // Update local storage of product's order
                if (!orders[data.id_po]['valid_products'])
                    orders[data.id_po]['valid_products'] = [];
                orders[data.id_po]['valid_products'].push(data['id']);
                localStorage.setItem("order_" + data.id_po, JSON.stringify(orders[data.id_po]));

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
    $('#table_to_process tbody').on('click', 'a#toProcess_line_edit', function () {
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

        // Update local storage of product's order
        localStorage.setItem("order_" + product.id_po, JSON.stringify(orders[product.id_po]));

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
  * If 'value' is set, use it as new value
  */
function editProductInfo (productToEdit, value = null) {
    try {
    // Check if the product is already in the 'updated' list
        var index = searchUpdatedProduct();
        var firstUpdate = false;
        let newValue = value;

        // If 'value' parameter not set, get value from edition input
        if (value == null) {
            newValue = parseFloat(document.getElementById('edition_input').value.replace(',', '.'));
        }

        // If qty edition & Check if qty changed
        if (reception_status == "False" && productToEdit.product_qty != newValue) {
            if (index == -1) { // First update
                productToEdit.old_qty = productToEdit.product_qty;
                firstUpdate = true;
            }

            // Edit product info
            productToEdit.product_qty = newValue;
            /*
            If qty has changed, we choose to set detailed values as follow:
            1 package (product_qty_package) of X products (package_qty)
            */
            productToEdit.product_qty_package = 1;
            productToEdit.package_qty = productToEdit.product_qty;
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
            }

            productToEdit.price_unit = newValue;
        }

        // If the product info has been updated and for the first time
        if (firstUpdate) {
            updatedProducts.push(productToEdit);

            /* Update local storage of product order */
            // Create 'updated_products' list in order if not exists
            if (!orders[productToEdit.id_po]['updated_products'])
                orders[productToEdit.id_po]['updated_products'] = [];

            // Add product to order's updated products if first update
            orders[productToEdit.id_po]['updated_products'].push(productToEdit);

            // May have been directly validated then updated from processed list
            //  -> then: remove from 'valid_products' list
            for (i in orders[productToEdit.id_po]['valid_products']) {
                if (orders[productToEdit.id_po]['valid_products'][i] == productToEdit['id']) {
                    orders[productToEdit.id_po]['valid_products'].splice(i, 1);
                }
            }
        } else {
            // Look for product in order's updated products list
            for (i in orders[productToEdit.id_po]['updated_products']) {
                if (orders[productToEdit.id_po]['updated_products'][i]['product_id'][0]
            == productToEdit['product_id'][0]) {
                    orders[productToEdit.id_po]['updated_products'][i] = productToEdit;
                }
            }
        }

        // Update local storage of product order
        localStorage.setItem("order_" + productToEdit.id_po, JSON.stringify(orders[productToEdit.id_po]));

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

        editProductInfo(data, 0);

        return true;
    });
    list_to_process = [];
    table_to_process.rows().remove()
        .draw();
}



/* ACTIONS */

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

    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
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
            // if product was in different orders
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

            // Add product to order's prod list
            prod_order_id = updatedProducts[i].id_po;
            update_data.orders[prod_order_id]['po'].push(updatedProducts[i]);
        }

        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
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
                    // If step 1 (counting), open pop-up with procedure explanation
                    if (reception_status == "False") {
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
                                } else if (list_processed[i].barcode == false || list_processed[i].barcode == null || list_processed[i].barcode == "") {
                                    // Products with no barcode
                                    var node = document.createElement('li');
                                    let textNode = document.createTextNode(list_processed[i]["product_id"][1]);

                                    node.appendChild(textNode);
                                    document.getElementById('barcodesEmpty_list').appendChild(node);

                                    if (document.getElementById("barcodesEmpty").hidden) {
                                        document.getElementById("barcodesEmpty").hidden = false;
                                        document.getElementById("nothingToDo").hidden = true;
                                    }
                                }
                            }
                        }

                        // Set order(s) name in popup DOM
                        if (Object.keys(orders).length == 1) { // Single order
                            document.getElementById("order_ref").innerHTML = orders[Object.keys(orders)[0]].name;
                        } else {
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
                            function() {
                                document.location.href = "/reception";
                            },
                            'Retour à la liste des commandes',
                            true,
                            false
                        );
                    } else {
                        // Print etiquettes with new prices
                        if (updatedProducts.length > 0) {
                            document.getElementById("etiquettesToPrint").hidden = false;
                        }

                        openModal(
                            $('#templates #modal_pricesValidated').html(),
                            function() {
                                document.location.href = "/reception";
                            },
                            'Retour à la liste des commandes',
                            true,
                            false
                        );
                    }

                    // Go back to to_process list if modal closed
                    $('#modal_closebtn_top').on('click', function () {
                        document.location.href = "/reception";
                    });

                    $('#modal_closebtn_bottom').on('click', function () {
                        document.location.href = "/reception";
                    });

                    // Clear local storage before leaving
                    for (order_id in orders) {
                        localStorage.removeItem("order_" + order_id);
                    }

                    // Delete group(s)
                    if (is_group) {
                        var grouped_orders = JSON.parse(localStorage.getItem('grouped_orders'));

                        // Remove all groups containing these orders
                        for (order_id in orders) {
                            search:
                            for (var h = 0; i < grouped_orders.length; h++) {
                                for (var j = 0; j < grouped_orders[h].length; j++) {
                                    if (grouped_orders[h][j] == order_id) {
                                        grouped_orders.splice(h);
                                        break search;
                                    }
                                }
                            }
                        }

                        localStorage.setItem('grouped_orders', JSON.stringify(grouped_orders));
                    }

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

        // Send changes between items to process and processed items
        var updates = {
            'group_amount_total' : 0,
            'update_type' : updateType,
            'updated_products' : updatedProducts,
            'user_comments': user_comments,
            'orders' : []
        };

        for (i in orders) {
            updates.group_amount_total += orders[i].amount_total;
            updates.orders.push(orders[i]);
        }

        $.ajax({
            type: "POST",
            url: "../save_error_report",
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(updates),
            success: function(data) {},
            error: function() {
                closeModal();
                alert('Erreur dans l\'envoi du rapport.');
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
        editProductInfo(data, value);

        return true;
    });
    list_to_process = [];
    table_to_process.rows().remove()
        .draw();
    closeModal();
}
/* TODO: upgrade modal
-> disable background scrolling*/
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

function saveErrorReport() {
    user_comments = document.getElementById("error_report").value;

    // Save comment in local storage, in all orders
    for (order_id of Object.keys(orders)) {
        orders[order_id].user_comments = user_comments;
        localStorage.setItem("order_" + order_id, JSON.stringify(orders[order_id]));
    }

    document.getElementById("search_input").focus();
}

// Load barcodes at page loading, then barcodes are stored locally
var get_barcodes = async function() {
    if (barcodes == null) barcodes = await init_barcodes();
};


$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
    // Load barcodes
    get_barcodes();

    // Get Route parameter
    var pathArray = window.location.pathname.split('/');
    var id = pathArray[pathArray.length-1];

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

    try {
    // Get order info from local storage (it should be there if process followed)
        if (Modernizr.localstorage) {
            // Look for current order in grouped orders in local storage
            var grouped_orders = JSON.parse(localStorage.getItem('grouped_orders'));

            if (grouped_orders != null) {
                for (group of grouped_orders) {
                    for (group_element_id of group) {
                        if (group_element_id == id) {
                            // We're in a group!
                            is_group = true;
                            group_ids = group;
                        }
                    }
                }
            }

            // if not in group, add current order to group
            if (group_ids.length == 0) {
                group_ids.push(id);
            }

            var stored_order = null;
            var display_partners_name = [];

            // for each order in order group
            for (order_id of group_ids) {
                // Get order data from local storage
                stored_order = JSON.parse(localStorage.getItem('order_' + order_id));

                // Add order to order list
                if (stored_order != null) {
                    orders[order_id] = stored_order;

                    //Add each order's already updated and validated products to common list
                    if (stored_order["updated_products"])
                        updatedProducts = updatedProducts.concat(stored_order["updated_products"]);

                    if (stored_order["valid_products"])
                        validProducts = validProducts.concat(stored_order["valid_products"]);

                    // Prepare data to display in 'partner name' area
                    display_partners_name.push(stored_order['partner'] + ' du ' + stored_order['date_order']);
                }
            }

            // Set current reception status: take first order's
            reception_status = orders[Object.keys(orders)[0]].reception_status;

            // Load user comments from local storage, get it from first order
            user_comments = orders[Object.keys(orders)[0]].user_comments || "";
        }

        // Fetch orders data
        fetch_data();

        if (is_group) {
            $('#partner_name').html(Object.keys(orders).length + " commandes");

            // Display order data for each order
            var msg = "";

            for (display_partner_data of display_partners_name) {
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

            document.getElementById("valid_all").innerHTML = "<button class='btn--danger full_width_button' id='valid_all_qties' onclick=\"openModal($('#templates #modal_no_qties').html(), setAllQties, 'Confirmer');\" disabled>Il n'y a plus de produits à compter</button>";
            document.getElementById("validation_button").innerHTML = "<button class='btn--primary full_width_button' id='valid_qty' onclick=\"pre_send('qty_valid')\" disabled>Valider le comptage des produits</button>";

            $("#modal_qtiesValidated").load("/reception/reception_qtiesValidated");
        } else {
            // Extra security, shouldn't get in here
            document.location.href = "/reception";
        }
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'page init'};
        console.error(err);
        report_JS_error(err, 'reception');

        alert("Erreur au chargement de cette commande. Vous allez être redirigé.");
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
            /*
              Option to possibly enable page scrolling when mouse over the input, but :
                - deltaY is not in pixels in Firefox
                - movement not fluid on other browsers

            var scrollTo = (e.originalEvent.deltaY) + $(document.documentElement).scrollTop();
            $(document.documentElement).scrollTop(scrollTo);

              -> other option to allow scrolling would be to loose input focus with blur(): not acceptable
            */
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
});
