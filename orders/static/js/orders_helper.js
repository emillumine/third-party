var suppliers_list = [],
    products_table = null,
    products = [],
    selected_suppliers = [],
    selected_rows = [];

/**
 * Add a supplier to the selected suppliers list.
 *
 * @returns -1 if validation failed, 0 otherwise
 */
function add_supplier() {
    const user_input = $("#supplier_input").val();

    // Check if user input is a valid supplier
    const supplier = suppliers_list.find(s => s.display_name === user_input);

    if (supplier === undefined) {
        alert("Le fournisseur renseigné n'est pas valide.\n"
        + "Veuillez sélectionner un fournisseur dans la liste déroulante.");

        return -1;
    }

    const supplier_selected = selected_suppliers.find(s => s.display_name === user_input);

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
            $("#supplier_input").val("");
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

    return 0;
}

/**
 * Remove a supplier from the selected list & its associated products
 *
 * @param {int} supplier_id
 */
function remove_supplier(supplier_id) {
    // Remove from suppliers list
    selected_suppliers = selected_suppliers.filter(supplier => supplier.id != supplier_id);

    // Remove the supplier from the products suppliers list
    for (const i in products) {
        products[i].suppliers = products[i].suppliers.filter(supplier => supplier.id != supplier_id);
    }

    // Remove products only associated to this product
    products = products.filter(product => product.suppliers.length > 0);

    update_display();
}


/**
 * Send to server the association product-supplier
 *
 * @param {object} product
 * @param {object} supplier
 * @param {node} cell product's row in datatable
 */
function save_supplier_product_association(product, supplier, cell) {
    openModal();

    const data = {
        product_tmpl_id: product.id,
        supplier_id: supplier.id
    };

    // Fetch supplier products
    $.ajax({
        type: "POST",
        url: "/orders/associate_supplier_to_product",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        success: () => {
            // Save relation locally
            save_supplier_products(supplier, [product]);

            // Update table
            $(cell).removeClass("product_not_from_supplier");
            const row = $(cell).closest("tr");
            const new_row_data = prepare_datatable_data([product.id])[0];

            products_table.row(row).data(new_row_data)
                .draw();

            closeModal();
        },
        error: function(data) {
            let msg = "erreur serveur lors de la sauvegarde de l'association product/supplier".
                msg += ` (product_tmpl_id: ${product.id}; supplier_id: ${supplier.id})`;

            err = {msg: msg, ctx: 'save_supplier_product_association'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la sauvegarde de l\'association. Veuillez ré-essayer plus tard.');
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
            np.suppliers = [{ ...supplier }];
            products.push(np);
        } else {
            products[index].suppliers.push({ ...supplier });
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
        let template = $("#templates #supplier_pill");

        template.find(".pill_supplier_name").text(supplier.display_name);
        template.find(".remove_supplier_icon").attr('id', `remove_supplier_${supplier.id}`);

        supplier_container.append(template.html());
    }

    $(".remove_supplier_icon").on("click", function() {
        const el_id = $(this).attr('id')
            .split('_');
        const supplier_id = el_id[el_id.length-1];

        let modal_remove_supplier = $('#templates #modal_remove_supplier');

        modal_remove_supplier.find(".supplier_name").text(supplier.display_name);

        openModal(
            modal_remove_supplier.html(),
            () => {
                remove_supplier(supplier_id);
            },
            'Valider'
        );
    });
}

/* DATATABLE */

/**
 * @param {array} product_ids if set, return formatted data for these products only
 * @returns Array of formatted data for datatable data setup
 */
function prepare_datatable_data(product_ids = []) {
    let data = [];
    let products_to_format = [];

    if (product_ids.length > 0) {
        products_to_format = products.filter(p => product_ids.includes(p.id));
    } else {
        products_to_format = products;
    }

    for (product of products_to_format) {
        let item = {
            id: product.id,
            name: product.name,
            default_code: product.default_code,
            incoming_qty: +parseFloat(product.incoming_qty).toFixed(3), // + sign removes unecessary zeroes at the end
            qty_available: +parseFloat(product.qty_available).toFixed(3),
            uom: product.uom_id[1]
        };

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
            title:` <div id="table_header_select_all">
                        Tout 
                        <input type="checkbox" class="select_product_cb" id="select_all_products_cb" value="all">
                    </div>`,
            className:"dt-body-center",
            orderable: false,
            render: function (data) {
                return `<input type="checkbox" class="select_product_cb" id="select_product_${data}" value="${data}">`;
            },
            width: "4%"
        },
        {
            data: "default_code",
            title: "Référence Produit",
            width: "8%",
            render: function (data) {
                return (data === false) ? "" : data;
            }
        },
        {
            data: "name",
            title: "Produit"
        },
        {
            data: "qty_available",
            title: "Stock",
            width: "4%"
        },
        {
            data: "incoming_qty",
            title: "Quantité entrante",
            width: "4%"
        }
    ];

    for (const supplier of selected_suppliers) {
        columns.push({
            data: supplier_column_name(supplier),
            title: supplier.display_name,
            width: "10%",
            className: `dt-body-center supplier_input_cell`,
            render: (data, type, full) => {
                const base_id = `product_${full.id}_supplier_${supplier.id}`;

                if (data === false) {
                    return `<div id="${base_id}_cell_content" class="cell_content">X</div>`;
                } else {
                    return `<div id="${base_id}_cell_content" class="cell_content">
                                <input type="number" class="product_qty_input" id="${base_id}_qty_input" value=${data}>
                            </div>`;
                }
            }
        });
    }

    columns.push({
        data: "uom",
        title: "UDM",
        width: "4%"
    });

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
                5, // Order by default by first supplier
                "asc"
            ]
        ],
        stripeClasses: [], // Remove datatable cells coloring
        orderClasses: false,
        iDisplayLength: 100,
        scrollX: true,
        language: {url : '/static/js/datatables/french.json'},
        createdRow: function(row) {
            for (const cell_node of row.cells) {
                const cell = $(cell_node);

                if (cell.hasClass("supplier_input_cell")) {
                    if (cell.text() == "X") {
                        cell.addClass('product_not_from_supplier');
                    } else {
                        // TODO: supplier shortage cell coloring, when supplier shortage usecase is defined

                        // let val = parseFloat(cell.find('.product_qty_input').val());
                        // if (!isNaN(val) && val < 0) {
                        //     cell.addClass( 'product_supplier_shortage' );
                        // }
                    }
                }
            }
        }
    });

    $('.main').show();

    // Save value on inputs change
    $('#products_table').on('input', 'tbody td .product_qty_input', function () {
        let val = parseFloat($(this).val());

        // If value is a number
        if (!isNaN(val)) {
            const id_split = $(this).attr('id')
                .split('_');
            const prod_id = id_split[1];
            const supplier_id = id_split[3];

            save_product_supplier_qty(prod_id, supplier_id, val);
        }
    });

    // Associate product to supplier on click on 'X' in the table
    $('#products_table').on('click', 'tbody .product_not_from_supplier', function () {
        // Get supplier & product id
        const el_id = $(this).children()
            .first()
            .attr('id')
            .split('_');
        const product_id = el_id[1];
        const supplier_id = el_id[3];

        const product = products.find(p => p.id == product_id);
        const supplier = selected_suppliers.find(s => s.id == supplier_id);

        let modal_attach_product_to_supplier = $('#templates #modal_attach_product_to_supplier');

        modal_attach_product_to_supplier.find(".product_name").text(product.name);
        modal_attach_product_to_supplier.find(".supplier_name").text(supplier.display_name);

        openModal(
            modal_attach_product_to_supplier.html(),
            () => {
                save_supplier_product_association(product, supplier, this);
            },
            'Valider',
            false
        );
    });

    // Select row(s) on checkbox change
    $('#products_table').on('click', 'thead th #select_all_products_cb', function () {
        if (this.checked) {
            selected_rows = [];
            products_table.rows().every(function() {
                const node = $(this.node());

                node.addClass('selected');
                node.find(".select_product_cb").first()
                    .prop("checked", true);

                // Save selected rows in case the table is updated
                selected_rows.push(this.data().id);

                return 0;
            });
        } else {
            unselect_all_rows();
        }
    });
    $('#products_table').on('click', 'tbody td .select_product_cb', function () {
        $(this).closest('tr')
            .toggleClass('selected');

        // Save / unsave selected row
        p_id = products_table.row($(this).closest('tr')).data().id;
        if (this.checked) {
            selected_rows.push(p_id);
        } else {
            const i = selected_rows.findIndex(id => id == p_id);

            selected_rows.splice(i, 1);
        }
    });

    return 0;
}

/**
 * Unselect all rows from datatable.
 */
function unselect_all_rows() {
    products_table.rows().every(function() {
        const node = $(this.node());

        node.removeClass('selected');
        node.find(".select_product_cb").first()
            .prop("checked", false);

        return 0;
    });

    selected_rows = [];
}

/**
 * Update DOM display
 */
function update_display() {
    // Remove listener before recreating them
    $('#products_table').off('click', 'tbody .product_not_from_supplier');
    $('#products_table').off('click', 'thead th #select_all_products_cb');
    $('#products_table').off('click', 'tbody td .select_product_cb');

    display_suppliers();
    display_products();

    // Re-select previously selected rows
    if (selected_rows.length > 0) {
        products_table.rows().every(function() {
            if (selected_rows.includes(this.data().id)) {
                const node = $(this.node());

                node.addClass('selected');
                node.find(".select_product_cb").first()
                    .prop("checked", true);
            }

            return 0;
        });
    }
}

function generate_inventory() {
    if (products_table !== null) {
        const selected_data = products_table.rows('.selected').data();

        if (selected_data.length == 0) {
            alert("Veuillez sélectionner les produits à inventorier en cochant les cases sur la gauche du tableau.");
        } else {
            data = {
                lines: [],
                partners_id: [],
                type: 'product_templates'
            };

            for (var i = 0; i < selected_data.length; i++) {
                const product = products.find(p => p.id == selected_data[i].id);

                data.lines.push(product.id);
                for (const supplier of product.suppliers) {
                    if (data.partners_id.indexOf(supplier.id) === -1) {
                        data.partners_id.push(supplier.id);
                    }
                }
            }

            let modal_create_inventory = $('#templates #modal_create_inventory');

            modal_create_inventory.find(".inventory_products_count").text(data.lines.length);

            openModal(
                modal_create_inventory.html(),
                () => {
                    $.ajax({
                        type: "POST",
                        url: "/inventory/generate_inventory_list",
                        dataType: "json",
                        traditional: true,
                        contentType: "application/json; charset=utf-8",
                        data: JSON.stringify(data),
                        success: () => {
                            unselect_all_rows();

                            // Give time for modal to fade
                            setTimeout(function() {
                                $.notify(
                                    "Inventaire créé !",
                                    {
                                        globalPosition:"top left",
                                        className: "success"
                                    }
                                );
                            }, 500);
                        },
                        error: function(data) {
                            let msg = "erreur serveur lors de la création de l'inventaire".
                                err = {msg: msg, ctx: 'generate_inventory'};

                            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                                err.msg += ' : ' + data.responseJSON.error;
                            }
                            report_JS_error(err, 'orders');

                            alert("Erreur lors de la création de l'inventaire. Réessayez plus tard.");
                        }
                    });
                },
                'Valider'
            );
        }
    }
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
            $("#supplier_input").autocomplete({
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
    });

    $("#do_inventory").on("click", function() {
        generate_inventory();
    });
});
