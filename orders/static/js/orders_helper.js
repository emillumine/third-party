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
    },
    qties_values = {},
    clicked_order_pill = null,
    userAgent = navigator.userAgent;

timerId = null,
info_editor = null;

var dbc = null,
    sync = null,
    fingerprint = null,
    order_doc = {
        _id: null,
        coverage_days: null,
        targeted_amount: null,
        stats_date_period: '',
        last_update: {
            timestamp: null,
            fingerprint: null
        },
        products: [],
        selected_suppliers: [],
        selected_rows: []
    },
    common_info_doc_name = "common_info",
    info_doc = {
        _id: null,
        content: ""
    };


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
        coverage_days: null,
        targeted_amount: null,
        stats_date_period: '',
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

/**
 * Compute the date from which to calculate stats of sells,
 *  depending on the selected parameter.
 *
 * @returns String value of the date, ISO format
 */
function _compute_stats_date_from() {
    let val = '';

    if (order_doc.stats_date_period !== '') {
        let date = new Date();

        switch (order_doc.stats_date_period) {
        case '1week':
            date.setDate(date.getDate() - 7);
            break;
        case '2weeks':
            date.setDate(date.getDate() - 14);
            break;
        default:
            break;
        }

        let day = ("0" + date.getDate()).slice(-2);
        let month = ("0" + (date.getMonth() +1)).slice(-2);
        let year = date.getFullYear();

        val = `${year}-${month}-${day}`;
    }

    return val;
}

function debounceFunction(func, delay = 1000) {
    clearTimeout(timerId);

    timerId = setTimeout(func, delay);
}

/**
 * When 403 response is received from the server, logout user locally.
 */
function handle_unauthorize() {
    alert("La session a expiré. Vous allez devoir vous reconnecter.");
    $("#logout").trigger("click");
}

/* - PRODUCTS */

var process_new_product_qty = function(input) {
    // Remove line coloring on input blur
    const row = $(input).closest('tr');

    row.removeClass('focused_line');

    let val = ($(input).val() == '') ? 0 : $(input).val();

    const id_split = $(input).attr('id')
        .split('_');
    const prod_id = id_split[1];
    const supplier_id = id_split[3];

    if (val == -1) {
        let modal_end_supplier_product_association = $('#templates #modal_end_supplier_product_association');

        const product = products.find(p => p.id == prod_id);

        modal_end_supplier_product_association.find(".product_name").text(product.name);
        const supplier = selected_suppliers.find(s => s.id == supplier_id);

        modal_end_supplier_product_association.find(".supplier_name").text(supplier.display_name);

        openModal(
            modal_end_supplier_product_association.html(),
            () => {
                if (is_time_to('validate_end_supplier_product_association')) {
                    end_supplier_product_association(product, supplier);
                }
            },
            'Valider',
            false,
            true,
            () => {
                // Reset value in input on cancel
                const psi = product.suppliersinfo.find(psi_item => psi_item.supplier_id == supplier_id);

                $(input).val(psi.qty);
            }
        );
    } else {
        val = parseFloat(val);

        // If value is a number
        if (!isNaN(val)) {
            // Save value
            save_product_supplier_qty(prod_id, supplier_id, val);

            // Update row
            const product = products.find(p => p.id == prod_id);
            const new_row_data = prepare_datatable_data([product.id])[0];

            products_table.row($(input).closest('tr')).data(new_row_data)
                .draw();

            debounceFunction(update_cdb_order);
            display_total_values();
        } else {
            $(input).val('');
        }
    }
};

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

    let data = {
        pids: [product.tpl_id],
        stats_from: _compute_stats_date_from()
    };

    $.ajax({
        type: 'POST',
        url: '/products/get_product_for_order_helper',
        data: JSON.stringify(data),
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
                debounceFunction(update_cdb_order);
            } else {
                alert("L'article n'a pas toutes les caractéristiques pour être ajouté.");
            }
            $("#product_input").val('');
        },
        error: function(data) {
            if (data.status === 403) {
                handle_unauthorize();
            } else {
                err = {msg: "erreur serveur lors de la récupération des données liées à l'article", ctx: 'get_product_for_help_order_line'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'orders');
                alert('Erreur lors de la récupération des informations, réessayer plus tard.');
            }
        }
    });

    return 0;
}
function compute_purchase_qty_for_coverage(product, coeff, stock, incoming_qty, daily_conso, days) {
    let purchase_qty_for_coverage = 0,
        purchase_package_qty_for_coverage = 0;

    if (stock == 0 && daily_conso == 0) {
        purchase_package_qty_for_coverage = 1;

    } else {
        purchase_qty_for_coverage = days * daily_conso - stock - incoming_qty + product.minimal_stock;
        purchase_qty_for_coverage = (purchase_qty_for_coverage < 0) ? 0 : purchase_qty_for_coverage;

        // Reduce to nb of packages to purchase
        purchase_package_qty_for_coverage = purchase_qty_for_coverage / product.suppliersinfo[0].package_qty;

        if (coeff != 1) {
            purchase_package_qty_for_coverage *= coeff;
        }
    }

    return Math.ceil(purchase_package_qty_for_coverage); // return Round up to unit for all products
}

function compute_and_affect_product_supplier_quantities(coeff, days) {
    for (const [
        key,
        product
    ] of Object.entries(products)) {
        if ('suppliersinfo' in product && product.suppliersinfo.length > 0) {
            // Durée couverture produit = (stock + qté entrante + qté commandée ) / conso quotidienne
            const stock = product.qty_available;
            const incoming_qty = product.incoming_qty;
            const daily_conso = product.daily_conso;

            let purchase_package_qty_for_coverage = compute_purchase_qty_for_coverage(product, coeff, stock, incoming_qty, daily_conso, days);

            // Set qty to purchase for supplier with higher priority
            let target_supplierinfo_index = 0;
            let min_sequence = Number.POSITIVE_INFINITY; // min sequence = higher priority

            for (let i in products[key].suppliersinfo) {
                let suppliersinfo_sequence = products[key].suppliersinfo[i].sequence;

                if (suppliersinfo_sequence < min_sequence) {
                    min_sequence = suppliersinfo_sequence;
                    target_supplierinfo_index = i;
                }
            }

            products[key].suppliersinfo[target_supplierinfo_index].qty = purchase_package_qty_for_coverage;
        }
    }
}

/**
 * Compute the qty to buy for each product, depending the coverage days.
 * Set the computed qty for the first supplier only.
 */
function compute_products_coverage_qties() {
    return new Promise((resolve) => {
        const pc_adjust = $('#percent_adjust_input').val();
        let coeff = 1;

        if (!isNaN(parseFloat(pc_adjust))) {
            coeff = (1 + parseFloat(pc_adjust) /100);
        }
        order_doc.coeff = coeff;
        if (order_doc.coverage_days != null) {
            compute_and_affect_product_supplier_quantities(coeff, order_doc.coverage_days);
        }

        if (order_doc.targeted_amount != null) {
            const small_step = 0.1,
                max_iter = 182; // Assume that no more than 1/2 year coverage is far enough
            let go_on = true,
                iter = 0,
                days = 1,
                step = 1;

            //Let's compute the nearst amount, by changing days quantity
            while (go_on == true && iter < max_iter) {
                order_total_value = 0;
                compute_and_affect_product_supplier_quantities(coeff, days);
                _compute_total_values_by_supplier();
                for (let supplier of selected_suppliers) {
                    order_total_value += supplier.total_value;
                }
                let order_total_value_f = parseFloat(order_total_value),
                    targeted_amount_f = parseFloat(order_doc.targeted_amount);

                if (order_total_value_f >= targeted_amount_f) {
                    if (order_total_value_f != targeted_amount_f && iter < max_iter) {
                        step = small_step; // we have gone too far, let's go back, using small step
                        days -= step;
                    }
                } else {
                    if (step == small_step) {
                        // amount was above the target, let's compute again with the previous value
                        go_on = false;
                        compute_and_affect_product_supplier_quantities(coeff, days + step);
                    } else {
                        days += step;
                    }
                }

                iter++;
            }

        }

        resolve();
    });
}

/**
 * Update order products data in case they have changed.
 */
function check_products_data() {
    return new Promise((resolve) => {
        const suppliers_id = selected_suppliers.map(s => s.id);

        if (suppliers_id.length > 0) {
            $.notify(
                "Vérification des informations produits...",
                {
                    globalPosition:"top left",
                    className: "info"
                }
            );

            if (clicked_order_pill != null) {
                clicked_order_pill.find('.pill_order_name').empty()
                    .append(`<i class="fas fa-spinner fa-spin"></i>`);
            }

            $.ajax({
                type: 'GET',
                url: '/orders/get_supplier_products',
                data: {
                    sids: suppliers_id,
                    stats_from: _compute_stats_date_from()
                },
                dataType:"json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                success: function(data) {
                    let loaded_products_ids = products.map(p => p.id);

                    // Going through products fetched from server
                    for (let product of data.res.products) {
                        const p_id = product.id;
                        const p_index = products.findIndex(p => p.id == p_id);

                        if (p_index === -1) {
                            // Add product if it wasn't fetched before (made available since last access to order)
                            products.push(product);
                        } else {
                            // Save old product suppliersinfo to keep user qty inputs
                            const old_suppliersinfo = [...products[p_index].suppliersinfo];

                            // Update product data
                            products[p_index] = product;

                            // Re-set qties
                            for (let psi_index in products[p_index].suppliersinfo) {
                                const old_psi = old_suppliersinfo.find(psi => psi.supplier_id == products[p_index].suppliersinfo[psi_index].supplier_id);

                                if (old_psi !== undefined && old_psi.qty !== undefined) {
                                    products[p_index].suppliersinfo[psi_index].qty = old_psi.qty;
                                }
                            }
                        }

                        // Remove fetched product id from loaded products list
                        const loaded_p_index = loaded_products_ids.indexOf(p_id);

                        if (loaded_p_index > -1) {
                            loaded_products_ids.splice(loaded_p_index, 1);
                        }
                    }

                    $('.notifyjs-wrapper').trigger('notify-hide');

                    /**
                     * If loaded p_ids are remaining:
                     *  these products were loaded but don't match the conditions to be fetched anymore.
                     * Remove them.
                     */
                    if (loaded_products_ids.length > 0) {
                        for (pid of loaded_products_ids) {
                            const p_index = products.findIndex(p => p.id == pid);
                            const p_name = products[p_index].name;

                            products.splice(p_index, 1);

                            $.notify(
                                `Produit "${p_name}" retiré de la commande.\nIl a probablement été passé en archivé ou en NPA sur un autre poste.`,
                                {
                                    globalPosition:"top left",
                                    className: "info",
                                    autoHideDelay: 12000,
                                    clickToHide: false
                                }
                            );
                        }
                    }

                    resolve();
                },
                error: function(data) {
                    if (data.status === 403) {
                        handle_unauthorize();
                    } else {
                        err = {msg: "erreur serveur lors de la vérification des données des articles", ctx: 'check_products_data'};
                        if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                            err.msg += ' : ' + data.responseJSON.error;
                        }
                        report_JS_error(err, 'orders');
                        alert(`Erreur lors de la vérification des données des articles. Certaines données peuvent être erronées`);

                        $('.notifyjs-wrapper').trigger('notify-hide');
                        // Don't block process if this call fails
                        resolve();
                    }
                }
            });
        } else {
            resolve();
        }
    });
}

/**
 * Update the product internal reference ('default_code')
 *
 * @param {HTMLElement} input_el
 * @param {int} p_id
 * @param {int} p_index
 */
function update_product_ref(input_el, p_id, p_index) {
    const val = $(input_el).val();
    const existing_val = products[p_index].default_code.replace("[input]", "");

    products[p_index].default_code = val;

    const row = $(input_el).closest('tr');
    const new_row_data = prepare_datatable_data([p_id])[0];

    products_table.row(row).data(new_row_data)
        .draw();

    $('#products_table')
        .off('blur', 'tbody .product_ref_input')
        .off('keypress', 'tbody .product_ref_input');

    // Update in backend if value changed
    if (existing_val !== val) {
        const data = {
            'product_tmpl_id': p_id,
            'default_code': val
        };

        // Send request to create association
        $.ajax({
            type: "POST",
            url: "/products/update_product_internal_ref",
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(data),
            success: () => {
                debounceFunction(update_cdb_order);

                $(".actions_buttons_area .right_action_buttons").notify(
                    "Référence sauvegardée !",
                    {
                        elementPosition:"bottom right",
                        className: "success",
                        arrowShow: false
                    }
                );
            },
            error: function(data) {
                if (data.status === 403) {
                    handle_unauthorize();
                } else {
                    let msg = "erreur serveur lors de la sauvegarde de la référence";

                    msg += ` (product_tmpl_id: ${product.id}`;

                    err = {msg: msg, ctx: 'update_product_ref'};
                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                        err.msg += ' : ' + data.responseJSON.error;
                    }
                    report_JS_error(err, 'orders');

                    alert('Erreur lors de la sauvegarde de la référence dans Odoo. Veuillez recharger la page et ré-essayer plus tard.');
                }
            }
        });
    }
}


/* - SUPPLIERS */

/**
 * Add a supplier to the selected suppliers list.
 *
 * @returns -1 if validation failed, 0 otherwise
 */
function add_supplier() {
    const user_input = $("#supplier_input").val();

    let supplier = suppliers_list.find(s => s.display_name === user_input);

    // Check if user input is a valid supplier
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

    // Fetch supplier products
    $.ajax({
        type: 'GET',
        url: "/orders/get_supplier_products",
        data: {
            sids: [supplier.id],
            stats_from: _compute_stats_date_from()
        },
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            supplier.total_value = 0;
            supplier.total_packages = 0;
            selected_suppliers.push(supplier);

            save_supplier_products(supplier, data.res.products);
            update_main_screen();
            $("#supplier_input").val("");
            debounceFunction(update_cdb_order);
            closeModal();
        },
        error: function(data) {
            if (data.status === 403) {
                handle_unauthorize();
            } else {
                err = {msg: "erreur serveur lors de la récupération des produits", ctx: 'get_supplier_products'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'orders');

                closeModal();
                alert('Erreur lors de la récupération des produits, réessayer plus tard.');
            }
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
    debounceFunction(update_cdb_order);
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
        success: (res_data) => {
            // Save supplierinfo in product
            if (!('suppliersinfo' in product)) {
                product.suppliersinfo = [];
            }

            product.suppliersinfo.push({
                id: res_data.res.psi_id,
                supplier_id: supplier.id,
                package_qty: package_qty,
                product_code: false,
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

            debounceFunction(update_cdb_order);
            closeModal();
        },
        error: function(data) {
            if (data.status === 403) {
                handle_unauthorize();
            } else {
                let msg = "erreur serveur lors de la sauvegarde de l'association product/supplier";

                msg += ` (product_tmpl_id: ${product.id}; supplier_id: ${supplier.id})`;

                err = {msg: msg, ctx: 'save_supplier_product_association'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'orders');

                closeModal();
                alert('Erreur lors de la sauvegarde de l\'association. Veuillez ré-essayer plus tard.');
            }
        }
    });

    return 0;
}

/**
 * Send to server the deletion of association product-supplier
 *
 * @param {object} product
 * @param {object} supplier
 */
function end_supplier_product_association(product, supplier) {
    openModal();

    const data = {
        product_tmpl_id: product.id,
        supplier_id: supplier.id
    };

    // Send request to create association
    $.ajax({
        type: "POST",
        url: "/orders/end_supplier_product_association",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        success: () => {
            // Remove relation locally
            let p_index = products.findIndex(p => p.id == product.id);
            let psi_index = product.suppliersinfo.findIndex(psi => psi.supplier_id == supplier.id);

            products[p_index].suppliersinfo.splice(psi_index, 1);

            // Update table
            display_products();

            debounceFunction(update_cdb_order);
            closeModal();
        },
        error: function(data) {
            if (data.status === 403) {
                handle_unauthorize();
            } else {
                let msg = "erreur serveur lors de la suppression de l'association product/supplier".
                    msg += ` (product_tmpl_id: ${product.id}; supplier_id: ${supplier.id})`;

                err = {msg: msg, ctx: 'end_supplier_product_association'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'orders');

                closeModal();
                alert('Erreur lors de la suppression de l\'association. Veuillez ré-essayer plus tard.');
            }
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
            // Prevent adding duplicate supplierinfo
            let index_existing_supplierinfo = products[index].suppliersinfo.findIndex(psi => psi.supplier_id == supplier.id);

            if (index_existing_supplierinfo === -1) {
                // Find the right supplierinfo in new product
                let np_supplierinfo = np.suppliersinfo.find(psi => psi.supplier_id == supplier.id);

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

/**
 * Calculate the total value purchased for all supplier
 */
function _compute_total_values_by_supplier() {
    // Reinit
    for (let s of selected_suppliers) {
        s.total_value = 0;
        s.total_packages = 0;
    }

    for (let p of products) {
        for (let supinfo of p.suppliersinfo) {
            let supplier_index = selected_suppliers.findIndex(s => s.id == supinfo.supplier_id);

            // Value
            let product_supplier_value = ('qty' in supinfo) ? supinfo.qty * supinfo.package_qty * supinfo.price : 0;

            selected_suppliers[supplier_index].total_value += product_supplier_value;

            // Packages
            selected_suppliers[supplier_index].total_packages += ('qty' in supinfo) ? supinfo.qty : 0;
        }
    }
}

/* - PRODUCT */

function commit_actions_on_product(product, inputs) {
    let actions = {
        npa: [],
        to_archive: false,
        minimal_stock: 0,
        qty_available: 0,
        id: product.id,
        name: product.name,
        suppliersinfo: []
    };

    inputs.each(function (i, e) {
        const input = $(e);

        if (input.attr('name') == 'npa-actions') {
            if (input.prop('checked') == true) {
                actions.npa.push(input.val());
            }
        } else if (input.attr('name') == "minimal_stock") {
            actions.minimal_stock = input.val();
        } else if (input.attr('name') == "archive-action") {
            if (input.prop('checked') == true && product.incoming_qty === 0) {
                actions.to_archive = true;
            }
        } else if (input.attr('name') == "actual_stock") {
            actions.qty_available = parseFloat(input.val());
        } else if (input.attr('class') !== undefined && input.attr('class').includes("product_supplier_price")) {
            actions.suppliersinfo.push({
                supplierinfo_id: parseInt(input.attr('supplierinfo_id')),
                price: parseFloat(input.val())
            });
        }
    });

    openModal();
    $.ajax({
        type: "POST",
        url: "/products/commit_actions_on_product",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(actions),
        success: () => {
            const index = products.findIndex(p => p.id == product.id);

            products[index].minimal_stock = actions.minimal_stock;

            if (actions.npa.length > 0 || actions.to_archive === true) {
                // Remove NPA & archived products
                products.splice(index, 1);
                debounceFunction(update_cdb_order);
            }

            check_products_data()
                .then(() => {
                    update_cdb_order();
                    update_main_screen();
                    closeModal();

                    // Give time for modal to fade
                    setTimeout(function() {
                        $(".actions_buttons_area .right_action_buttons").notify(
                            "Actions enregistrées !",
                            {
                                elementPosition:"bottom right",
                                className: "success",
                                arrowShow: false
                            }
                        );
                    }, 500);
                });
        },
        error: function(data) {
            if (data.status === 403) {
                handle_unauthorize();
            } else {
                let msg = "erreur serveur lors de la sauvegarde".
                    msg += ` (product_tmpl_id: ${product.id})`;

                err = {msg: msg, ctx: 'commit_actions_on_product'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'orders');

                try {
                    if (data.responseJSON.code === "archiving_with_incoming_qty") {
                        alert("Ce produit a des quantités entrantes, vous ne pouvez pas l'archiver.");
                    } else if (data.responseJSON.code === "error_stock_update") {
                        alert('Erreur lors de la mise à zéro du stock du produit archivé. Les actions ont bien été réalisées.');
                    } else {
                        alert('Erreur lors de la sauvegarde des données. Veuillez ré-essayer plus tard.');
                    }
                } catch (error) {
                    alert('Erreur lors de la sauvegarde des données. Veuillez ré-essayer plus tard.');
                }

                check_products_data()
                    .then(() => {
                        update_cdb_order();
                        update_main_screen();
                        closeModal();
                    });
            }
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
                    if (is_time_to('validate_generate_inventory')) {
                        $('#toggle_action_buttons .button_content').empty()
                            .append(`<i class="fas fa-spinner fa-spin"></i>`);
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
                                    $('#toggle_action_buttons .button_content').empty()
                                        .append(`Actions`);
                                    $('#toggle_action_buttons').notify(
                                        "Inventaire créé !",
                                        {
                                            elementPosition:"bottom center",
                                            className: "success"
                                        }
                                    );
                                }, 200);
                            },
                            error: function(data) {
                                if (data.status === 403) {
                                    handle_unauthorize();
                                } else {
                                    $('#do_inventory').empty()
                                        .append(`Faire un inventaire`);
                                    let msg = "erreur serveur lors de la création de l'inventaire",
                                        err = {msg: msg, ctx: 'generate_inventory'};

                                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                                        err.msg += ' : ' + data.responseJSON.error;
                                    }
                                    report_JS_error(err, 'orders');

                                    alert("Erreur lors de la création de l'inventaire. Réessayez plus tard.");
                                }
                            }
                        });
                    }
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
    if (is_time_to('order_pill_on_click', 1000)) {
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
                        if (is_time_to('validate_access_order')) {
                            goto_main_screen(doc);
                        }
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
 *
 * @returns Promise resolved after update is complete
 */
function update_cdb_order() {
    order_doc.products = products;
    order_doc.selected_suppliers = selected_suppliers;

    // Save that current user last updated the order
    order_doc.last_update = {
        timestamp: Date.now(),
        fingerprint: fingerprint
    };

    return new Promise((resolve) => {
        dbc.put(order_doc, function callback(err, result) {
            if (!err && result !== undefined) {
                order_doc._rev = result.rev;

                resolve();
            } else {
                alert("Erreur lors de la sauvegarde de la commande... Si l'erreur persiste contactez un administrateur svp.");
                console.log(err);

                resolve();
            }
        });
    });
}

/**
 * Delete an order in couchdb.
 *
 * @returns Promise resolved after delete is complete
 */
function delete_cdb_order() {
    order_doc._deleted = true;

    return new Promise((resolve, reject) => {
        dbc.put(order_doc, function callback(err, result) {
            if (!err && result !== undefined) {
                resolve();
            } else {
                alert("Erreur lors de la suppression de la commande... Si l'erreur persiste contactez un administrateur svp.");
                console.log(err);

                reject(new Error("Error while deleting order"));
            }
        });
    });
}

/**
 * Create the Product Orders in Odoo
 */
function create_orders() {
    let orders_data = {
        "suppliers_data": {}
    };

    // Get planned delivery date for each supplier before hiding the modal
    for (let supplier of selected_suppliers) {
        // Get planned date from modal
        let supplier_date_planned = $(`#date_planned_supplier_${supplier.id}`).val();
        let formatted_date = null;

        if (supplier_date_planned !== '') {
            if (date_format === "dd/mm/yy") {
                // Change format [dd/mm/yy] to ISO [yy-mm-dd]
                formatted_date = supplier_date_planned
                    .split('/')
                    .reverse()
                    .join('-') + ' 00:00:00';
            } else {
                formatted_date = supplier_date_planned + ' 00:00:00';
            }
        } else {
            // Default date : tomorrow
            let date_object = new Date();

            date_object.setDate(date_object.getDate() + 1);

            // Get ISO format bare string
            formatted_date = date_object.toISOString().replace('T', ' ')
                .split('.')[0];
        }

        // Create an entry for this supplier
        orders_data.suppliers_data[supplier.id] = {
            date_planned: formatted_date,
            lines: []
        };
    }

    openModal();

    // Prepare data: get products where a qty is set
    for (let p of products) {
        for (let p_supplierinfo of p.suppliersinfo) {
            // If a qty is set for a supplier for a product
            if ('qty' in p_supplierinfo && p_supplierinfo.qty != 0) {
                const supplier_id = p_supplierinfo.supplier_id;
                const product_code = p_supplierinfo.product_code;

                orders_data.suppliers_data[supplier_id].lines.push({
                    'package_qty': p_supplierinfo.package_qty,
                    'product_id': p.id,
                    'name': p.name,
                    'product_qty_package': p_supplierinfo.qty,
                    'product_qty': p_supplierinfo.qty * p_supplierinfo.package_qty,
                    'product_uom': p.uom_id[0],
                    'price_unit': p_supplierinfo.price,
                    'supplier_taxes_id': p.supplier_taxes_id,
                    'product_variant_ids': p.product_variant_ids,
                    'product_code': product_code
                });
            }
        }
    }

    $.ajax({
        type: "POST",
        url: "/orders/create_orders",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(orders_data),
        success: (result) => {
            $('#created_orders_area').empty();

            // Display new orders
            for (let new_order of result.res.created) {
                const supplier_name = suppliers_list.find(s => s.id == new_order.supplier_id).display_name;

                const date_planned = new_order.date_planned
                    .split(' ')[0]
                    .split('-')
                    .reverse()
                    .join('/');

                product_orders.push({
                    'id': new_order.id_po,
                    'supplier_id': new_order.supplier_id,
                    'supplier_name': supplier_name
                });

                let new_order_template = $("#templates #new_order_item_template");

                new_order_template.find(".new_order_supplier_name").text(supplier_name);
                new_order_template.find(".new_order_po").text(`PO${new_order.id_po}`);
                new_order_template.find(".new_order_date_planned").text(`Date de livraison prévue: ${date_planned}`);
                new_order_template.find(".download_order_file_button").attr('id', `download_attachment_${new_order.id_po}`);

                $('#created_orders_area').append(new_order_template.html());
            }

            // Prepare buttons to download order attachment
            get_order_attachments();

            // Clear data
            delete_cdb_order().finally(() => {
                // Continue with workflow anyway
                update_order_selection_screen().then(() => {
                    reset_data();
                    switch_screen('orders_created');
                    closeModal();
                });
            });
        },
        error: function(data) {
            if (data.status === 403) {
                handle_unauthorize();
            } else {
                let msg = "erreur serveur lors de la création des product orders";

                err = {msg: msg, ctx: 'save_supplier_product_association', data: orders_data};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'orders');

                closeModal();
                alert('Erreur lors de la création des commandes. Veuillez ré-essayer plus tard.');
            }
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
            debounceFunction(update_cdb_order);
            update_main_screen();
            switch_screen();
        });
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

    for (let supplier of selected_suppliers) {
        let template = $("#templates #supplier_pill_template");

        template.find(".pill_supplier_name").text(supplier.display_name);
        template.find(".supplier_pill").attr('id', `pill_supplier_${supplier.id}`);
        template.find(".remove_supplier_icon").attr('id', `remove_supplier_${supplier.id}`);

        supplier_container.append(template.html());
    }

    $(".remove_supplier_icon").on("click", function() {
        const el_id = $(this).attr('id')
            .split('_');
        const supplier_id = el_id[el_id.length-1];
        const clicked_supplier = selected_suppliers.find(s => s.id == supplier_id);

        let modal_remove_supplier = $('#templates #modal_remove_supplier');

        modal_remove_supplier.find(".supplier_name").text(clicked_supplier.display_name);

        openModal(
            modal_remove_supplier.html(),
            () => {
                if (is_time_to('validate_remove_supplier')) {
                    remove_supplier(supplier_id);
                }
            },
            'Valider'
        );
    });
}

/**
 * Compute data to display in products table
 *
 * Package qties & prices are related to suppliers,
 *  so 1 product can have multiple values for these.
 * In case of different values, display value under input in supplier column
 *
 * @param {Object} product
 * @returns Object of computed data to add to product object
 */
function _compute_product_data(product) {
    let item = {};

    /* Supplier related data */
    let purchase_qty = 0; // Calculate product's total purchase qty
    let p_package_qties = []; // Look for differences in package qties
    let p_price = [];

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
        p_price.push(p_supplierinfo.price);
    }

    item.purchase_qty = purchase_qty;

    // If product not related to supplier, set qty for this supplier to false (false -> don't display any input)
    for (supplier of selected_suppliers) {
        if (!is_product_related_to_supplier(product, supplier)) {
            item[supplier_column_name(supplier)] = false;
        }
    }

    if (p_package_qties.length == 0 || !p_package_qties.every((val, i, arr) => val === arr[0])) {
        // Don't display package qty if no supplierinfo or if not all package qties are equals
        item.package_qty = 'X';
    } else {
        // If all package qties are equals, display it
        item.package_qty = p_package_qties[0];
    }

    if (p_price.length == 0 || !p_price.every((val, i, arr) => val === arr[0])) {
        item.price = 'X';
    } else {
        item.price = p_price[0];
    }

    /* Coverage related data */
    const coverage_days = (order_doc.coverage_days !== null) ? order_doc.coverage_days : 0;
    let qty_not_covered = 0;
    let days_covered = 0;

    if (product.daily_conso !== 0) {
        qty_not_covered = product.daily_conso * coverage_days - product.qty_available - product.incoming_qty - purchase_qty;
        qty_not_covered = -Math.ceil(qty_not_covered); // round up: display values that are not fully covered
        qty_not_covered = (qty_not_covered > 0) ? 0 : qty_not_covered; // only display qty not covered (neg value)

        days_covered = (product.qty_available + product.incoming_qty + purchase_qty) / product.daily_conso;
        days_covered = Math.floor(days_covered);
    }

    item.qty_not_covered = qty_not_covered;
    item.days_covered = days_covered;

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
            stats: `Ecart type: ${product.sigma} / Jours sans vente: ${Math.round((product.vpc) * 100)}%`
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
                        <!--<span class="select_all_text">Sélectionner</span>-->
                        <label for="select_all_products_cb">Tout</label>
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
            title: "Ref",
            width: "5%",
            render: function (data, type, full) {
                if (data === false) {
                    return "";
                } else if (data.includes("[input]")) {
                    let val = data.replace("[input]", "");


                    return `<div class="custom_cell_content">
                                <input type="text" class="product_ref_input" id="${full.id}_ref_input" value="${val}">
                            </div>`;
                } else {
                    return data;
                }
            }
        },
        {
            data: "name",
            title: "Produit"
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
                    return `<div id="${base_id}_cell_content" class="custom_cell_content">X</div>`;
                } else {
                    let content = `<div id="${base_id}_cell_content" class="custom_cell_content">
                                        <input type="number" class="product_qty_input" id="${base_id}_qty_input" min="-1" value=${data}>`;

                    // Add package qty & price data if they differ between suppliers
                    if (full.package_qty === 'X') {
                        let product_data = products.find(p => p.id == full.id);

                        if (product_data !== undefined) {
                            let supplierinfo = product_data.suppliersinfo.find(psi => psi.supplier_id == supplier.id);

                            content += `<span class="supplier_package_qty">Colisage : ${supplierinfo.package_qty}</span>`;
                        }
                    }

                    if (full.price === 'X') {
                        let product_data = products.find(p => p.id == full.id);

                        if (product_data !== undefined) {
                            let supplierinfo = product_data.suppliersinfo.find(psi => psi.supplier_id == supplier.id);

                            content += `<span class="supplier_price">Prix HT : ${supplierinfo.price} €</span>`;
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
        data: "price",
        title: "Prix HT",
        className: "dt-body-center",
        render: function (data) {
            return (data === 'X') ? data : `${data} €`;
        },
        width: "4%"
    });

    columns.push({
        data: "purchase_qty",
        title: "Qté Achat",
        className: "dt-body-center",
        width: "4%"
    });

    // Not used for now
    // columns.push({
    //     data: "qty_not_covered",
    //     title: "Besoin non couvert (qté)",
    //     className: "dt-body-center",
    //     width: "4%"
    // });

    columns.push({
        data: "days_covered",
        title: "Jours de couverture",
        className: "dt-body-center",
        width: "4%"
    });

    columns.push({
        title: ``,
        className: "dt-body-center",
        orderable: false,
        render: function () {
            return `<button type="button" class="btn--primary product_actions">Actions</button>`;
        },
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

    // If datatable already exists, empty & clear events
    if (products_table) {
        $(products_table.table().header()).off();
        $('#products_table').off();

        products_table.clear().destroy();
        $('#products_table').empty();
    }

    const data = prepare_datatable_data();
    const columns = prepare_datatable_columns();
    let sort_order_dir = "desc";

    if (params != undefined && typeof params.sort_order_dir != "undefined") {
        sort_order_dir = params.sort_order_dir;
    }
    products_table = $('#products_table').DataTable({
        data: data,
        columns: columns,
        order: [
            [
                5, // Order by default by first supplier
                sort_order_dir
            ]
        ],
        stateSave: true,
        orderClasses: false,
        aLengthMenu: [
            [
                25,
                50,
                100,
                200,
                -1
            ],
            [
                25,
                50,
                100,
                200,
                "Tout"
            ]
        ],
        iDisplayLength: -1,
        scrollX: true,
        language: {url : '/static/js/datatables/french.json'},
        createdRow: function(row) {
            for (var i = 0; i < row.cells.length; i++) {
                const cell_node = row.cells[i];
                const cell = $(cell_node);

                if (cell.hasClass("supplier_input_cell") && cell.text() === "X") {
                    cell.addClass('product_not_from_supplier');
                } else if (i === 1) {
                    // Column at index 1 is product reference
                    cell.addClass('product_ref_cell');
                }
            }
        }
    });
    products_table.search('');
    $('.main').show();
    $('#main_content_footer').show();
    $('#do_inventory').show();

    // Color line on input focus
    $('#products_table').on('focus', 'tbody td .product_qty_input', function () {
        const row = $(this).closest('tr');

        row.addClass('focused_line');
    });


    // Manage data on inputs blur
    $('#products_table')
        .on('focus', 'tbody td .product_qty_input', function () {
            this.select();
        })
        .on('blur', 'tbody td .product_qty_input', function () {
            process_new_product_qty(this);
        })
        .on('keypress', 'tbody td .product_qty_input', function(e) {
        // Validate on Enter pressed
            if (e.which == 13) {
                $(this).blur();
            }
        })
        .on('keydown', 'tbody td .product_qty_input', function(e) {
            if (e.which == 38) {
                e.preventDefault();

                // On arrow up pressed, focus next row input
                let next_input = $(this).closest("tr")
                    .prev()
                    .find(".product_qty_input");

                next_input.focus();

                // Scroll to a position where the target input is not hidden by the sticky suppliers container
                const suppliers_container_top_offset =
                $("#suppliers_container").offset().top
                - $(window).scrollTop()
                + $("#suppliers_container").outerHeight();
                const next_input_top_offset = next_input.offset().top - $(window).scrollTop();

                if (next_input_top_offset < suppliers_container_top_offset) {
                    window.scrollTo({
                        top: $(window).scrollTop() - $("#suppliers_container").outerHeight()
                    });
                }
            } else if (e.which == 40) {
                e.preventDefault();

                // On arrow down pressed, focus previous row input
                $(this).closest("tr")
                    .next()
                    .find(".product_qty_input")
                    .focus();

            } else if (e.which == 13) {
                e.preventDefault();

                // On enter pressed, focus previous row input
                $(this).closest("tr")
                    .next()
                    .find(".product_qty_input")
                    .focus();
            }
        })
        .on('click', 'tbody td .product_actions', function() {
        // Save / unsave selected row
            const p_id = products_table.row($(this).closest('tr')).data().id;
            const product = products.find(p => p.id == p_id);

            let modal_product_actions = $('#templates #modal_product_actions');

            modal_product_actions.find(".product_name").text(product.name);
            modal_product_actions.find(".actual_stock_input").val(product.qty_available);

            const product_can_be_archived = product.incoming_qty === 0;

            if (product_can_be_archived == true) {
                modal_product_actions.find('input[name="archive-action"]').prop("disabled", false);
                modal_product_actions.find('input[name="archive-action"]').closest("label")
                    .removeClass("checkbox_action_disabled");
            } else {
                modal_product_actions.find('input[name="archive-action"]').prop("disabled", true);
                modal_product_actions.find('input[name="archive-action"]').closest("label")
                    .addClass("checkbox_action_disabled");
            }

            let product_price_action_template = $('#templates #product_price_action_template');

            modal_product_actions.find(".product_prices_area").empty();
            for (let supplierinfo of product.suppliersinfo) {
                let supplier = suppliers_list.find(s => s.id == supplierinfo.supplier_id);

                product_price_action_template.find(".supplier_name").text(supplier.display_name);
                product_price_action_template.find(".product_supplier_price").attr('supplierinfo_id', supplierinfo.id);

                modal_product_actions.find(".product_prices_area").append(product_price_action_template.html());
            }

            openModal(
                modal_product_actions.html(),
                () => {
                    if (is_time_to('validate_product_actions')) {
                        commit_actions_on_product(product, modal.find('input'));
                    }
                },
                'Valider',
                false
            );

            // Set inputs val after modal is displayed
            modal.find('input[name="minimal_stock"]').val(product.minimal_stock);
            modal.find('input[name="actual_stock"]').val(product.qty_available);
            for (let supplierinfo of product.suppliersinfo) {
                modal.find(`input[supplierinfo_id="${supplierinfo.id}"]`).val(supplierinfo.price);
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
                if (is_time_to('validate_save_supplier_product_association')) {
                    save_supplier_product_association(product, supplier, this);
                }
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

    // Display input on click on product ref cell
    $('#products_table').on('click', 'tbody .product_ref_cell', function () {
        if ($(this).find('input').length === 0) {
            const row = $(this).closest('tr');
            const p_id = products_table.row(row).data().id;
            const p_index = products.findIndex(p => p.id === p_id);

            const existing_ref = products[p_index].default_code === false ? '' : products[p_index].default_code;

            products[p_index].default_code = "[input]" + existing_ref;

            const new_row_data = prepare_datatable_data([p_id])[0];

            products_table.row(row).data(new_row_data)
                .draw();

            let ref_input = $(`#${p_id}_ref_input`);

            ref_input.focus();
            ref_input.select();

            $('#products_table')
                .on('blur', 'tbody .product_ref_input', function () {
                    update_product_ref(this, p_id, p_index);
                })
                .on('keypress', 'tbody .product_ref_input', function(e) {
                // Validate on Enter pressed
                    if (e.which == 13) {
                        update_product_ref(this, p_id, p_index);
                    }
                });
        }
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



    return 0;
}

/**
 * Unselect all rows from datatable.
 */
function unselect_all_rows() {
    $("#select_all_products_cb").prop("checked", false);

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
 * Display the total values for each supplier & the global total value
 */
function display_total_values() {
    _compute_total_values_by_supplier();

    let order_total_value = 0;

    for (let supplier of selected_suppliers) {
        $(`#pill_supplier_${supplier.id}`).find('.supplier_total_value')
            .text(parseFloat(supplier.total_value).toFixed(2));
        order_total_value += supplier.total_value;

        $(`#pill_supplier_${supplier.id}`).find('.supplier_total_packages')
            .text(+parseFloat(supplier.total_packages).toFixed(2));
    }

    order_total_value = parseFloat(order_total_value).toFixed(2);
    $('#order_total_value').text(order_total_value);
}

/**
 * Update DOM display on main screen
 */
function update_main_screen(params) {
    // Remove listener before recreating them
    $('#products_table').off('focus', 'tbody td .product_qty_input');
    $('#products_table').off('blur', 'tbody td .product_qty_input');
    $('#products_table').off('change', 'tbody td .product_qty_input');
    $('#products_table').off('click', 'tbody .product_not_from_supplier');
    $('#products_table').off('click', 'tbody .product_ref_cell');
    $('#products_table').off('click', 'thead th #select_all_products_cb');
    $('#products_table').off('click', 'tbody td .select_product_cb');
    $(".remove_supplier_icon").off();

    $(".order_name_container").text(order_doc._id);
    display_suppliers();
    display_products(params);
    display_total_values();

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
    $("#select_all_products_cb").prop("checked", false);

    if (order_doc.coverage_days !== null) {
        $("#coverage_days_input").val(order_doc.coverage_days);
    } else {
        $("#coverage_days_input").val('');
    }
    if (order_doc.targeted_amount !== null) {
        $('#targeted_amount_input').val(order_doc.targeted_amount);
    } else {
        $('#targeted_amount_input').val('');
    }
    if (order_doc.coeff && order_doc.coeff != 1) {
        $("#percent_adjust_input").val(-Math.ceil((1 - order_doc.coeff) * 100));
    }

    if (order_doc.stats_date_period !== undefined && order_doc.stats_date_period !== null) {
        $("#stats_date_period_select").val(order_doc.stats_date_period);
    } else {
        $("#stats_date_period_select").val('');
    }
}

function display_average_consumption_explanation() {
    openModal($('#explanations').html());
}
/**
 * Update DOM display on the order selection screen
 */
function update_order_selection_screen() {
    return new Promise((resolve) => {
        dbc.allDocs({
            include_docs: true
        })
            .then(function (result) {
            // Remove listener before recreating them
                $(".order_pill").off();

                // Reset orders data
                let existing_orders_container = $("#existing_orders");

                existing_orders_container.empty();
                $('#new_order_name').val('');

                if (
                    result.rows.length === 0
                    || result.rows.length === 0 && result.rows[0].id === common_info_doc_name) {
                    existing_orders_container.append(`<i>Aucune commande en cours...</i>`);
                } else {
                    for (let row of result.rows) {
                        if (row.id !== common_info_doc_name) {
                            let template = $("#templates #order_pill_template");

                            template.find(".pill_order_name").text(row.id);

                            existing_orders_container.append(template.html());
                        }
                    }

                    $(".order_pill").on("click", order_pill_on_click);
                    $(".remove_order_icon").on("click", function(e) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        order_name_container = $(this).prev()[0];
                        let order_id = $(order_name_container).text();

                        let modal_remove_order = $('#templates #modal_remove_order');

                        modal_remove_order.find(".remove_order_name").text(order_id);

                        openModal(
                            modal_remove_order.html(),
                            () => {
                                if (is_time_to('validate_remove_order')) {
                                    dbc.get(order_id).then((doc) => {
                                        order_doc = doc;
                                        delete_cdb_order().then(() => {
                                            update_order_selection_screen().then(() => {
                                                reset_data();
                                                setTimeout(function() {
                                                    $.notify(
                                                        "Commande supprimée !",
                                                        {
                                                            globalPosition:"top left",
                                                            className: "success"
                                                        }
                                                    );
                                                }, 500);
                                            });
                                        })
                                            .catch(() => {
                                                console.log("error deleting order");
                                            });
                                    });
                                }
                            },
                            'Valider'
                        );
                    });
                }

                resolve();
            })
            .catch(function (err) {
                alert('Erreur lors de la synchronisation des commandes. Vous pouvez créer une nouvelle commande.');
                console.log(err);
            });
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


/**
 * Init the PouchDB local database & sync
 */
function init_pouchdb_sync() {
    dbc = new PouchDB(couchdb_dbname);
    sync = PouchDB.sync(couchdb_dbname, couchdb_server, {
        live: true,
        retry: true,
        auto_compaction: true,
        revs_limit: 1
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
                    back();
                    break;
                } else if (doc._id === common_info_doc_name) {
                    init_info_editor();
                    $.notify(
                        "Nouveau message dans le bloc d'information !",
                        {
                            globalPosition:"top right",
                            className: "info"
                        }
                    );
                }
            }

            update_order_selection_screen();
        }
    }).on('error', function (err) {
        if (err.status === 409) {
            alert("Une erreur de synchronisation s'est produite, la commande a sûrement été modifiée sur un autre navigateur. Vous allez être redirigé.e.");
            back();
        }
        console.log('erreur sync');
        console.log(err);
    });
}

/* - INFO AREA */

/**
 * Init the Quill module (Text editor)
 * @param {Object} params
 */
function quillify(params) {
    info_editor = new Quill(params.id, {
        modules: {
            toolbar: [
                [
                    { header: [
                        1,
                        2,
                        false
                    ] }
                ],
                [
                    'bold',
                    'italic',
                    'underline'
                ],
                [
                    { 'size': [
                        'small',
                        false,
                        'large',
                        'huge'
                    ] }
                ],
                [
                    { 'color': [] },
                    { 'background': [] }
                ]
            ]
        },
        placeholder: "Indiquez ici un message pour le reste de l'équipe",
        theme: 'snow'
    });
    info_editor.root.innerHTML = params.content;
}

/**
 * Init object & dom for the info editor.
 * Await retrieving content.
 */
async function init_info_editor() {
    let info_content = await get_or_create_common_info();

    // Reset info editor
    info_editor = null;
    $("#common_info_editor_container").empty();
    $("#common_info_editor_container").append(`<div id="common_info_editor"></div>`);

    // Init text editor for Info textarea
    let quill_params = {
        id: '#common_info_editor',
        content: info_content
    };

    quillify(quill_params);

    $("#save_common_info").on("click", function() {
        if (is_time_to('save_common_info', 1000)) {
            let content = $("#common_info_editor").find('.ql-editor')
                .html();

            if (content === "<p><br></p>") {
                content = "";
            }

            update_common_info(content);
        }
    });

}

/**
 * Get common info HTML content. If doc doesn't exist, create & return empty string
 * @returns String HTML content | ""
 */
function get_or_create_common_info() {
    // todo await async
    return new Promise((resolve) => {
        dbc.get(common_info_doc_name).then((doc) => {
            info_doc = doc;
            resolve(doc.content);
        })
            .catch(function (err) {
                if (err.status == 404) {
                // First access, create
                    info_doc._id = common_info_doc_name;
                    dbc.put(info_doc, function callback(err, result) {
                        if (!err) {
                            info_doc._rev = result.rev;
                        } else {
                            $.notify(
                                "Erreur lors de l'initialisation du bloc d'informations",
                                {
                                    globalPosition:"top right",
                                    className: "error"
                                }
                            );
                            console.log(err);
                        }
                        resolve("");
                    });
                } else {
                    $.notify(
                        "Erreur lors de la récupération du bloc d'informations",
                        {
                            globalPosition:"top right",
                            className: "error"
                        }
                    );
                    console.log(err);
                    resolve("");
                }
            });
    });
}

/**
 * Update couchdb info document with textarea (HTML) content
 * @param {String} content
 */
function update_common_info(content) {
    info_doc.content = content;
    dbc.put(info_doc, function callback(err, result) {
        if (!err) {
            info_doc._rev = result.rev;
            $.notify(
                "Bloc d'informations mis à jour",
                {
                    globalPosition:"top right",
                    className: "success"
                }
            );
        } else {
            $.notify(
                "Erreur lors de la mise à jour du bloc d'informations",
                {
                    globalPosition:"top right",
                    className: "error"
                }
            );
            console.log(err);
        }
    });
}

$(document).ready(function() {
    if (coop_is_connected()) {
        $('#new_order_form').show();
        $('#existing_orders_area').show();
        $('#common_info_area').show();

        fingerprint = new Fingerprint({canvas: true}).get();
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

        openModal();

        init_pouchdb_sync();

        // Main screen
        if (metabase_url !== '') {
            $('#access_metabase').show();
        }

        $("#coverage_form").on("submit", function(e) {
            e.preventDefault();
            if (is_time_to('submit_coverage_form', 1000)) {
                let days_val = $("#coverage_days_input").val(),
                    amount_val = $('#targeted_amount_input').val();

                days_val = parseInt(days_val);
                amount_val = parseInt(amount_val);
                if (isNaN(days_val)) days_val = null;
                if (isNaN(amount_val)) amount_val = null;

                if (days_val !== null || amount_val !== null) {
                    order_doc.coverage_days = days_val;
                    order_doc.targeted_amount = amount_val;
                    compute_products_coverage_qties()
                        .then(() => {
                            debounceFunction(update_cdb_order);
                            update_main_screen();
                        });

                } else {
                    $("#coverage_days_input").val(order_doc.coverage_days || '');
                    $('#targeted_amount_input').val(order_doc.targeted_amount || '');
                    alert("Ni le nombre de jours de couverture, ni le montant à atteindre sont correctement renseignés");

                }
            }
        });

        $("#toggle_action_buttons").on("click", function() {
            if ($('#actions_buttons_container').is(":visible")) {
                $('#actions_buttons_container').hide();
                $('.toggle_action_buttons_icon').empty()
                    .append('<i class="fas fa-chevron-down"></i>');
            } else {
                $('#actions_buttons_container').show();
                $('.toggle_action_buttons_icon').empty()
                    .append('<i class="fas fa-chevron-up"></i>');
            }
        });

        // Close dropdown menu on click outside
        $(document).click(function(event) {
            let target = $(event.target);

            if (
                !target.closest('#actions_buttons_wrapper').length
                && $('#actions_buttons_container').is(":visible")
            ) {
                $('#actions_buttons_container').hide();
                $('.toggle_action_buttons_icon').empty()
                    .append('<i class="fas fa-chevron-down"></i>');
            }
        });

        $("#supplier_form").on("submit", function(e) {
            e.preventDefault();
            if (is_time_to('add_product', 1000)) {
                add_supplier();
            }
        });

        $("#product_form").on("submit", function(e) {
            e.preventDefault();
            if (is_time_to('add_product', 1000)) {
                add_product();
            }
        });

        $("#stats_date_period_select").on("change", function(e) {
            e.preventDefault();
            if (is_time_to('change_stats_date_period', 1000)) {
                openModal();

                order_doc.stats_date_period = $(this).val();

                check_products_data()
                    .then(() => {
                        compute_products_coverage_qties()
                            .then(() => {
                                update_main_screen();
                                debounceFunction(update_cdb_order);
                                closeModal();
                            });

                    });
            }
        });

        $("#do_inventory").on("click", function() {
            if (is_time_to('generate_inventory', 1000)) {
                generate_inventory();
            }
        });

        $("#refresh_order").on("click", function() {
            if (is_time_to('refresh_order', 1000)) {
                openModal();
                check_products_data()
                    .then(() => {
                        debounceFunction(update_cdb_order);
                        update_main_screen();
                        $("#toggle_action_buttons").click();
                        closeModal();
                    });
            }
        });

        $("#delete_order_button").on("click", function() {
            if (is_time_to('press_delete_order_button', 1000)) {
                let modal_remove_order = $('#templates #modal_remove_order');

                modal_remove_order.find(".remove_order_name").text(order_doc._id);

                openModal(
                    modal_remove_order.html(),
                    () => {
                        if (is_time_to('validate_remove_order')) {
                            delete_cdb_order().then(() => {
                                update_order_selection_screen().then(() => {
                                    reset_data();
                                    switch_screen('order_selection');
                                    setTimeout(function() {
                                        $.notify(
                                            "Commande supprimée !",
                                            {
                                                globalPosition:"top left",
                                                className: "success"
                                            }
                                        );
                                    }, 500);
                                });
                            })
                                .catch(() => {
                                    console.log("error deleting order");
                                });
                        }
                    },
                    'Valider'
                );
            }

        });

        $('#back_to_order_selection_from_main').on('click', function() {
            if (is_time_to('back_to_order_selection_from_main', 1000)) {
                back();
            }
        });

        $('#create_orders').on('click', function() {
            if (is_time_to('create_orders', 1000)) {
                let modal_create_order = $('#templates #modal_create_order');

                modal_create_order.find('.suppliers_date_planned_area').empty();

                for (let supplier of selected_suppliers) {
                    let supplier_date_planned_template = $('#templates #modal_create_order__supplier_date_planned');

                    supplier_date_planned_template.find(".supplier_name").text(supplier.display_name);
                    supplier_date_planned_template.find(".modal_input_container").attr('id', `container_date_planned_supplier_${supplier.id}`);

                    modal_create_order.find('.suppliers_date_planned_area').append(supplier_date_planned_template.html());
                }


                openModal(
                    modal_create_order.html(),
                    () => {
                        if (is_time_to('validate_create_orders')) {
                            create_orders();
                        }
                    },
                    'Valider',
                    false
                );

                // Add id to input once modal is displayed
                for (let supplier of selected_suppliers) {
                    $(`#modal #container_date_planned_supplier_${supplier.id}`).find(".supplier_date_planned")
                        .attr('id', `date_planned_supplier_${supplier.id}`);
                }

                $("#modal .supplier_date_planned")
                    .datepicker({
                        defaultDate: "+1d",
                        minDate: new Date()
                    })
                    .on('change', function() {
                        try {
                            // When date input changes, try to read date
                            $.datepicker.parseDate(date_format, $(this).val());
                        } catch {
                            alert('Date invalide');
                            $(this).val('');
                        }
                    });
            }

            return 0;
        });

        $(document).on("click", ".average_consumption_explanation_icon", display_average_consumption_explanation);

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

        // Order selection screen
        update_order_selection_screen();
        init_info_editor();

        $("#new_order_form").on("submit", function(e) {
            e.preventDefault();
            if (is_time_to('submit_new_order_form', 1000)) {
                create_cdb_order();

            }
        });

        // Orders created screen
        $('#back_to_order_selection_from_orders_created').on('click', function() {
            if (is_time_to('back_to_order_selection_from_orders_created', 1000)) {
                switch_screen('order_selection', 'orders_created');
            }
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
                if (data.status === 403) {
                    handle_unauthorize();
                } else {
                    err = {msg: "erreur serveur lors de la récupération des fournisseurs", ctx: 'get_suppliers'};
                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                        err.msg += ' : ' + data.responseJSON.error;
                    }
                    report_JS_error(err, 'orders');

                    closeModal();
                    alert('Erreur lors de la récupération des fournisseurs, rechargez la page plus tard');
                }
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

        $(document).on('click', '.accordion', function() {
            /* Toggle between adding and removing the "active" class,
            to highlight the button that controls the panel */
            this.classList.toggle("active");

            /* Toggle between hiding and showing the active panel */
            var panel = this.nextElementSibling;

            if (panel.style.display === "block") {
                panel.style.display = "none";
            } else {
                panel.style.display = "block";
            }
        });

        if (/Firefox\//.exec(userAgent)) {
            // needed to prevent bug using number input arrow to change quantity (https://bugzilla.mozilla.org/show_bug.cgi?id=1012818)
            // Have to capture mousedown and mouseup events, instead of using only click event
            // Indeed, capturing click only remove the ability to click to have focus on the input to type a number.
            $(document).on("mousedown", '[type="number"]', function() {
                qties_values[$(this).attr('id')] = $(this).val();
            });
            $(document).on("mouseup", '[type="number"]', function() {
                try {
                    if ($(this).val() != qties_values[$(this).attr('id')]) {
                        process_new_product_qty(this);
                    }
                } catch (err) {
                    console.log(err);
                }
            });
        }
    } else {
        $('#not_connected_content').show();
    }
});
