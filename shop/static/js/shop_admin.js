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
    if (doc.state != 'init') {
        var type = 'new';

        if (typeof doc._deleted == "undefined" && doc.state != "deleted") {
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
    }
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
    /*
    if (is_time_to('download_arrivals', 2000)) { // prevent double click or browser hic up bug
        try {
            displayMsg("Mise à jour en cours...")
            for (type in waiting_for_display) {
                var i = 0 // tp prevent infinite loop
                var elt = waiting_for_display[type].pop()
                while (elt  && i < 500) {
                    if (type == "new"){
                        orders_table.row.add(elt).draw()
                    } else {
                        var impacted_row = null
                        $.each(orders_table.rows(), function(i,r) {
                            var data = orders_table.row(r).data()
                            if (data._id == elt._id) impacted_row = r
                        })
                        if (impacted_row != null) {
                            if (type == "update") {
                                orders_table.row(impacted_row).data(elt).draw()
                            } else {
                                orders_table.row(impacted_row).remove().draw()
                                //impacted_row.remove()
                            }
                        }

                    }
                    elt = waiting_for_display[type].pop()
                    i += 1
                }

            }
            var all_empty = true
            for (type in waiting_for_display) {
                if (waiting_for_display[type].length > 0) all_empty = false
            }
            if (all_empty == true)
                main_msg_area.hide()
            else {
                console.log(waiting_for_display)
                updateArrivalsMsg()
            }
            closeModal()
        } catch(e) {
            closeModal()
            console.log(e)
        }
    }
    */
};

var rowUpdate = function (row, rdata) {
    //console.log(row, rdata)
    if (rdata.state === 'in_process' || rdata.state === 'ready' || rdata.state === 'paid') {
        $(row).find('td.take_it input')
            .prop('checked', true);
        if (rdata.state === 'ready' || rdata.state === 'paid') {
            var internal_ref = rdata.internal_ref || 'rien';

            $(row).find('td.ready input')
                .prop('checked', true);
            $(row).find('td.internal-ref')
                .text(internal_ref);
        }
        if (rdata.state === 'paid') {
            $(row).find('td.paid input')
                .prop('checked', true);
        }
    }
};

function coop_init_datatable(params, data, domsel, cols, action_btn) {
    var buttons = [];
    var columns = [];


    columns.push({
        data: null,
        defaultContent: checkbox,
        orderable: false,
        orderDataType: "dom-checkbox",
        title: "Sélection",
        className: 'order_selector',
        width: '3%',
        targets:   0
    });
    $.each(cols, function(i, e) {
        columns.push(e);
    });
    columns.push({
        data: null,
        defaultContent: checkbox,
        orderable: true,
        orderDataType: "dom-checkbox",
        title: "Pris en charge",
        className: 'take_it',
        targets:   0
    });
    columns.push({
        data: null,
        defaultContent: checkbox,
        orderable: true,
        orderDataType: "dom-checkbox",
        title: "Prêt",
        className: 'ready',
        targets:   0
    });
    columns.push({
        data: null,
        defaultContent: '',
        orderable: false,
        title: "Numéro",
        className: 'internal-ref',
        targets:   0
    });
    columns.push({
        data: null,
        defaultContent: checkbox,
        orderable: true,
        orderDataType: "dom-checkbox",
        title: "Réglé",
        className: 'paid',
        targets:   0
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
        language: {url : '/static/js/datatables/french.json'},
        createdRow: function(row, rdata, index) {
            rowUpdate(row, rdata);

        },
        initComplete: function() {
            /*
                                if (! coop_is_connected())
                                    $('#main_content input[type="search"]').attr('disabled','disabled')
                                */
        },
        order: [
            [
                3,
                'desc'
            ]
        ]
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
            if (e.doc.state != 'init' && e.doc.state != 'deleted') {
                try {
                    var timestamp = e.doc.submitted_time || e.doc.init_time || Date.now()/1000;

                    if (timestamp) {
                        var date = new Date(parseInt(timestamp*1000, 10));

                        e.doc.total = parseFloat(e.doc.total).toFixed(2);
                        e.doc.h_submitted_date = format_date_to_sortable_string(date);
                        data.push(e.doc);
                    } else {
                        console.log(e);
                    }
                } catch (error) {
                    console.log(error);
                    console.log(e);
                }
            }
        });
        if (orders_table)
            orders_table.destroy();
        var cols = [
            {data: 'h_submitted_date', title: "Date commande"},
            {
                data: 'type',
                title: "Type",
                width: "5%",
                render: function (data) {
                    if (data == 'delivery') {
                        return 'Livraison';
                    } else {
                        return 'Commande';
                    }
                }
            },
            {data: 'partner.display_name', title: "Nom"},
            {data: 'best_date', title: "Livraison"},
            {data: 'total', title: "Montant"}
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

var changeCartStateAndUpdateCDB = function(clicked, data, prev_state, state) {
    data.state = state;
    if (clicked.find('input:checked').length == 0) {
        data.state = prev_state;
    }
    data.clicked = clicked;
    updateCouchDB(data, function (res) {
        if (res) {
            if (res.ok === true) {
                cart_revisions[data._id] = res.rev;
                //data._rev = res.rev
                //orders_table.row(clicked.parents('tr')).data(data).draw(false)

            } else {
                //?? What to do
            }
        } else {
            console.log('erreur rencontré pendant maj couchdb');
        }

    });
};
var rowGetData = function(clicked) {
    var row = orders_table.row(clicked.parents('tr'));


    return row.data();
};
var takeCartInCharge = function() {
    var clicked = $(this);

    if (clicked.closest('th').length == 0) {
        var data = rowGetData(clicked);

        data.clicked = clicked;

        if (typeof data.printed === "undefined") {
            //Open modal message with print option
            showCart(data);
        }
        data.state = 'in_process';
        if (clicked.closest('tr').find('td.take_it input')
            .prop('checked') == false) {
            data.state = 'waiting';
        }

        updateCouchDB(data, function (res) {
            //What can be done if succes or error
        });


    }
};
var addMemberAndDateToMsg = function (msg, data) {
    var date = data.h_submitted_date;

    msg.find('.member').text(data.partner.display_name);
    msg.find('.date').text(date);
};
var putCartInReadyState = function() {
    var clicked = $(this);

    if (clicked.closest('th').length == 0) {
        var parent_tr = clicked.closest('tr');

        if (parent_tr.find('td.take_it input:checked').length > 0) {
            var data = rowGetData(clicked);
            var td_ready = parent_tr.find('td.ready input');

            if (td_ready.prop('checked') == false) { // was checked before click
                td_ready.prop('checked', true); // if user doesn't validate action
                openModal(
                    'Etes-vous sûr de vouloir déselectionner cette case ?',
                    function() {
                        td_ready.prop('checked', false);
                        changeCartStateAndUpdateCDB(clicked, data, 'in_process', 'in_process');
                    },
                    'Oui'
                );
            } else {
                var msg = internal_get_msg.clone();

                addMemberAndDateToMsg(msg, data);
                openModal(
                    msg.html(),
                    function() {
                        // Confirm button callback
                        var internal_ref = $('.mconfirm input[name="internal-ref"]');

                        if (internal_ref.val().length > 0) {
                            data.internal_ref = internal_ref.val();
                            parent_tr.find('td.internal-ref').text(data.internal_ref);
                            changeCartStateAndUpdateCDB(clicked, data, 'in_process', 'ready');
                        } else {
                            setTimeout(function() {
                                modal.css("width", "100%"); //modal div is closed after callback has been triggered
                                internal_ref.css({'border':'1px solid red', 'background-color':'#fcbbf4'}).focus();
                            }, 500);
                        }
                    }
                );
            }
        } else {
            clicked.find('input').prop('checked', false);
            alert("La commande doit avoir été prise en charge avant de la déclarée prête !");
        }
    }

};

var putCartInPaidState = function() {
    var clicked = $(this);

    if (clicked.closest('th').length == 0) {
        if (clicked.parents('tr').find('td.ready input:checked').length > 0) {
            var data = rowGetData(clicked);

            changeCartStateAndUpdateCDB(clicked, data, 'ready', 'paid');
        } else {
            clicked.find('input').prop('checked', false);
            alert("La commande doit avoir été déclarée prête avant de la déclarer payée !");
        }
    }
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
                            alert("Commande détruite");
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
                                    alert("Commandes détruites");
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

var setShopSettingsDom = function(shop_settings) {
    if (shop_settings != null) {
        if (typeof shop_settings.closing_dates !== "undefined") {
            if (shop_settings.closing_dates.length > 0) {
                $(document).find('#settings_shop_closed .no_dates')
                    .hide();

                $("#settings_shop_closed ul").html('');
                for (scd of shop_settings.closing_dates) {
                    $("#settings_shop_closed ul")
                        .append('<li class="closing_date_item"><span class="closing_date_value">'+scd+'</span> '+delete_icon+'</li>');
                }
                $(document).find('#settings_shop_closed .dates')
                    .show();
            } else {
                $(document).find('#settings_shop_closed .dates')
                    .hide();
                $(document).find('#settings_shop_closed .no_dates')
                    .show();
            }
        }
        if (typeof shop_settings.capital_message !== "undefined") {
            $('[name="capital_message"]').val(shop_settings.capital_message);
        }

    }
};

var getShopSettings = function() {
    shop_settings_content = $(document).find('#shop_settings_content');

    shop_settings_content.hide();
    putLoadingImgOn($(document).find('#tab_settings_content'));

    post_form(
        '/shop/admin/get_shop_settings',
        {},
        function(err, result) {
            if (!err) {
                if (typeof result.res.shop_settings !== "undefined") {
                    shop_settings = result.res.shop_settings;
                    setShopSettingsDom(shop_settings);
                } else {
                    alert('Les réglages n\'ont pas pu être récupérés, merci de réessayer plus tard.');
                    console.log(result);
                }
            } else {
                alert('Les réglages n\'ont pas pu être récupérés, merci de réessayer plus tard.');
                console.log(err);
            }

            shop_settings_content.show();
            removeLoadingImg();
        }
    );
};

var switchActiveTab = function() {
    var clicked = $(this);

    // Set tabs
    $(document).find('.tab')
        .removeClass('active');
    $(this).addClass('active');

    // Tabs content
    $(document).find('.tab_content')
        .hide();

    var tab = $(this).attr('id');

    if (tab == 'tab_settings') {
        $(document).find('#tab_settings_content')
            .show();

        // If shop_settings not set, fetch data
        if (shop_settings == null) {
            getShopSettings();
        }
    } else {
    // Default
        $(document).find('#tab_orders_content')
            .show();
    }
};

var addClosingDate = function() {
    var closing_date = $(document).find('#settings_shop_closed #closing_date_picker')
        .val();

    if (shop_settings != null && 'closing_dates' in shop_settings && shop_settings['closing_dates'].includes(closing_date)) {
        alert('Cette date est déjà présente dans les dates de fermeture.');
        $(document).find('#settings_shop_closed #closing_date_picker')
            .val('');

        return null;
    }

    if (closing_date != "") {
        openModal();

        post_form(
            '/shop/admin/add_shop_closing_date',
            {closing_date: closing_date},
            function(err, result) {
                if (!err) {
                    if (typeof result.res.shop_settings !== "undefined") {
                        shop_settings = result.res.shop_settings;
                        setShopSettingsDom(shop_settings);

                        $(document).find('#settings_shop_closed #closing_date_picker')
                            .val('');
                    } else {
                        console.log(result);
                    }
                } else {
                    alert('Les réglages n\'ont pas pu être récupérés, merci de réessayer plus tard.');
                    console.log(err);
                }

                closeModal();
            }
        );
    }
};

var saveMaxOrdersPerSlot = function() {
    var val_input = $('[name="new_max_orders_per_slot"]');
    var newVal = val_input.val();

    openModal();
    post_form(
        '/shop/admin/save_max_orders_ps',
        {nb: newVal},
        function(err, result) {
            if (!err) {
                if (typeof result.res.shop_settings !== "undefined") {
                    shop_settings = result.res.shop_settings;
                    $('.max-carts-per-slot .nb').text(shop_settings['max_timeslot_carts']);
                    val_input.val('');
                } else {
                    console.log(result);
                }
            } else {
                alert('La valeur n\'a pas pu être enregistrée, merci de réessayer plus tard.');
                console.log(err);
            }

            closeModal();
        }
    );
};

var saveCapitalMessage = function() {
    var text = $('[name="capital_message"]').val();

    openModal();
    post_form(
        '/shop/admin/save_capital_message',
        {text: text},
        function(err, result) {
            if (!err) {
                if (typeof result.res.shop_settings !== "undefined") {
                    console.log(result);
                } else {
                    console.log(result);
                }
            } else {
                alert('La valeur n\'a pas pu être enregistrée, merci de réessayer plus tard.');
                console.log(err);
            }

            closeModal();
        }
    );
};

var removeClosingDate = function() {
    var clicked = $(this);
    var closing_date = clicked.parent().find('.closing_date_value')
        .text();

    var msg = remove_closing_date_msg.clone();

    msg.find('.confirm_closing_date').text(closing_date);

    openModal(
        msg.html(),
        function() {
            // Confirm button callback
            if (is_time_to('remove_shop_closing_date', 5000)) { // prevent double click or browser hic up bug
                openModal();

                post_form(
                    '/shop/admin/remove_shop_closing_date',
                    {closing_date: closing_date},
                    function(err, result) {
                        if (!err) {
                            if (typeof result.res.shop_settings !== "undefined") {
                                shop_settings = result.res.shop_settings;
                                setShopSettingsDom(shop_settings);
                            } else {
                                console.log(result);
                            }
                        } else {
                            alert('Cette date n\'a pas pu être supprimée');
                            console.log(err);
                        }

                        closeModal();
                    }
                );
            }
        },
        'Supprimer',
        false
    );
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
        $(document).on('click', '.order_selector', selectRow);
        $(document).on('click', '.take_it', takeCartInCharge);
        $(document).on('click', '.ready', putCartInReadyState);
        $(document).on('click', '.paid', putCartInPaidState);
        $(document).on('click', '.fa-eye', showCart);
        $(document).on('click', '.orders .fa-trash', deleteCart);
        $(document).on('click', '.fa-print', function() {
            var clicked = $(this);
            var data = rowGetData(clicked);

            displayMsg('Génération du PDF.....');
            printCart(data._id, function(res) {
                if (res == true) {

                    openModal(
                        'Voulez-vous marquer la commande comme "Imprimée" (Prise en charge) ?',
                        function() {
                            data.printed = true;
                            data.state = 'in_process';
                            data.clicked = clicked;
                            updateCouchDB(data, function (res) {
                                //What can be done if succes or error
                            });
                        },
                        'Oui'
                    );
                }

            });
        });
        $(document).on('click', '#download-arrivals', downloadArrivals);
        $(document).on('click', '#batch_action', function() {
            var action = $(this).parent()
                .find('#batch_action_select option:selected')
                .val();

            if (action == "delete") {
                batch_delete();
            }
        });
        $(document).on('click', '.tabs .tab', switchActiveTab);
        $(document).on('click', '#add_closing_date', addClosingDate);
        $(document).on('click', '#settings_shop_closed .dates .fa-trash', removeClosingDate);
        $(document).on('click', '#save_max_orders_ps', saveMaxOrdersPerSlot);
        $(document).on('click', '#save_capital_message', saveCapitalMessage);

        // Set datepicker
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
            monthNamesShort: [
                'Jan',
                'Fev',
                'Mar',
                'Avr',
                'Mai',
                'Jun',
                'Jul',
                'Aou',
                'Sep',
                'Oct',
                'Nov',
                'Dec'
            ],
            dayNames: [
                'Dimanche',
                'Lundi',
                'Mardi',
                'Mercredi',
                'Jeudi',
                'Vendredi',
                'Samedi'
            ],
            dayNamesShort: [
                'Dim',
                'Lun',
                'Mar',
                'Mer',
                'Jeu',
                'Ven',
                'Sam'
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
            dateFormat: 'yy-mm-dd',
            firstDay: 1,
            minDate: 1,
            maxDate: '+12M +0D'
        };
        $.datepicker.setDefaults($.datepicker.regional['fr']);
        $("#closing_date_picker").datepicker();
    }
});
