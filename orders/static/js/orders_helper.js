var suppliers_list = [],
    products_table = null,
    selected_suppliers = [],
    products = [];

/**
 * Add a supplier to the selected suppliers list.
 * 
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
            update_display();
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
 * Remove a supplier from the selected list & its associated products
 * 
 * @param {int} supplier_id 
 */
function remove_supplier(supplier_id) {
    // Remove from suppliers list
    selected_suppliers = selected_suppliers.filter(supplier => supplier.id != supplier_id)

    // Remove the supplier from the products suppliers list
    for (const i in products) {
        products[i].suppliers = products[i].suppliers.filter(supplier => supplier.id != supplier_id)
    }

    // Remove products only associated to this product
    products = products.filter(product => product.suppliers.length > 0)

    update_display();
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
            np.suppliers = [{ ...supplier }];
            products.push(np)
        } else {
            products[index].suppliers.push({ ...supplier })
        }
    }
}

/**
 * Save the quantity set for a product/supplier
 * 
 * @param {int} prod_id 
 * @param {int} supplier_id 
 * @param {float} val 
 */
function save_product_supplier_qty(prod_id, supplier_id, val) {
    for (const i in products) {
        if (products[i].id == prod_id) {
            for (const j in products[i].suppliers) {
                if (products[i].suppliers[j].id == supplier_id) {
                    products[i].suppliers[j].qty = val;
                    break;
                }
            }
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
    return `qty_supplier_${supplier.id}`;
}

/**
 * Display the selected suppliers
 */
function display_suppliers() {
    let supplier_container = $("#suppliers_container");
    $("#suppliers_container").empty();

    for (supplier of selected_suppliers) {
        let template = $("#templates #supplier_pill")
        template.find(".supplier_name").text(supplier.display_name);
        template.find(".remove_supplier_icon").attr('id', `remove_supplier_${supplier.id}`)

        supplier_container.append(template.html());
    }

    $(".remove_supplier_icon").on("click", function(e) {
        const el_id = $(this).attr('id').split('_');
        const supplier_id = el_id[el_id.length-1];

        let modal_remove_supplier = $('#templates #modal_remove_supplier');
        modal_remove_supplier.find(".supplier_name").text(supplier.display_name);

        openModal(
            modal_remove_supplier.html(),
            () => {
                remove_supplier(supplier_id);
            },
            'Valider',
        );
    })
}

/* DATATABLE */

/**
 * @returns Array of formatted data for datatable data setup
 */
function prepare_datatable_data() {
    let data = [];

    for (product of products) {
        let item = {
            id: product.id,
            name: product.name
        }

        // If product not related to supplier : false ; else null (qty to be set) or qty
        for (product_supplier of product.suppliers) {
            item[supplier_column_name(product_supplier)] = ("qty" in product_supplier) ? product_supplier.qty : null;
        }

        for (supplier of selected_suppliers) {
            if (!is_product_related_to_supplier(product, supplier)) {
                item[supplier_column_name(supplier)] = false;
            }
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
            data: "id",
            title: "id",
            visible: false
        },
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
                    const input_id = `product_${full.id}_supplier_${supplier.id}_qty_input`
                    return `<input type="number" class="product_qty_input" id=${input_id} value=${data}>`
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
    if (products.length == 0) {
        $('.main').hide();
        return -1;
    }

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
                2,
                "asc"
            ]
        ],
        dom: 'lrtip',   // TODO: change DOM display?
        iDisplayLength: 100,
        language: {url : '/static/js/datatables/french.json'}
    });

    $('.main').show();

    // Save value on inputs change
    $('#products_table').on('input', 'tbody td .product_qty_input', function () {
        let val = parseFloat($(this).val())

        // If value is a number
        if (!isNaN(val)) {
            const id_split = $(this).attr('id').split('_')
            const prod_id = id_split[1];
            const supplier_id = id_split[3];
            save_product_supplier_qty(prod_id, supplier_id, val);
        }
    });
}

/**
 * Update DOM display
 */
function update_display() {
    display_suppliers();
    display_products();
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

    // TODO: on click on 'X' change to input
});
