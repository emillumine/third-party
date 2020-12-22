/*
 * Récupération d'un produit par scan et affichage des informations du produits.
 * Les informations actuellements récupérées sont :
 *  - Numéro de Rayon
 *  - Stock théorique
 *
 * Les informations actuellement modifiables sont :
 *  - Stock théorique
 */

var products = [],
    products_table = null,
    search_chars = [];

function reset_focus() {
    $('#barcode_selector').val('');
    $('#barcode_selector').focus();
}

function add_product(product) {
    try {
    // Add to list
        products.push(product);

        if (products_table == null) {
            // create table, show panel
            products_table = $('#products_table').DataTable({
                data: products,
                columns:[
                    {data:"id", title: "id", visible: false},
                    {
                        data:"name",
                        title:"Produit",
                        width: "50%",
                        render: function (data, type, full, meta) {
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
                    {data:"shelf_sortorder", title: "Rayon"},
                    {
                        data:"uom_id.1",
                        title: "Unité de vente",
                        className:"dt-body-center",
                        orderable: false
                    },
                    {
                        data:"qty_available",
                        title: "Stock théorique",
                        className:"dt-body-center",
                        render: function (data, type, full, meta) {
                            return '<input type="number" class="stock_edit_input" value="' + data + '">'
              + ' <button type="button" class="stock_edit_button btn--primary"><i class="fas fa-lg fa-check"></i></button>';
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

            // Listener on 'Update product stock' button
            $('#products_table tbody').on('click', 'button.stock_edit_button', function () {
                var row = products_table.row($(this).parents('tr'));
                var row_data = row.data();

                // Data validation
                qty = $(this).parents('tr')
                    .find('input')
                    .val();
                if (row_data.uom_id[0] == 1) {
                    if (qty/parseInt(qty) != 1) {
                        $.notify(
                            "Ce produit est vendu à l'unité : la valeur doit être un nombre entier !",
                            {
                                globalPosition:"top left",
                                className: "error"
                            }
                        );

                        return 0;
                    }

                    qty = parseInt(qty); // product by unit
                } else {
                    qty = parseFloat(qty);
                }

                // Value is valid
                if (!isNaN(qty)) {
                    row_data.qty = $(this).parents('tr')
                        .find('input')
                        .val();

                    if (row_data.qty != row_data.qty_available) {
                        update_product_stock(row_data);
                    } else {
                        $.notify(
                            "Valeur inchangée.",
                            {
                                globalPosition:"top left",
                                className: "info"
                            }
                        );
                    }
                } else {
                    $.notify(
                        "Valeur invalide.",
                        {
                            globalPosition:"top left",
                            className: "error"
                        }
                    );
                }
            });

        } else {
            // Add row to table
            var rowNode = products_table.row.add(product).draw(false)
                .node();
            let onAnimationEnd = function() {
                rowNode.classList.remove('blink_me');
            };

            // Handle blinking effect for newly added row
            $(rowNode).addClass('blink_me');
            rowNode.addEventListener('animationend', onAnimationEnd);
            rowNode.addEventListener('webkitAnimationEnd', onAnimationEnd);
        }
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'add_product'};
        console.error(err);
        report_JS_error(err, 'produits');
    }
}

function update_product_stock(p_data) {
    openModal();
    $.ajax({
        type: "POST",
        url: "/products/update_product_stock",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(p_data),
        success: function(data) {
            p_data.qty_available = p_data.qty;
            delete p_data.qty;

            closeModal();
            $.notify(
                "Stock mis à jour !",
                {
                    globalPosition:"top left",
                    className: "success"
                }
            );

            reset_focus();
        },
        error: function(data) {
            // server error
            err = {msg: "erreur serveur lors de la maj du stock", ctx: 'update_product_stock'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }

            console.error(err);
            report_JS_error(err, 'produits');

            closeModal();
            reset_focus();
        }
    });
}

// Fetch a product when barcode is read
function fetch_product_from_bc(barcode) {
    if (barcode == '') {
        reset_focus();

        return 0;
    }

    for (p of products) {
        if (p.barcode == barcode) {
            $.notify(
                "Produit déjà récupéré !",
                {
                    globalPosition:"top left",
                    className: "info"
                }
            );

            reset_focus();

            return 0;
        }
    }

    $.ajax({
        url: "/products/get_product_data?barcode=" + barcode,
        success: function(data) {
            reset_focus();

            if (data.product.active == false) {
                alert('Ce produit est archivé !');

                return 0;
            }

            add_product(data.product);
        },
        error: function(data) {
            if (data.status == 404) {
                // Product not found (shouldn't rise)
                $.notify(
                    "Aucun produit trouvé avec ce code barre !",
                    {
                        globalPosition:"top left",
                        className: "error"
                    }
                );
                reset_focus();
            } else {
                // server error
                err = {msg: "erreur serveur lors de la récupération du produit", ctx: 'fetch_product_from_bc'};
                if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                    err.msg += ' : ' + data.responseJSON.error;
                }
                console.error(err);
                report_JS_error(err, 'produits');
                reset_focus();
            }
        }
    });
}

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    reset_focus();

    $('#button_barcode_selector').on('click', function () {
        bc = $('#barcode_selector').val();
        fetch_product_from_bc(bc);
    });

    // Barcode reader: listen for 13 digits read in a very short time
    $('#search_input').keypress(function(e) {
        if (e.which >= 48 && e.which <= 57) {
            search_chars.push(String.fromCharCode(e.which));
        }
        if (search_chars.length >= 13) {
            var barcode = search_chars.join("");

            if (!isNaN(barcode)) {
                search_chars = [];
                setTimeout(function() {
                    fetch_product_from_bc(barcode);
                }, 300);
            }
        }
    });
});
