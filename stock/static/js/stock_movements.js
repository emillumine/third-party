/* eslint consistent-this: ["warn", "that"] */
/*
 * Récupération de protuits par scan et saisie de quantités pour créer des mouvements de stock.
 *
 * Mouvements disponibles :
 *  - Pertes
 *  - Repas salariés
 *  - Autoconsommation
 */

var products = [],
    products_table = null,
    confirmation_table = null,
    barcodes = null,
    movement_type = null,
    members_search_results = [],
    operator = null;


function reset_focus() {
    // Wait a little bit to reset, or ignored after paste
    setTimeout(function() {
        $('#sm_barcode_selector').val('');
        $('#icon_product_not_found').hide();
        $('#sm_barcode_selector').focus();
    }, 100);
}

/*
 * Remove a row from datatable
 */
function remove_row(row) {
    var data = products_table.row($(row).parents('tr')).data();

    for (i in products) {
        if (products[i].id == data.id) {
            products.splice(i, 1);
            break;
        }
    }
    products_table
        .row($(row).parents('tr'))
        .remove()
        .draw();
    update_total_value();
}

/*
 * Make a row blink
 */
function blink_row(rowNode) {
    $(rowNode).addClass('blink_me');
    rowNode.addEventListener('animationend', onAnimationEnd);
    rowNode.addEventListener('webkitAnimationEnd', onAnimationEnd);
    function onAnimationEnd() {
        rowNode.classList.remove('blink_me');
    }
}

/*
 * Init or reinit the products datatable with a new set of products
 */
function init_datatable() {
    // Empty datatable if already exists
    if (products_table) {
        products_table.destroy();
    }

    // Only init datatable if array of products not empty
    if (products.length > 0) {
        products_table = $('#products_table').DataTable({
            data: products,
            columns:[
                {data:"id", title: "id", visible: false},
                {
                    data:"name",
                    title:"Produit",
                    width: "50%",
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
                {
                    data:"uom.name",
                    title: "Unité de vente",
                    // className:"dt-body-center",
                    orderable: false
                },
                {
                    title: "Quantité",
                    // className:"dt-body-center",
                    orderable: false,
                    render: function (data, type, full) {
                        var value = ('qty' in full) ? full.qty : '';


                        return '<input type="number" class="stock_edit_input" value="' + value + '">';
                        // To force decimal to be . , add lang="en-150" to input tag
                        // + ' <button type="button" class="stock_edit_button btn--primary"><i class="fas fa-lg fa-check"></i></button>'
                    }
                },
                {
                    data:"standard_price",
                    title: "Valeur HT",
                    // className:"dt-body-center",
                    render: function (data, type, full) {
                        if ('qty' in full && full.qty != null) {
                            var value = parseFloat(full.qty*data).toFixed(2);


                            return value + '€';
                        } else
                            return '';
                    }
                },
                {
                    data:"list_price",
                    title: "Prix Vente TTC",
                    // className:"dt-body-center",
                    render: function (data, type, full) {
                        if ('qty' in full && full.qty != null) {
                            var value = parseFloat(full.qty*data).toFixed(2);


                            return value + '€';
                        } else
                            return '';
                    }
                },
                {
                    title: "",
                    orderable: false,
                    className:"dt-body-center",
                    width: "1%",
                    render: function () {
                        return '<span class="remove_row_icon">' +
            '<i class="fas fa-times"></i>' +
            '</span>';
                    }
                }
            ],
            order: [
                [
                    0,
                    "asc"
                ]
            ],
            paging: false,
            dom: 'lrtip', // Remove the search input from that table
            language: {url : '/static/js/datatables/french.json'}
        });

        // Listener on inputs
        $('#products_table tbody').on('change', '.stock_edit_input', function () {
            let qty = $(this).val();

            let row = products_table.row($(this).parents('tr'));
            let data = row.data();

            let validated_data = qty_validation(qty, data.uom.id);

            if (validated_data >= 0) {
                data.qty = validated_data;
                row.remove().draw();
                products_table.row.add(data).draw();
            } else {
                data.qty = null;
                row.remove().draw();
                products_table.row.add(data).draw();

                if (validated_data == -2) {
                    $.notify("Ce produit est vendu à l'unité : la valeur doit être un nombre entier !", {
                        globalPosition:"top right",
                        className: "error"
                    });
                } else if (validated_data == -1 || validated_data == -3) {
                    $.notify("Valeur invalide.", {
                        globalPosition:"top right",
                        className: "error"
                    });
                }
            }

            update_total_value();
        });

        // Remove row
        products_table.on('click', '.remove_row_icon', function () {
            var that = this;

            openModal($('#modal_confirm_delete_line').html(), function() {
                remove_row(that);
            }, 'Confirmer');
        });

        // Show validation button
        $('.footer').show();
    }
}

function init_confirmation_datatable() {
    if (confirmation_table) {
        confirmation_table.destroy();
    }

    confirmation_table = $('#confirmation_table').DataTable({
        data: products,
        autoWidth: false,
        columns:[
            {data:"id", title: "id", visible: false},
            {
                data:"name",
                title:"Produit",
                width: "50%"
            },
            {
                data:"qty",
                title: "Quantité",
                className:"dt-body-center"
            },
            {
                data:"uom.name",
                title: "Unité de vente",
                className:"dt-body-center"
            },
            {
                data:"standard_price",
                title: "Valeur",
                className:"dt-body-center",
                render: function (data, type, full) {
                    var value = parseFloat(full.qty*data).toFixed(2);


                    return value + '€';
                }
            }
        ],
        order: [
            [
                0,
                "asc"
            ]
        ],
        paging: false,
        dom: 'lrtp', // Remove the search input from that table
        language: {url : '/static/js/datatables/french.json'}
    });
}

function without_consent_update_product(p, added_qty) {
    let undo_option = true;

    update_existing_product(p, added_qty, undo_option);
}

function get_stored_product_with_bc(barcode) {
    /* return product in products variable which have the same barcode */
    let product = null;

    for (let p of products) {
        if (p.barcode == barcode) {
            product = p;
        }
    }

    return product;
}

/*
 * Fetch a product when barcode is read
 */
function fetch_product_from_bc(barcode) {
    //console.log(barcode)

    if (barcode == '') {
        reset_focus();

        return -1;
    }

    let p = barcodes.get_corresponding_odoo_product(barcode);

    if (p == null) {
        $('#icon_product_not_found').show();
        alert("Le code-barre " + barcode + " ne correspond à aucun article connu.");

        return -1;
    }

    /*
        p.data[barcodes['keys']['uom_id']] is the Odoo uom database id
        barcodes['uoms'] is an associative array of uoms (with id as key)
    */
    let product = {
        'id': p.data[barcodes['keys']['id']],
        'barcode': p.barcode,
        'name': p.data[barcodes['keys']['name']],
        'uom': barcodes['uoms'][p.data[barcodes['keys']['uom_id']]],

        'standard_price' : p.data[barcodes['keys']['standard_price']], // cost
        'list_price': p.data[barcodes['keys']['list_price']], // public price
        'qty': p.qty
    };

    product['uom']['id'] = p.data[barcodes['keys']['uom_id']];
    product['rule'] = p.rule;

    p_existing = get_stored_product_with_bc(p.barcode);

    if (p_existing !== null) {
        without_consent_update_product(p_existing, product.qty);
        return 0;
    } else {
        add_product(product);
        reset_focus();

        return 0;
    }
}

/*
 * Add a product to the datatable
 */
var add_product = function(product) {
    try {
        // Add to list

        products.push(product);

        if (products_table == null) {
            // create table, show panel
            init_datatable();

        } else {
            // Add row to table
            var rowNode = products_table.row.add(product).draw(false)
                .node();

            // Handle blinking effect for new row
            blink_row(rowNode);
        }

        update_total_value();
        $('.footer').show(); // if is a second or more access, footer is hidden (init_datatable is not fired)
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'add_product'};
        console.error(err);
        report_JS_error(err, 'stock_movement');
    }
};

var update_in_products = function(product) {
    //update product in products , after qty has been changed
    let i = 0,
        p_index = null;

    for (let p of products) {
        if (p.barcode == product.barcode) {
            p_index = i;
        }
        i++;
    }
    if (p_index !== null) products[p_index] = product;
    else console.log("Le produit n'a pas pu être trouvé dans la variable products !");
};


/*
 * Update a line in the table: update quantity
*/
var update_existing_product = function(product, added_qty, undo_option = false) {

    let op = "augmentée";
    let notify_options = {
        globalPosition:"top right",
        className: "info",
        clickToHide: false
    };

    product.qty += added_qty;


    // Find index of row which match product id in the first column
    var indexes = products_table.rows().eq(0)
        .filter(function (rowIdx) {
            return products_table.cell(rowIdx, 0).data() === product.id ? true : false;
        });

    // Loop through them (only one match)
    products_table.rows(indexes).every(function () {
        this.remove().draw();
        var rowNode = products_table.row.add(product).draw()
            .node();

        // Blink updated row
        blink_row(rowNode);

        return 0;
    });


    if (added_qty < 0) op = "diminuée";
    let msg = "La quantité a été " + op + " de " + Math.abs(added_qty) + ".";

    if (undo_option == true) {
        notify_options.clickToHide = true;
        notify_options.autoHide = false;
        // notify_options.autoHideDelay = 10000;
        notify_options.style = 'cancelable';

        msg = '<span class="msg" data-barcode="' + product.barcode + '" data-added_qty="' + added_qty + '">'
            + "<b>" + product.name + "</b><br/>" + msg
            + '</span>';
    }

    $.notify(msg, notify_options);
    update_in_products(product);
    update_total_value();
    reset_focus();
};

/*
 * Validate qty
 * Returns qty or error code
 * Error codes :
 *  >= 0 = ok
 *  -1 = empty
 *  -2 = invalid integer
 *  -3 = invalid value
 *
 */
function qty_validation(qty, uom_id) {
    if (qty == null || qty == '') {
        return -1;
    }

    if (uom_id == 1) {
        if (qty/parseInt(qty) != 1 && qty != 0)
            return -2;

        qty = parseInt(qty); // product by unit
    } else {
        qty = parseFloat(qty).toFixed(2);
    }

    if (isNaN(qty))
        return -3;

    return qty;
}

// Update the total value from values in datatable
function update_total_value() {
    var total = 0;

    if (products_table) {
        products_table.rows().every(function () {
            var data = this.data();

            if ('qty' in data) {
                total += data.qty*data.standard_price;
            }

            return 0;
        });
    }

    total = parseFloat(total).toFixed(2);
    $('.total_value').text(total);
}

// Validation & open confirmation modal
function confirm_movement() {
    // Create a temp variable to get all data from table
    let tmp_products_data = [];

    // Check again for errors
    var error_in_table = false;

    products_table.rows().every(function () {
        let data = this.data();
        let qty_value = $(this.node()).find('input')
            .val();

        qty_value = qty_validation(qty_value, data.uom.id);
        if (qty_value < 0) {
            error_in_table = true;
        }

        tmp_products_data.push(data);

        return 0;
    });

    if (error_in_table) {
        $.notify("Il y a une erreur dans le tableau ! (Tous les champs sont obligatoires)", {
            globalPosition:"top right",
            className: "error"
        });

        return -1;
    }

    // If no error, assign global 'products' variable with table data
    products = tmp_products_data;

    var modal_confirm_movement = $('#modal_confirm_movement');

    // Set confirmation message
    if (movement_type == 'losses') {
        msg = 'Êtes-vous sûr de vouloir passer ces produits en <b>PERTES</b> ?';
    } else if (movement_type == 'meals') {
        msg = 'Êtes-vous sûr de vouloir passer ces produits en <b>Repas salarié</b> ?';
    } else if (movement_type == 'autoconso') {
        msg = 'Êtes-vous sûr de vouloir passer ces produits en <b>Autoconsommation</b> ?';
    } else if (movement_type == 'stock_correction') {
        msg = 'Êtes-vous sûr de vouloir corriger les stocks de ces produits ?';
    }
    modal_confirm_movement.find('#confirm_message_movtype').html(msg);

    openModal(modal_confirm_movement.html(), function() {
        do_stock_movement();
    }, 'Confirmer', false);
    init_confirmation_datatable();

    // Set action to search for the member
    $('#sm_search_member_form').submit(function() {
        let search_str = $('#sm_search_member_input').val();

        $.ajax({
            url: '/members/search/' + search_str,
            dataType : 'json',
            success: function(data) {
                members_search_results = [];
                operator = null;
                enable_validation();

                for (member of data.res) {
                    if (member.is_member || member.is_associated_people) {
                        members_search_results.push(member);
                    }
                }

                display_possible_members();
            },
            error: function(data) {
                err = {
                    msg: "erreur serveur lors de la recherche de membres",
                    ctx: 'confirm_movement.search_members'
                };
                report_JS_error(err, 'stock');

                $.notify("Erreur lors de la recherche de membre, il faut ré-essayer plus tard...", {
                    globalPosition:"top right",
                    className: "error"
                });
            }
        });
    });

    // Set modal DOM & data
    $('.search_member_results_area').hide();
    $('.search_member_results').empty();
    operator = null;
    enable_validation();

    // Check if prices displayed are correct
    var ids = [];

    for (p of products) {
        ids.push(p.id);
    }

    $.ajax({
        type: "POST",
        url: "/products/get_products_stdprices",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(ids),
        success: function(data) {
            var price_changed = false;

            for (p of products) {
                for (verif_p of data.res) {
                    if (p.id == verif_p.id && p.standard_price != verif_p.standard_price) {
                        p.standard_price = verif_p.standard_price;
                        price_changed = true;
                    }
                }
            }

            $('#confirmation_checking_price_msg').hide();
            if (price_changed) {
                $('#confirmation_price_changed').show();
                init_confirmation_datatable();
                update_total_value();
                init_datatable();
            }
        },
        error: function(data) {
            // server error
            err = {msg: "erreur serveur lors de la récupération des prix", ctx: 'check_prices'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'stock');
            console.error(err);
            $.notify("Erreur lors de la récupération des prix des produits", {
                globalPosition:"top right",
                className: "error"
            });
        }
    });

    return 0;
}

// Enable or disable modal's validation button if an operator has been selected
function enable_validation() {
    $('#modal .btns .btn--success').prop('disabled', (operator == null));
}

// Display the members from the search result
function display_possible_members() {
    $('.search_member_results_area').show();
    $('.search_member_results').empty();

    if (members_search_results.length > 0) {
        for (member of members_search_results) {
            let btn_classes = "btn";

            if (operator != null && operator.id == member.id) {
                btn_classes = "btn--success";
            }

            // Display results (possible members) as buttons
            var member_button = '<button class="' + btn_classes + ' btn_member" member_id="'
                          + member.id + '">'
                          + member.barcode_base + ' - ' + member.name
                          + '</button>';

            $('.search_member_results').append(member_button);

            // Set action on click on a member button
            $('.btn_member').on('click', function() {
                for (member of members_search_results) {
                    if (member.id == $(this).attr('member_id')) {
                        operator = member;

                        // Enable validation button when operator is selected
                        enable_validation();
                        break;
                    }
                }
                display_possible_members();
            });
        }
    } else {
        $('.search_member_results').html('<p><i>Aucun résultat ! Vérifiez votre recherche...</i></p>');
    }
}

// Proceed with stock movement, according to movement type selected
function do_stock_movement() {
    if (is_time_to('do_stock_movement', 500)) {
        openModal();

        let movement_data = {
            'movement_type': movement_type,
            'operator': operator,
            'products': products.map(obj => { // transmit only uom id (not all staff)
                obj.uom_id = obj.uom.id;
                delete obj.uom;

                return obj;
            })
        };

        openModal();
        $.ajax({
            type: "POST",
            url: "/stock/do_movement",
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(movement_data),
            success: function() {
                closeModal();
                $.notify("Opération réussie !", {
                    globalPosition:"top right",
                    className: "success"
                });
                $('#back_to_movement_selection').trigger('click');
                // Reset datatable, other values and focus

                products = [];
                products_table.clear().draw();
                $('.footer').hide();


            },
            error: function(data) {
                // server error
                err = {msg: "erreur serveur lors de l'enregistrement du mouvement de stock", ctx: 'do_stock_movement'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                report_JS_error(err, 'stock');

                console.error(err);
                closeModal();
                reset_focus();

                $.notify("Erreur lors de l'opération.", {
                    globalPosition:"top right",
                    className: "error"
                });
            }
        });
    }
}

// Load barcodes at page loading, then barcodes are stored locally
var get_barcodes = async function() {
    if (barcodes == null) barcodes = await init_barcodes();
};

function init_notify_cancelable_style() {
    try {
        $.notify.addStyle('cancelable', {
            html:
            "<div class='info'>" +
              "<div class='clearfix'>" +
                "<div data-notify-html/>" +
                "<div class='buttons'>" +
                  "<button class='no btn--danger'>Annuler</button>" +
                  "<button class='yes btn--info'>Fermer</button>" +
                "</div>" +
              "</div>" +
            "</div>"
        });
    } catch (e) {
        console.log(e);
    }
}

$(document).ready(function() {
    var barcode_input = $('#sm_barcode_selector');

    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    // Load barcodes
    get_barcodes();

    // Set focus on input for barcode reader
    reset_focus();

    $('#movement_validation_button').on('click', function () {
        confirm_movement();
    });

    $(document).pos();
    $(document).on('scan.pos.barcode', function(event) {
        // Search for barcode only if movement type is selected
        if (movement_type != null) {
        //access `event.code` - barcode data
            var barcode = event.code;

            if (barcode.length >=13) {
                barcode = barcode.substring(barcode.length-13);
            } else if (barcode.length == 12 && barcode.indexOf('0') !== 0) {
            // User may use a scanner which remove leading 0
                barcode = '0' + barcode;
            } else {
            //manually submitted after correction
                barcode = barcode_input.val();
            }

            fetch_product_from_bc(barcode);
        }
    });

    barcode_input.on('paste', function(e) {
        if (movement_type != null) {
            let barcode_candidate = e.originalEvent.clipboardData.getData('text')
                .replace(/[^0-9]/g, '');

            fetch_product_from_bc(barcode_candidate);
        }
    });

    // Change screen with animation when a movement type is selected
    $('.movement_type_button').on('click', function() {
        // Specific behavior for each movement type selection
        if (this.id == 'losses_type_button') {
            $('#title_movement_type').text('Saisie de Pertes');
            movement_type = 'losses';
        } else if (this.id == 'autoconso_type_button') {
            $('#title_movement_type').text('Saisie d\'Autoconsommation');
            movement_type = 'autoconso';
        } else if (this.id == 'meals_type_button') {
            $('#title_movement_type').text('Saisie de Repas salariés');
            movement_type = 'meals';
        }

        var oldBox = $("#content_movement_type_selection");
        var newBox = $("#content_main");
        // Get full width
        var outerWidth = oldBox.outerWidth(true);

        // Display the new box and place it on the right of the screen
        newBox.css({ "left": outerWidth + "px", "right": -outerWidth + "px", "display": "" });
        // Make the old content slide to the left
        oldBox.animate({ "left": -outerWidth + "px", "right": outerWidth + "px" }, 1000, function() {
            // Hide old content after animation
            oldBox.css({ "left": "", "right": "", "display": "none" });
        });
        // Slide new box to regular place
        newBox.animate({ "left": "", "right": "" }, 1000);
    });

    // Back to movement type selection
    $('#back_to_movement_selection').on('click', function() {
        movement_type = null;

        var oldBox = $("#content_main");
        var newBox = $("#content_movement_type_selection");
        // Get full width
        var outerWidth = oldBox.outerWidth(true);

        // Display the new box and place it on the right of the screen
        newBox.css({ "left": -outerWidth + "px", "right": outerWidth + "px", "display": "" });
        // Make the old content slide to the left
        oldBox.animate({ "left": outerWidth + "px", "right": -outerWidth + "px" }, 1000, function() {
            // Hide old content after animation
            oldBox.css({ "left": "", "right": "", "display": "none" });
        });
        // Slide new box to regular place
        newBox.animate({ "left": "", "right": "" }, 1000);
    });

    // Notifications settings
    init_notify_cancelable_style();
    $(document).on('click', '.notifyjs-cancelable-base .no', function() {
        //programmatically trigger propogating hide event
        let msg = $(this).closest('.notifyjs-cancelable-base')
            .find('span.msg');

        if (msg.length > 0) {
            let bc = msg.data('barcode');
            let added_qty = msg.data('added_qty') || 1;
            let product = get_stored_product_with_bc(bc);

            if (product !== null) {
                update_existing_product(product, - added_qty);
            } else {
                alert("Le produit n'a pas été retrouvé dans la mémoire de travail.");
            }
        } else {
            alert("Les informations n'ont pas pu être récupérées.");
        }
        //$(this).trigger('notify-hide');
    });
});
