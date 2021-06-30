var suppliers_list = [],
    selected_suppliers = [],
    products_list = [],
    products = [],
    products_table = null,
    selected_rows = [],
    product_orders = [],
    date_format = "dd/mm/yy",
    new_product_supplier_association = {
        package_qty: null,
        price: null
    };

var dbc = null,
    sync = null,
    order_doc = {
        _id: null,
        date_planned: null,
        coverage_days: null,
        last_update: {
            timestamp: null,
            fingerprint: null
        },
        products: [],
        selected_suppliers: [],
        selected_rows: []
    },
    fingerprint = null;

var clicked_order_pill = null;


/* - UTILS */

/**
 * Reset data that changes between screens
 */
function reset_data() {
    products = [];
    selected_suppliers = [];
    selected_rows = [];
    product_orders = [];
    order_doc = {
        _id: null,
        date_planned: null,
        coverage_days: null,
        last_update : {
            timestamp: null,
            fingerprint: null
        },
        products: [],
        selected_suppliers: []
    };
    new_product_supplier_association = {
        package_qty: null,
        price: null
    };
    clicked_order_pill = null;
}

/**
 * Difference between two dates
 * @param {Date} date1
 * @param {Date} date2
 * @returns difference object
 */
function dates_diff(date1, date2) {
    var diff = {};
    var tmp = date2 - date1;

    tmp = Math.floor(tmp/1000);
    diff.sec = tmp % 60;

    tmp = Math.floor((tmp-diff.sec)/60);
    diff.min = tmp % 60;

    tmp = Math.floor((tmp-diff.min)/60);
    diff.hours = tmp % 24;

    tmp = Math.floor((tmp-diff.hours)/24);
    diff.days = tmp;

    return diff;
}

/* - PRODUCTS */

/**
 * Add a product.
 *
 * @returns -1 if validation failed, 0 otherwise
 */
function add_product() {
    const user_input = $("#product_input").val();

    // Check if user input is a valid article
    const product = products_list.find(s => s.display_name === user_input);

    if (product === undefined) {
        alert("L'article renseigné n'est pas valide.\n"
        + "Veuillez sélectionner un article dans la liste déroulante.");

        return -1;
    }

    const product_exists = products.findIndex(p => p.name === user_input);

    if (product_exists !== -1) {
        alert("Cet article est déjà dans le tableau.");
        $("#product_input").val('');

        return -1;
    }

    /* 
    onst product_ids = products.map(p => p.id);

        if (product_ids.length > 0) {
            clicked_order_pill.find('.pill_order_name').empty().append(`<i class="fas fa-spinner fa-spin"></i>`);

            $.ajax({
                type: 'POST',
                url: '/products/get_product_for_order_helper',
                data: JSON.stringify(product_ids),
                dataType:"json",
    */

    $.ajax({
        type: 'POST',
        url: '/products/get_product_for_order_helper',
        data: JSON.stringify([product.tpl_id]),
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            let res = data.products[0];
            if (typeof res.id != "undefined") {
                res.suppliersinfo = [];
                res.default_code = ' ';
                products.unshift(res);
                update_main_screen({'sort_order_dir':'desc'});
                update_cdb_order();
            } else {
                alert("L'article n'a pas toutes les caractéristiques pour être ajouté.");
            }
            $("#product_input").val('');
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des données liées à l'article", ctx: 'get_product_for_help_order_line'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');
            alert('Erreur lors de la récupération des informations, réessayer plus tard.');
        }
    });

    return 0;
}

/**
 * Compute the qty to buy for each product, depending the coverage days.
 * Set the computed qty for the first supplier only.
 */
function compute_products_coverage_qties() {
    for (const [
        key,
        product
    ] of Object.entries(products)) {
        let purchase_qty_for_coverage = null;

        // Durée couverture produit = (stock + qté entrante + qté commandée ) / conso quotidienne
        const stock = product.qty_available;
        const incoming_qty = product.incoming_qty;
        const daily_conso = product.daily_conso;

        purchase_qty_for_coverage = order_doc.coverage_days * daily_conso - stock - incoming_qty;
        purchase_qty_for_coverage = (purchase_qty_for_coverage < 0) ? 0 : purchase_qty_for_coverage;

        // Reduce to nb of packages to purchase
        purchase_package_qty_for_coverage = purchase_qty_for_coverage / product.suppliersinfo[0].package_qty;

        // Round according to uom
        if (product.uom_id[0] == 1 || product.uom_id[0] == 20) {
            purchase_package_qty_for_coverage = parseFloat(purchase_package_qty_for_coverage).toFixed(0);
        } else {
            purchase_package_qty_for_coverage = parseFloat(purchase_package_qty_for_coverage).toFixed(2);
        }

        // Set qty to purchase for first supplier only
        products[key].suppliersinfo[0].qty = purchase_package_qty_for_coverage;
    }
}

/**
 * Update order products data in case they have changed.
 */
function check_products_data() {
    return new Promise((resolve, reject) => {
        const product_ids = products.map(p => p.id);

        if (product_ids.length > 0) {
            clicked_order_pill.find('.pill_order_name').empty().append(`<i class="fas fa-spinner fa-spin"></i>`);

            $.ajax({
                type: 'POST',
                url: '/products/get_product_for_order_helper',
                data: JSON.stringify(product_ids),
                dataType:"json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                success: function(data) {
                    for (let product of data.products) {
                        const p_index = products.findIndex(p => p.id == product.id);

                        // Override products data with new data
                        products[p_index] = { ...products[p_index], ...product };
                    }

                    resolve();
                },
                error: function(data) {
                    err = {msg: "erreur serveur lors de la vérification des données des articles", ctx: 'check_products_data'};
                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                        err.msg += ' : ' + data.responseJSON.error;
                    }
                    report_JS_error(err, 'orders');
                    alert(`Erreur lors de la vérification des données des articles. Certaines données peuvent être erronées`);

                    // Don't block process if this call fails
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}


/* - SUPPLIERS */

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
            update_main_screen();
            $("#supplier_input").val("");
            update_cdb_order();
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
        products[i].suppliersinfo = products[i].suppliersinfo.filter(supplier => supplier.supplier_id != supplier_id);
    }

    // Remove products only associated to this product
    products = products.filter(product => product.suppliersinfo.length > 0);

    update_main_screen();
    update_cdb_order();
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

    $('.new_product_supplier_price').off();
    $('.new_product_supplier_package_pty').off();

    const package_qty = parseFloat(new_product_supplier_association.package_qty);
    const price = parseFloat(new_product_supplier_association.price);

    // If value is a number
    if (isNaN(package_qty) || isNaN(price)) {
        closeModal();
        alert(`Les champs "Prix" et "Colisage" doivent être remplis et valides. L'association n'a pas été sauvegardée.`);

        return -1;
    }

    const data = {
        product_tmpl_id: product.id,
        supplier_id: supplier.id,
        package_qty: package_qty,
        price: price
    };

    // Send request to create association
    $.ajax({
        type: "POST",
        url: "/orders/associate_supplier_to_product",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        success: () => {
            // Save supplierinfo in product
            if (!('suppliersinfo' in product)) {
                product.suppliersinfo = [];
            }

            product.suppliersinfo.push({
                supplier_id: supplier.id,
                package_qty: package_qty,
                price: price
            });

            // Save relation locally
            save_supplier_products(supplier, [product]);

            // Update table
            $(cell).removeClass("product_not_from_supplier");
            const row = $(cell).closest("tr");
            const new_row_data = prepare_datatable_data([product.id])[0];

            products_table.row(row).data(new_row_data)
                .draw();

            update_cdb_order();
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

    return 0;
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
            products.push(np);
        } else {
            // Prevent adding ducplicate supplierinfo
            let index_existing_supplierinfo = products[index].suppliersinfo.find(psi => psi.supplier_id == supplier.id);

            if (index_existing_supplierinfo === -1) {
                np_supplierinfo = np.suppliersinfo[0];
                products[index].suppliersinfo.push(np_supplierinfo);
            }
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
            for (const j in products[i].suppliersinfo) {
                if (products[i].suppliersinfo[j].supplier_id == supplier_id) {
                    products[i].suppliersinfo[j].qty = val;
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
    return product.suppliersinfo.find(s => s.supplier_id === supplier.id) !== undefined;
}

/* - PRODUCT */

/**
 * Update 'purchase_ok' of a product
 *
 * @param {int} p_id product id
 * @param {Boolean} npa value to set purchase_ok to
 */
function set_product_npa(p_id, npa) {
    openModal();

    const data = {
        product_tmpl_id: p_id,
        purchase_ok: !npa
    };

    // Fetch supplier products
    $.ajax({
        type: "POST",
        url: "/products/update_product_purchase_ok",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        success: () => {
            const index = products.findIndex(p => p.id == p_id);

            products[index].purchase_ok = data["purchase_ok"];
            update_cdb_order();

            closeModal();
        },
        error: function(data) {
            let msg = "erreur serveur lors de la sauvegarde du NPA".
                msg += ` (product_tmpl_id: ${p_id})`;

            err = {msg: msg, ctx: 'set_product_npa'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la sauvegarde de la donnée. Veuillez ré-essayer plus tard.');
            update_main_screen();
        }
    });
}

/* - INVENTORY */

/**
 * Create an inventory with the selected lines in the table
 */
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
                for (const supplierinfo of product.suppliersinfo) {
                    if (data.partners_id.indexOf(supplierinfo.supplier_id) === -1) {
                        data.partners_id.push(supplierinfo.supplier_id);
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
                                $('#do_inventory').notify(
                                    "Inventaire créé !",
                                    {
                                        globalPosition:"bottom center",
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

/* - ORDER */

/**
 * Event fct: on click on an order button
 */
function order_pill_on_click() {
    clicked_order_pill = $(this);
    let order_name_container = clicked_order_pill.find('.pill_order_name');
    let doc_id = $(order_name_container).text();

    dbc.get(doc_id).then((doc) => {
        if (doc.last_update.fingerprint !== fingerprint) {
            time_diff = dates_diff(new Date(doc.last_update.timestamp), new Date());
            diff_str = ``;

            if (time_diff.days !== 0) {
                diff_str += `${time_diff.days} jour(s), `;
            }
            if (time_diff.hours !== 0) {
                diff_str += `${time_diff.hours} heure(s), `;
            }
            if (time_diff.min !== 0) {
                diff_str += `${time_diff.min} min, `;
            }
            diff_str += `${time_diff.sec}s`;

            let modal_order_access = $('#templates #modal_order_access');

            modal_order_access.find(".order_last_update").text(diff_str);

            openModal(
                modal_order_access.html(),
                () => {
                    goto_main_screen(doc);
                },
                'Valider'
            );
        } else {
            goto_main_screen(doc);
        }
    })
        .catch(function (err) {
            if (err.status == 404) {
                $.notify(
                    "Cette commande n'existe plus.",
                    {
                        globalPosition:"top right",
                        className: "error"
                    }
                );
                update_order_selection_screen();
            } else {
                alert('Erreur lors de la récupération de la commande. Si l\'erreur persiste, contactez un administrateur svp.');
            }
            console.log(err);
        });
}

/**
 * Create an order in couchdb if the name doesn't exist
 */
function create_cdb_order() {
    const order_name = $("#new_order_name").val();

    order_doc._id = order_name;
    order_doc.last_update = {
        timestamp: Date.now(),
        fingerprint: fingerprint
    };
    dbc.put(order_doc, function callback(err, result) {
        if (!err) {
            order_doc._rev = result.rev;
            update_main_screen();
            switch_screen();
        } else {
            if (err.status == 409) {
                alert("Une commande porte déjà ce nom !");
            }
            console.log(err);
        }
    });
}

/**
 * Update order data of an existing order in couchdb
 */
function update_cdb_order() {
    order_doc.products = products;
    order_doc.selected_suppliers = selected_suppliers;

    // Save that current user last updated the order
    order_doc.last_update = {
        timestamp: Date.now(),
        fingerprint: fingerprint
    };

    dbc.put(order_doc, function callback(err, result) {
        if (!err && result !== undefined) {
            order_doc._rev = result.rev;
        } else {
            alert("Erreur lors de la sauvegarde de la commande... Si l'erreur persiste contactez un administrateur svp.");
            console.log(err);
        }
    });
}

/**
 * Create the Product Orders in Odoo
 */
function create_orders() {
    openModal();

    let orders_data = {
        "date_planned": order_doc.date_planned,
        "suppliers_data": {}
    };

    // Prepare data: get products where a qty is set
    for (let p of products) {
        for (let p_supplierinfo of p.suppliersinfo) {
            // If a qty is set for a supplier for a product
            if ('qty' in p_supplierinfo) {
                const supplier_id = p_supplierinfo.supplier_id;

                // Create entry for this supplier in data object if doesn't exist
                if (orders_data.suppliers_data[supplier_id] === undefined) {
                    orders_data.suppliers_data[supplier_id] = [];
                }

                orders_data.suppliers_data[supplier_id].push({
                    'package_qty': p_supplierinfo.package_qty,
                    'product_id': p.id,
                    'name': p.name,
                    'product_qty_package': p_supplierinfo.qty,
                    'product_qty': p_supplierinfo.qty * p_supplierinfo.package_qty,
                    'product_uom': p.uom_id[0],
                    'price_unit': p_supplierinfo.price,
                    'supplier_taxes_id': p.supplier_taxes_id,
                    'product_variant_ids': p.product_variant_ids
                });
            }
        }
    }

    if (Object.keys(orders_data.suppliers_data).length === 0) {
        closeModal();
        alert("Commande non créée : vous n'avez rentré aucune quantité !");

        return -1;
    }

    $.ajax({
        type: "POST",
        url: "/orders/create_orders",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(orders_data),
        success: (result) => {
            $('#recap_delivery_date').text($('#date_planned_input').val());

            // Display new orders
            for (let new_order of result.res.created) {
                const supplier_name = suppliers_list.find(s => s.id == new_order.supplier_id).display_name;

                product_orders.push({
                    'id': new_order.id_po,
                    'supplier_id': new_order.supplier_id,
                    'supplier_name': supplier_name
                });

                let new_order_template = $("#templates #new_order_item_template");

                new_order_template.find(".new_order_supplier_name").text(supplier_name);
                new_order_template.find(".new_order_po").text(`PO${new_order.id_po}`);
                new_order_template.find(".download_order_file_button").attr('id', `download_attachment_${new_order.id_po}`);

                $('#created_orders_area').append(new_order_template.html());
            }

            // Prepare buttons to download order attachment
            get_order_attachments();

            // Clear data
            order_doc._deleted = true;
            update_cdb_order();
            reset_data();
            update_order_selection_screen();

            switch_screen('orders_created');
            closeModal();
        },
        error: function(data) {
            let msg = "erreur serveur lors de la création des product orders";

            err = {msg: msg, ctx: 'save_supplier_product_association', data: orders_data};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la création des commandes. Veuillez ré-essayer plus tard.');
        }
    });

    return 0;
}

/**
 * Get the PO attachment id.
 * Display download button when fetch is succesful.
 * The file might not be created soon enough, so try again after 10s if error server
 */
function get_order_attachments() {
    if (product_orders.length > 0) {
        let po_ids = product_orders.map(po => po.id);

        $.ajax({
            type: 'GET',
            url: "/orders/get_orders_attachment",
            data: {
                'po_ids': po_ids
            },
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                for (let res_po of data.res) {
                    $(`#download_attachment_${res_po.id_po}`).attr('href', `${odoo_server}/web/content/${res_po.id_attachment}?download=true`);
                }

                $('#created_orders_area .download_order_file_loading').hide();
                $('#created_orders_area .download_order_file_button').show();
            },
            error: function() {
                $.notify(
                    "Échec de la récupération du lien de téléchargement des fichiers. Nouvelle tentative dans 10s.",
                    {
                        globalPosition:"top right",
                        className: "error"
                    }
                );

                setTimeout(get_order_attachments, 10000);
            }
        });
    }
}


/* - DISPLAY */

function goto_main_screen(doc) {
    order_doc = doc;
    products = order_doc.products;
    selected_suppliers = order_doc.selected_suppliers;

    check_products_data()
        .then(() => {
            update_cdb_order();
            update_main_screen();
            switch_screen();
        })
}

function back() {
    reset_data();
    update_order_selection_screen();
    switch_screen('order_selection');
}

/**
 * Create a string to represent a supplier column in product data
 * @returns String
 */
function supplier_column_name(supplier) {
    const supplier_id = ('supplier_id' in supplier) ? supplier.supplier_id : supplier.id;


    return `qty_supplier_${supplier_id}`;
}

/**
 * Display the selected suppliers
 */
function display_suppliers() {
    let supplier_container = $("#suppliers_container");

    $("#suppliers_container").empty();
    $(".remove_supplier_icon").off();

    for (supplier of selected_suppliers) {
        let template = $("#templates #supplier_pill_template");

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

function _compute_product_data(product) {
    let item = {};

    /* Supplier related data */
    let purchase_qty = 0; // Calculate product's total purchase qty
    let p_package_qties = []; // Look for differences in package qties

    for (let p_supplierinfo of product.suppliersinfo) {
        // Preset qty for input if product related to supplier: existing qty or null (null -> qty to be set, display an empty input)
        let supplier_qty = ("qty" in p_supplierinfo) ? p_supplierinfo.qty : null;

        item[supplier_column_name(p_supplierinfo)] = supplier_qty;

        // Update product's total qty to buy if qty set for this supplier
        if (supplier_qty !== null) {
            purchase_qty += +parseFloat(supplier_qty * p_supplierinfo.package_qty).toFixed(2);
        }

        // Store temporarily product package qties
        p_package_qties.push(p_supplierinfo.package_qty);
    }

    item.purchase_qty = purchase_qty;

    // If product not related to supplier, set qty for this supplier to false (false -> don't display any input)
    for (supplier of selected_suppliers) {
        if (!is_product_related_to_supplier(product, supplier)) {
            item[supplier_column_name(supplier)] = false;
        }
    }

    if (p_package_qties.length == 0 || !p_package_qties.every((val, i, arr) => val === arr[0])) {
        // Don't display package qty if no supplierinf or if not all package qties are equals,
        item.package_qty = 'X';
    } else {
        // If all package qties are equals, display it
        item.package_qty = p_package_qties[0];
    }

    /* Coverage related data */
    if (order_doc.coverage_days !== null) {
        let unmet_needs = product.daily_conso * order_doc.coverage_days - product.qty_available - product.incoming_qty - purchase_qty;

        unmet_needs = -Math.round(unmet_needs);
        unmet_needs = (unmet_needs > 0) ? 0 : unmet_needs;

        item.unmet_needs = unmet_needs;
    } else {
        item.unmet_needs = 'X';
    }

    return item;
}

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
        const item = {
            id: product.id,
            name: product.name,
            default_code: product.default_code,
            incoming_qty: +parseFloat(product.incoming_qty).toFixed(3), // '+' removes unecessary zeroes at the end
            qty_available: +parseFloat(product.qty_available).toFixed(3),
            daily_conso: product.daily_conso,
            purchase_ok: product.purchase_ok,
            uom: product.uom_id[1],
            stats: "Ecart type: " + product.sigma + ", % jours sans vente = " + (product.vpc) * 100
        };

        const computed_data = _compute_product_data(product);

        const full_item = { ...item, ...computed_data };

        data.push(full_item);
    }

    return data;
}

/**
 * @returns Array of formatted data for datatable columns setup
 */
function prepare_datatable_columns() {
    let columns = [
        {
            data: "id",
            title: `<div id="table_header_select_all" class="txtcenter">
                        <span class="select_all_text">Sélectionner</span>
                        <label for="select_all_products_cb">- Tout</label>
                        <input type="checkbox" class="select_product_cb" id="select_all_products_cb" name="select_all_products_cb" value="all">
                    </div>`,
            className: "dt-body-center",
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
            data: "purchase_ok",
            title: `NPA`,
            className: "dt-body-center",
            orderable: false,
            render: function (data) {
                return `<input type="checkbox" class="product_npa_cb" value="purchase_ok" ${data ? '' : 'checked'}>`;
            },
            width: "4%"
        },
        {
            data: "qty_available",
            title: "Stock",
            className: "dt-body-center",
            width: "4%"
        },
        {
            data: "incoming_qty",
            title: "Quantité entrante",
            className: "dt-body-center",
            width: "4%"
        },
        {
            data: "daily_conso",
            title: "Conso moy /jour",
            render: function (data, type, full) {
                return '<div class="help" title="' + full.stats+ '">' + data + '</div>';
            },
            className: "dt-body-center",
            width: "6%"
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
                    return `<div id="${base_id}_cell_content" class="custom_cell_content">X</div>`;
                } else {
                    let content = `<div id="${base_id}_cell_content" class="custom_cell_content">
                                        <input type="number" class="product_qty_input" id="${base_id}_qty_input" min="0" value=${data}>`;

                    if (full.package_qty === 'X') {
                        let product_data = products.find(p => p.id == full.id);

                        if (product_data !== undefined) {
                            let supplierinfo = product_data.suppliersinfo.find(psi => psi.supplier_id == supplier.id);

                            content += `<span class="supplier_package_qty">Colisage : ${supplierinfo.package_qty}</span>`;
                        }
                    }

                    content += `</div>`;

                    return content;
                }
            }
        });
    }

    columns.push({
        data: "package_qty",
        title: "Colisage",
        className: "dt-body-center",
        width: "4%"
    });

    columns.push({
        data: "uom",
        title: "UDM",
        className: "dt-body-center",
        width: "4%"
    });

    columns.push({
        data: "purchase_qty",
        title: "Qté Achat",
        className: "dt-body-center",
        width: "4%"
    });

    columns.push({
        data: "unmet_needs",
        title: "Besoin non couvert",
        className: "dt-body-center",
        width: "4%"
    });

    return columns;
}

/**
 * Display the Datatable containing the products
 */
function display_products(params) {
    if (products.length == 0) {
        $('.main').hide();
        $('#main_content_footer').hide();
        $('#do_inventory').hide();

        return -1;
    }

    // Empty datatable if it already exists
    if (products_table) {
        products_table.clear().destroy();
        $('#products_table').empty();
    }

    const data = prepare_datatable_data();
    const columns = prepare_datatable_columns();
    let sort_order_dir = "asc";

    if (params != undefined && typeof params.sort_order_dir != "undefined") {
        sort_order_dir = params.sort_order_dir;
    }
    products_table = $('#products_table').DataTable({
        data: data,
        columns: columns,
        order: [
            [
                6, // Order by default by first supplier
                sort_order_dir
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
                    }
                }
            }
        }
    });

    $('.main').show();
    $('#main_content_footer').show();
    $('#do_inventory').show();

    // On inputs change
    $('#products_table').on('change', 'tbody td .product_qty_input', function () {
        let val = ($(this).val() == '') ? 0 : $(this).val();

        val = parseFloat(val);

        // If value is a number
        if (!isNaN(val)) {
            const id_split = $(this).attr('id')
                .split('_');
            const prod_id = id_split[1];
            const supplier_id = id_split[3];

            // Save value
            save_product_supplier_qty(prod_id, supplier_id, val);

            // Update row
            const product = products.find(p => p.id == prod_id);
            const new_row_data = prepare_datatable_data([product.id])[0];

            products_table.row($(this).closest('tr')).data(new_row_data)
                .draw();

            update_cdb_order();
        } else {
            $(this).val('');
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

        // Find existing price in another supplierinfo
        let default_price = null;
        let default_package_qty = 1; // Default package qty is 1

        for (let psi of product.suppliersinfo) {
            if ('price' in psi && psi.price !== null) {
                default_price = psi.price;
            }

            if ('package_qty' in psi && psi.package_qty !== null) {
                default_package_qty = psi.package_qty;
            }
        }

        // Set default value for price & package qty for new supplierinfo
        $(".new_product_supplier_package_pty").val(default_package_qty);
        $(".new_product_supplier_price").val(default_price); // Default price is existing price for other supplier, or none if no other
        new_product_supplier_association = {
            package_qty: default_package_qty,
            price: default_price
        };

        $('.new_product_supplier_price').on('input', function () {
            new_product_supplier_association.price = $(this).val();
        });
        $('.new_product_supplier_package_pty').on('input', function () {
            new_product_supplier_association.package_qty = $(this).val();
        });
    });
    // Select row(s) on checkbox change
    $(products_table.table().header()).on('click', 'th #select_all_products_cb', function () {
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
        const p_id = products_table.row($(this).closest('tr')).data().id;

        if (this.checked) {
            selected_rows.push(p_id);
        } else {
            const i = selected_rows.findIndex(id => id == p_id);

            selected_rows.splice(i, 1);
        }
    });

    // Set product is NPA (Ne Pas Acheter)
    $('#products_table').on('click', 'tbody td .product_npa_cb', function () {
        // Save / unsave selected row
        const p_id = products_table.row($(this).closest('tr')).data().id;
        const npa = this.checked;

        const product = products.find(p => p.id == p_id);

        let modal_product_npa = $('#templates #modal_product_npa');

        modal_product_npa.find(".product_name").text(product.name);
        modal_product_npa.find(".product_npa").text(npa ? 'Ne Pas Acheter' : 'Peut Être Acheté');

        openModal(
            modal_product_npa.html(),
            () => {
                set_product_npa(p_id, npa);
            },
            'Valider',
            false,
            true,
            () => {
                this.checked = !this.checked;
            }
        );
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
 * Update DOM display on main screen
 */
function update_main_screen(params) {
    // Remove listener before recreating them
    $('#products_table').off('change', 'tbody td .product_qty_input');
    $('#products_table').off('click', 'tbody .product_not_from_supplier');
    $('#products_table').off('click', 'thead th #select_all_products_cb');
    $('#products_table').off('click', 'tbody td .select_product_cb');
    $(".remove_supplier_icon").off();

    $(".order_name_container").text(order_doc._id);
    display_suppliers();
    display_products(params);

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

    if (order_doc.date_planned !== null) {
        // Switch format from yy-mm-dd hh:mm:ss to readable dd/mm/yy
        let date_to_format = order_doc.date_planned.split(' ')[0];
        let readable_date = date_to_format.split('-').reverse()
            .join('/');

        $("#date_planned_input").val(readable_date);
    } else {
        $("#date_planned_input").val('');
    }

    if (order_doc.coverage_days !== null) {
        $("#coverage_days_input").val(order_doc.coverage_days);
    } else {
        $("#coverage_days_input").val('');
    }
}

/**
 * Update DOM display on the order selection screen
 */
function update_order_selection_screen() {
    // Remove listener before recreating them
    $(".order_pill").off();

    let existing_orders_container = $("#existing_orders");
    existing_orders_container.empty();
    $('#new_order_name').val('');

    dbc.allDocs({
        include_docs: true
    }).then(function (result) {
        if (result.rows.length === 0) {
            existing_orders_container.append(`<i>Aucune commande en cours...</i>`);
        } else {
            for (let row of result.rows) {
                let template = $("#templates #order_pill_template");

                template.find(".pill_order_name").text(row.id);

                existing_orders_container.append(template.html());
            }

            $(".order_pill").on("click", order_pill_on_click);
        }
    })
        .catch(function (err) {
            alert('Erreur lors de la synchronisation des commandes. Vous pouvez créer une nouvelle commande.');
            console.log(err);
        });
}

/**
 * Switch between screens
 * @param {String} direction target screen : order_selection | main_screen | orders_created
 * @param {String} from source screen : order_selection | main_screen | orders_created
 */
function switch_screen(direction = 'main_screen', from = 'main_screen') {
    if (direction === 'orders_created') {
        $('#main_content').hide();
        $('#orders_created').show();
    } else {
        // Animated transition
        let oldBox = null;
        let newBox = null;
        let outerWidth = null;

        if (direction === 'main_screen') {
            oldBox = $("#select_order_content");
            newBox = $("#main_content");

            outerWidth = oldBox.outerWidth(true);
        } else {
            if (from === 'orders_created') {
                oldBox = $("#orders_created");
            } else {
                oldBox = $("#main_content");
            }

            newBox = $("#select_order_content");

            outerWidth = - oldBox.outerWidth(true);
        }

        // Display the new box and place it on the right of the screen
        newBox.css({ "left": outerWidth + "px", "right": -outerWidth + "px", "display": "" });
        // Make the old content slide to the left
        oldBox.animate({ "left": -outerWidth + "px", "right": outerWidth + "px" }, 800, function() {
            // Hide old content after animation
            oldBox.css({ "left": "", "right": "", "display": "none" });
        });
        // Slide new box to regular place
        newBox.animate({ "left": "", "right": "" }, 800);
    }
}


$(document).ready(function() {
    fingerprint = new Fingerprint({canvas: true}).get();
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    openModal();

    // Init CouchDB
    dbc = new PouchDB(couchdb_dbname);
    sync = PouchDB.sync(couchdb_dbname, couchdb_server, {
        live: true,
        retry: true,
        auto_compaction: false
    });

    sync.on('change', function (info) {
        if (info.direction === "pull") {
            for (const doc of info.change.docs) {
                if (order_doc._id === doc._id && (order_doc._rev !== doc._rev || doc._deleted === true)) {
                    // If current order was modified somewhere else
                    $.notify(
                        "Un autre navigateur est en train de modifier cette commande !",
                        {
                            globalPosition:"top right",
                            className: "error"
                        }
                    );
                    update_order_selection_screen();
                    back();
                    break;
                } else if (doc._deleted === true) {
                    update_order_selection_screen();
                }
            }
        }
    }).on('error', function (err) {
        if (err.status === 409) {
            alert("Une erreur de synchronisation s'est produite, la commande a sûrement été modifiée sur un autre navigateur. Vous allez être redirigé.e.");
            back();
        }
        console.log('erreur sync');
        console.log(err);
    });

    // Main screen
    $("#coverage_form").on("submit", function(e) {
        e.preventDefault();
        let val = $("#coverage_days_input").val();

        val = parseInt(val);

        if (!isNaN(val)) {
            order_doc.coverage_days = val;
            compute_products_coverage_qties();
            update_cdb_order();
            update_main_screen();
        } else {
            $("#coverage_days_input").val(order_doc.coverage_days);
            alert(`Valeur non valide pour le nombre de jours de couverture !`);
        }
    });

    $("#supplier_form").on("submit", function(e) {
        e.preventDefault();
        add_supplier();
    });

    $("#product_form").on("submit", function(e) {
        e.preventDefault();
        add_product();
    });

    $("#do_inventory").on("click", function() {
        generate_inventory();
    });

    $('#back_to_order_selection_from_main').on('click', function() {
        back();
    });

    $('#create_orders').on('click', function() {
        if (order_doc.date_planned === null) {
            alert("Veuillez rentrer une date de livraison prévue.");

            return -1;
        }

        let modal_create_order = $('#templates #modal_create_order');

        openModal(
            modal_create_order.html(),
            () => {
                create_orders();
            },
            'Valider',
            false
        );

        return 0;
    });

    $.datepicker.regional['fr'] = {
        monthNames: [
            'Janvier',
            'Fevrier',
            'Mars',
            'Avril',
            'Mai',
            'Juin',
            'Juillet',
            'Aout',
            'Septembre',
            'Octobre',
            'Novembre',
            'Decembre'
        ],
        dayNamesMin: [
            'Di',
            'Lu',
            'Ma',
            'Me',
            'Je',
            'Ve',
            'Sa'
        ],
        dateFormat: date_format
    };
    $.datepicker.setDefaults($.datepicker.regional['fr']);

    const tomorrow = new Date();

    tomorrow.setDate(tomorrow.getDate() + 1);

    $("#date_planned_input")
        .datepicker({
            defaultDate: "+1d",
            minDate: tomorrow
        })
        .on('change', function() {
            try {
                // When date input changes, try to read date
                $.datepicker.parseDate(date_format, $(this).val());

                // No exception raised: date is valid.
                // Change format from readable (dd/mm/yy) to ISO (yy-mm-dd)
                let formatted_date = $(this).val()
                    .split('/')
                    .reverse()
                    .join('-') + ' 00:00:00';

                // Update doc if changed
                if (formatted_date !== order_doc.date_planned) {
                    order_doc.date_planned = formatted_date;
                    update_cdb_order();
                }
            } catch (error) {
                alert('Date invalide');
                $(this).val('');
                order_doc.date_planned = null;
                update_cdb_order();
            }
        });

    // Order selection screen
    update_order_selection_screen();

    $("#new_order_form").on("submit", function(e) {
        e.preventDefault();
        create_cdb_order();
    });

    // Orders created screen
    $('#back_to_order_selection_from_orders_created').on('click', function() {
        switch_screen('order_selection', 'orders_created');
    });

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

    //Get products
    var accentMap = {
        "á": "a",
        "à": "a",
        "â": "a",
        "é": "e",
        "è": "e",
        "ê": "e",
        "ë": "e",
        "ç": "c",
        "ù": "u",
        "ü": "u",
        "ö": "o"
    };

    var normalize = function(term) {
        var ret = "";

        for (var i = 0; i < term.length; i++) {
            ret += accentMap[ term.charAt(i) ] || term.charAt(i);
        }

        return ret;
    };

    $.ajax({
        type: 'GET',
        url: "/products/simple_list",
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            products_list = data.list;

            // Set up autocomplete on product input
            $("#product_input").autocomplete({
                source: function(request, response) {
                    var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");

                    response($.grep(products_list.map(a => a.display_name), function(value) {
                        value = value.label || value.value || value;

                        return matcher.test(value) || matcher.test(normalize(value));
                    }));
                },
                position: {collision: "flip" }
            });

            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des articles", ctx: 'get_products'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la récupération des articles, rechargez la page plus tard');
        }
    });
});
