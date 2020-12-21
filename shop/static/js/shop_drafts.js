var orders_table = null,
    orders = [],
    main_content = $('#main-content'),
    checkbox = '<input type = "checkbox" />',
    print_icon = '<i class="fas fa-print"></i>',
    eye = '<i class="fas fa-eye"></i>',
    delete_icon = '<i class="fas fa-trash"></i>',
    cart_details = $('#templates .cart-details'),
    cart_destroy_msg = $('#templates .destroy-cart-msg'),
    multiple_carts_destroy_msg = $('#templates .destroy-multiple-carts-msg'),
    multiple_carts_item_destroy = $('#templates .destroy-multiple-carts-item'),
    remove_closing_date_msg = $('#templates .remove-closing-date-msg'),
    internal_get_msg = $('#templates .get-cart-ref'),
    main_msg_area = $('#main-msg-area'),
    waiting_for_display = {'new': [], 'update': [], 'delete': []},
    cart_id = null,
    cart_revisions = {},
    shop_settings = null,
    loading_img = $('#rotating_loader').clone()
        .removeAttr('id')
        .addClass('rotating_loader');

/** pouchdb listner **/
sync.on('change', function (info) {
    // handle change
    //console.log(info)
    try {
        if (info.direction == "pull") {
        //new order or updated order from another brow
            $.each(info.change.docs, function(i, e) {

                updateWaitingForDisplayWithNewArrival(e);
            });
        }
    } catch (err) {
        console.log(err);
    }
}).on('paused', function (err) {
    // replication paused (e.g. replication up to date, user went offline)
    if (err) {
        online = false;
    }


})
    .on('active', function () {
    // replicate resumed (e.g. new changes replicating, user went back online)
        online = true;

    })
    .on('denied', function (err) {
    // a document failed to replicate (e.g. due to permissions)
    })
    .on('complete', function (info) {
    // handle complete
    //never triggered with live = true (only if replication is cancelled)

    })
    .on('error', function (err) {
    // handle error
        console.log('erreur sync');
        console.log(err);
    });

var putLoadingImgOn = function(target) {
    target.append(loading_img);
};
var removeLoadingImg = function() {
    $('.rotating_loader').remove();
};

var updateWaitingForDisplayWithNewArrival = function(doc) {
    var type = 'new';

    if (typeof doc._deleted == "undefined") {
        var date = new Date(parseInt(doc.submitted_time*1000, 10));

        doc.total = parseFloat(doc.total).toFixed(2);
        doc.h_submitted_date = format_date_to_sortable_string(date);
        // check if it's a new order or an updated one
        if (orders_table) {
            var found = false;

            $.each(orders_table.rows().ids(), function(idx, id) {
                if (id == doc._id) found = true;
            });
            if (found == true) type = 'update';
        }
    } else {
        type = 'delete';
    }


    waiting_for_display[type].push(doc);
    updateArrivalsMsg();

};
var updateArrivalsMsg = function () {
    for (type in waiting_for_display) {
        var target = main_msg_area.find('.' + type + ' span');
        var nb = waiting_for_display[type].length;
        var w = "nouvelle";

        if (type == 'update') {
            w = "modifiée";
        } else if (type == "delete") {
            w = "supprimée";
        }
        if (nb > 1) w += 's';
        var msg = ('00' + nb).slice(-3) + ' ' + w;

        target.text(msg);
    }
    main_msg_area.show();

};

var downloadArrivals = function () {
    window.location.reload();

};



function coop_init_datatable(params, data, domsel, cols, action_btn) {
    var buttons = [];
    var columns = [];


    columns.push({
        data: null,
        defaultContent: checkbox,
        orderDataType: "dom-checkbox",
        title: "Sél.",
        className: 'order_selector',
        width: '3%',
        targets:   0
    });
    $.each(cols, function(i, e) {
        columns.push(e);
    });

    columns.push({
        data: null,
        defaultContent: eye,
        orderable: false,
        width: "30px",
        className: 'action',
        targets:   0
    });
    columns.push({
        data: null,
        defaultContent: print_icon,
        orderable: false,
        width: "30px",
        className: 'action',
        targets:   0
    });

    columns.push({
        data: null,
        defaultContent: delete_icon,
        orderable: false,
        width: "30px",
        className: 'action',
        targets:   0
    });

    var settings = {
        dom: '<lf<t>ip><"clear"><B>',
        lengthMenu : [
            [
                50,
                100,
                150,
                200,
                -1
            ],
            [
                50,
                100,
                150,
                200,
                'Tout'
            ]
        ],
        pageLength : 50,
        buttons: buttons,

        columns: columns,
        //select: select ,
        rowId : "_id",
        data : data,
        language: {url : '/static/js/datatables/french.json'}
    };

    if (params) {
        if (params.page) {
            settings.displayStart = params.page.start;
        }
        if (params.ordering) {
            settings.order = params.ordering;
        }
    }

    return main_content.find('table'+domsel).DataTable(settings);
}
function init_and_fill_order_list() {

    dbc.allDocs({include_docs: true, descending: true}, function(err, resp) {
        if (err) {
            return console.log(err);
        }
        var data = [];

        $.each(resp.rows, function(i, e) {
            if (e.doc.state == 'init') {
                var date = new Date(parseInt(e.doc.init_time*1000, 10));

                e.doc.total = parseFloat(e.doc.total).toFixed(2);
                e.doc.h_init_date = format_date_to_sortable_string(date);
                data.push(e.doc);
            }
        });
        if (orders_table)
            orders_table.destroy();
        var cols = [
            {data: 'h_init_date', title: "Date init"},
            {data: 'partner.display_name', title: "Nom"},
            {data: 'best_date', title: "Livraison"}

        ];

        orders_table = coop_init_datatable(null, data, '.orders', cols);
    });


}

// Get the selected rows in the table
var getSelectedRows = function() {
    if (orders_table) {
        return orders_table.rows('.selected');
    } else {
        return null;
    }
};

// Set a row as selected : a row is selected if selection checkbox is checked
var selectRow = function() {
    var clicked = $(this);
    var cb = clicked.find('input[type="checkbox"]');

    if (cb.is(":checked")) {
        clicked.parent().addClass('selected');
    } else {
        clicked.parent().removeClass('selected');
    }

    // Display batch action selector & button if more than 1 row selected
    var selected = getSelectedRows();

    if (selected[0].length > 1) {
        $('#multiple_actions_container').slideDown('fast');
    } else {
        $('#multiple_actions_container').slideUp('fast');
    }
};

// Deselect rows from the table
var unselectRows = function(selected_rows) {
    for (row_id in selected_rows[0]) {
        var row = orders_table.row(row_id);

        $(row.node()).find('input[type="checkbox"]')
            .prop('checked', false);
        row.deselect();
    }
};

var removeRows = function(selected_rows) {
    selected_rows.remove().draw();
};

var updateCouchDB = function(data, callback) {
    var clicked = data.clicked;

    delete data.clicked;
    data.state_change_ts = format_date_to_sortable_string(new Date());

    dbc.put(data, function(err, result) {
        if (!err) {
            if (result.ok === true) {
                var r = clicked.parents('tr');

                data._rev = result.rev;
                orders_table.row(r).data(data)
                    .draw();
                rowUpdate(r, data);
            }
            callback(result);
        } else {
            callback(null);
            console.log(err);
        }
    });
};


var rowGetData = function(clicked) {
    var row = orders_table.row(clicked.parents('tr'));


    return row.data();
};



var printCart = function(cart_id, callback) {
    // Send request & diret download pdf
    var filename = "Commande_" + cart_id + ".pdf";

    $.ajax({
        url: "admin/print_cart",
        data: {id : cart_id}

        //TODO : find a way to test if answer is really a PDF (test with sucess: function(rData){...} -> download.bind doesn't work inside)
    })
        .done(download.bind(true, "pdf", filename))
        .always(function(rData) {
            callback(rData.split("\n").shift()
                .indexOf('%PDF-') == 0); // true returned data is a PDF doc
        });
};
var showCart = function() {
    var row = orders_table.row($(this).parents('tr'));
    var data = row.data();

    if (typeof data === "undefined") {
        data = arguments[0];
    }
    var cart = cart_details.clone();

    cart.find('.member').text(data.partner.display_name);
    var tbody = cart.find('tbody');

    $.each(data.products, function(i, e) {
        var tr = $('<tr>');

        tr.append($('<td>').text(e.name));
        tr.append($('<td>').text(e.qty));
        tr.append($('<td>').text(e.price));
        tbody.append(tr);
    });
    cart.append('<br>');
    cart.append('Info récupération : ' + data.best_date);

    openModal(
        cart.html(),
        function() {
            printCart(data._id, function(res) {
                if (res == false) {
                    //data retrieved was not a PDF
                }
            });
        },
        'Imprimer'
    );
};
var addMemberAndDateToMsg = function (msg, data) {
    var date = data.h_init_date;

    msg.find('.member').text(data.partner.display_name);
    msg.find('.date').text(date);
};

var deleteCart = function() {
    var clicked = $(this);
    var data = rowGetData(clicked);
    var msg = cart_destroy_msg.clone();

    addMemberAndDateToMsg(msg, data);

    if (data.best_date.length > 0)
        msg.find('.bdate').text(' , Info livraison : ' + data.best_date);

    openModal(
        msg.html(),
        function() {
        // Confirm button callback
            openModal();

            post_form(
                '/shop/admin/delete_cart',
                {cart_id: data._id},
                function(err, result) {
                    if (!err) {
                        if (typeof result.res !== "undefined" && typeof result.res.del_action !== "undefined") {
                            clicked.parents('tr').remove();
                            alert("Commande définitivement détruite");
                        } else {
                            console.log(result);
                        }

                    } else {
                        console.log(err);
                    }

                    closeModal();
                }
            );
        },
        'Détruire',
        false
    );

};

// Delete multiple orders
var batch_delete = function() {
    var selected_rows = getSelectedRows();

    if (selected_rows[0].length > 0) {
        var msg = multiple_carts_destroy_msg.clone();

        var rows_data = selected_rows.data();
        var carts_id = [];

        for (var i = 0; i < rows_data.length; i++) {
            carts_id.push(rows_data[i]._id);

            var msg_item = multiple_carts_item_destroy.clone();

            addMemberAndDateToMsg(msg_item, rows_data[i]);
            if (rows_data[i].best_date.length > 0)
                msg_item.find('.bdate').text(' , Info livraison : ' + rows_data[i].best_date);

            msg.find('.items').append(msg_item);
        }

        openModal(
            msg.html(),
            function() {
                // Confirm button callback
                if (is_time_to('delete_orders', 5000)) { // prevent double click or browser hic up bug
                    openModal();

                    post_form(
                        '/shop/admin/batch_delete_carts',
                        {carts_id: carts_id},
                        function(err, result) {
                            if (!err) {
                                if (typeof result.res !== "undefined" && result.res.length > 0) {
                                    removeRows(selected_rows);
                                    $('#multiple_actions_container').slideUp('fast');
                                    alert("Commandes définitivement détruites");
                                } else {
                                    console.log(result);
                                }

                            } else {
                                console.log(err);
                            }

                            closeModal();
                        }
                    );
                }
            },
            'Détruire',
            false
        );
    }
};



$(function() {
    if (coop_is_connected()) {
        init_and_fill_order_list();
        /* Make search accent insensitive */

        $(document).on('keyup', '#main_content input[type="search"]', function() {
            orders_table
                .search(jQuery.fn.DataTable.ext.type.search.string(this.value))
                .draw();
        });
        $(document).on('click', '.orders .fa-trash', deleteCart);
        $(document).on('click', '#download-arrivals', downloadArrivals);
        $(document).on('click', '#batch_action', function() {
            var action = $(this).parent()
                .find('#batch_action_select option:selected')
                .val();

            if (action == "delete") {
                batch_delete();
            }
        });

    }
});
