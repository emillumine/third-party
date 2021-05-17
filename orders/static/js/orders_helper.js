var suppliers_list = [],
    products_table = null,
    selected_suppliers = [],
    products = [];

/**
 * Add a supplier to the selected suppliers list.
 * @returns -1 if validation failed, void otherwise
 */
function add_supplier() {
    const user_input = $("#supplier_input").val();

    // Check if user input is a valid supplier
    const supplier = suppliers_list.find(s => s.display_name === user_input)
    if (supplier === undefined) {
        alert("Le fournisseur renseigné n'est pas valide.\n" 
        + "Veuillez sélectionner un fournisseur dans la liste déroulante.");
        return -1;
    }

    const supplier_selected = selected_suppliers.find(s => s.display_name === user_input)
    if (supplier_selected !== undefined) {
        alert("Ce fournisseur est déjà sélectionné.");
        return -1;
    }

    openModal();

    selected_suppliers.push(supplier);

    let url = "/orders/get_supplier_products";
    url += "?sid=" + encodeURIComponent(supplier.id);

    // Fetch supplier products
    $.ajax({
        type: 'GET',
        url: url,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            save_supplier_products(supplier, data.res.products);
            display_products();
            $("#supplier_input").val("")
            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des produits", ctx: 'get_supplier_products'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la récupération des produits, réessayer plus tard.');
        }
    });
}

/**
 * When products are fetched, save them and the relation with the supplier.
 * If product already saved, add the supplier to its suppliers list.
 * Else, add product with supplier.
 * 
 * @param {object} supplier 
 * @param {array} new_products 
 */
function save_supplier_products(supplier, new_products) {
    for (np of new_products) {
        let index = products.findIndex(p => p.id === np.id);

        if (index === -1) {
            np.suppliers = [supplier];
            products.push(np)
        } else {
            products[index].suppliers.push(supplier)
        }
    }
}

/**
 * Look in the 'suppliers' property of a product
 * 
 * @param {object} product 
 * @param {object} supplier 
 * @returns boolean
 */
function is_product_related_to_supplier(product, supplier) {
    return product.suppliers.find(s => s.id === supplier.id) !== undefined;
}


/**
 * Create a string to represent a supplier column in product data
 * @returns String
 */
function supplier_column_name(supplier) {
    let parsed_name = supplier.display_name
    parsed_name = parsed_name.toLowerCase().replaceAll(/\s+/g, " ").trim()
    parsed_name = parsed_name.replaceAll(" ", "_");
    return `supplier_${parsed_name}`;
}

/* DATATABLE */

/**
 * @returns Array of formatted data for datatable data setup
 */
function prepare_datatable_data() {
    let data = [];

    for (product of products) {
        let item = {
            name: product.name
        }

        for (supplier of selected_suppliers) {
            // If product not related to supplier : false ; else null (value to be set)
            item[supplier_column_name(supplier)] = is_product_related_to_supplier(product, supplier) ? null : false;
        }

        data.push(item);
    }

    return data;
}

/**
 * @returns Array of formatted data for datatable columns setup
 */
function prepare_datatable_columns() {
    columns = [
        {
            data: "name",
            title: "Produit",
        }
    ];

    for (supplier of selected_suppliers) {
        columns.push({
            data: supplier_column_name(supplier),
            title: supplier.display_name,
            width: "8%",
            className:"dt-body-center",
            render: function (data, type, full) {
                if (data === false) {
                    return "X";
                } else {
                    return `<input type="number" class="product_qty_input">`
                }
            }
        })
    }

    return columns;
}

/**
 * Display the Datatable containing the products
 */
function display_products() {
    // Empty datatable if already exists
    if (products_table) {
        products_table.clear().destroy();
        $('#products_table').empty();
    }

    const data = prepare_datatable_data();
    const columns = prepare_datatable_columns();

    products_table = $('#products_table').DataTable({
        data: data,
        columns: columns,
        order: [
            [
                1,
                "asc"
            ]
        ],
        dom: 'lrtip',   // TODO: change DOM display?
        iDisplayLength: 100,
        language: {url : '/static/js/datatables/french.json'}
    });

    $('.main').show();
}

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    openModal();

    // Get suppliers
    $.ajax({
        type: 'GET',
        url: "/orders/get_suppliers",
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            suppliers_list = data.res;

            // Set up autocomplete on supplier input
            $( "#supplier_input" ).autocomplete({
                source: suppliers_list.map(a => a.display_name)
            });

            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des fournisseurs", ctx: 'get_suppliers'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la récupération des fournisseurs, rechargez la page plus tard');
        }
    });

    $("#supplier_form").on("submit", function(e) {
        e.preventDefault();
        add_supplier();
    })
});
