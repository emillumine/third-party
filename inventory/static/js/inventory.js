var admin_list_menu = $('#list_inventories');
var title = $('.header h1');
var main_content = $('#main_content');
var create_tpl = $('#admin_create_template');
var list_tpl = $('#admin_list_template');
var inventory_tpl = $('#inventory_filling');
var create_pdt_list_table = null;
var inventories_table = null;
var inventory_table = null;
var active_table = null;
var current_inventory = {_id: null, _rev: null};
var inventory_update_retries = 0;
var conflicts = [];
var online = true;
var first_db_display = null;
var focus_cell_value = null;

sync.on('change', function (info) {
    // handle change

    var refresh_products_inventory_list = false;
    var datatable_state = {};
    var incoming_products = [];

    $.each(info.change.docs, function(i, e) {
        if (e._id == current_inventory._id) {
            refresh_products_inventory_list = true;
            if (info.direction == "pull") {
                $.each(e.products, function(i, e) {
                    if (typeof(e.shelf_qty) != "undefined")
                        incoming_products.push(e);
                });
            }
        }
    });
    if (active_table) {
        var order = active_table.order();

        if (typeof (order[0][0]) != "undefined") {
            datatable_state.page = active_table.page.info();
            datatable_state.ordering = [
                order[0][0],
                order[0][1]
            ];
        }
    }
    if (info.direction == "push") {
        if (refresh_products_inventory_list === true)
            display_inventory_product_list(current_inventory._id, datatable_state);
    } else if (info.direction == "pull") {
        try {
            if (refresh_products_inventory_list === true) {

                msg = 'Changements externes ';
                msg += ' <button type="button" name="global_to_local_sync" class="btn--success">Recevoir</button>';
                // Looking for conflicts
                conflicts = [];
                $.each(get_current_product_table_local_modif(), function(i, e) {
                    $.each(incoming_products, function(j, p) {
                        if (e._id == p._id)
                            conflicts.push(p);

                    });
                });
                if (conflicts.length > 0) {
                    // Les valeurs de l'import et des saisies locales sont sommées
                    var local_modifications = getLocalModifications();
                    var current_inv_modif = local_modifications[current_inventory._id];

                    $.each(conflicts, function(i, e) {
                        $.each(current_inv_modif, function(j, p) {
                            if (p.id == e.id) {
                                var local_shelf_qty = local_stock_qty = imported_shelf_qty = imported_stock_qty = 0;
                                var empty_shelf = empty_stock = true;

                                if (current_inv_modif[j]['shelf_qty'].length > 0) {
                                    local_shelf_qty = parseFloat(current_inv_modif[j]['shelf_qty']);
                                    empty_shelf = false;
                                }


                                if (current_inv_modif[j]['stock_qty'].length > 0) {
                                    local_stock_qty = parseFloat(current_inv_modif[j]['stock_qty']);
                                    empty_stock = false;
                                }


                                if (e.shelf_qty.length > 0) {
                                    imported_shelf_qty = parseFloat(e.shelf_qty);
                                    empty_shelf = false;
                                }


                                if (e.stock_qty.length > 0) {
                                    imported_stock_qty = parseFloat(e.stock_qty);
                                    empty_stock = false;
                                }


                                current_inv_modif[j]['shelf_qty'] = local_shelf_qty + imported_shelf_qty;
                                current_inv_modif[j]['stock_qty'] = local_stock_qty + imported_stock_qty;
                                current_inv_modif[j]['delta'] =
                                current_inv_modif[j]['qty'] - (current_inv_modif[j]['shelf_qty'] + current_inv_modif[j]['stock_qty']);

                                if (empty_shelf == false) {
                                    current_inv_modif[j]['shelf_qty'] = current_inv_modif[j]['shelf_qty'].toFixed(2);
                                } else {
                                    current_inv_modif[j]['shelf_qty'] = '';
                                }
                                if (empty_stock == false) {
                                    current_inv_modif[j]['stock_qty'] = current_inv_modif[j]['stock_qty'].toFixed(2);
                                } else {
                                    current_inv_modif[j]['stock_qty'] = '';
                                }

                                current_inv_modif[j]['delta'] = current_inv_modif[j]['delta'].toFixed(2);

                            }
                        });

                    });

                    local_modifications[current_inventory._id] = current_inv_modif;
                    localStorage.setItem("inventories_modifications", JSON.stringify(local_modifications));

                }
                set_data_info_msg(msg, 'global');
            } else {
                // Something else than inventory product list shown or first loading on this browser

            }
        } catch (e) {
            console.log(e);
        }

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



function getLocalModifications() {
    local_modifications = localStorage.getItem("inventories_modifications") || '{}';

    return JSON.parse(local_modifications);
}

function get_jstree_json(data) {
    var json = [];

    $.each(data, function(i, e) {
        var node = {id: 'cat_'+e.id, text: e.name};

        if (typeof (e.children) != "undefined")
            node.children = get_jstree_json(e.children);
        json.push(node);
    });

    return json;
}

async function init_and_fill_jstree(data) {
    jstree_div = main_content.find('.jstree');
    var list = await get_jstree_json(data);

    jstree_div.jstree({
        "plugins" : [
            "wholerow",
            "checkbox"
        ],
        "core" : {
            "data" : [
                {
                    'id': 'cat_0',
                    'text': 'Ensemble',
                    'state' : {"opened" : true},
                    'children': list
                }
            ]
        }
    });

}

function print_shelf_labels() {
    products = [];
    create_pdt_list_table.rows().every(function (rowIdx, tableLoop, rowLoop) {
        var data = this.data();

        products.push({product_tmpl_id:data.product_tmpl_id});
    });
    products_shelf_label_print(products, function() {
        console.log('Appel terminé');
    });
}

function coop_init_datatable(params, data, domsel, cols, action_btn) {
    var buttons = [];
    var columns = [];
    var select = {
        style:    'os',
        selector: 'td:first-child'

    };

    if (action_btn) {
        buttons = [
            {
                extend: 'selected',
                text: 'Supprimer les sélectionnés',
                action: function (e, dt, button, config) {
                    dt.rows({selected: true}).remove()
                        .draw();

                }
            },
            {
                extend: 'selected',
                text: 'Ne garder que les sélectionnés',
                action: function (e, dt, button, config) {
                    dt.rows({selected: false}).remove()
                        .draw();

                }
            }
        ];

        buttons.push(action_btn);
        buttons.push({
            text: 'Imprimer Etiquettes Rayons',
            action : function(e, dt) {
                if (dt.rows().indexes().length > 0)
                    openModal("Lancer l'impression ?", print_shelf_labels, 'Imprimer');
                else
                    alert("Impossible, il n'y a aucun produit !");

            }
        });
        columns = [
            {
                data: null,
                defaultContent: '',
                orderable: false,
                className: 'select-checkbox',
                targets:   0
            }
        ];
        select.style = 'multi';

    }
    if (coop_is_connected()) {
        buttons.push('csvHtml5');
    }

    $.each(cols, function(i, e) {
        columns.push(e);
    });
    var settings = {
        dom: '<lf<t>ip><"clear"><B>',
        lengthMenu : [
            [
                10,
                25,
                50,
                100,
                -1
            ],
            [
                10,
                25,
                50,
                100,
                'Tout'
            ]
        ],
        buttons: buttons,

        columns: columns,
        select: select,
        rowId : "id",
        data : data,
        language: {url : '/static/js/datatables/french.json'},
        createdRow: function(row, rdata, index) {
            if (coop_is_weighted_product(rdata) === true) {
                $(row).addClass("to_weight");
            }
        },
        initComplete: function() {
            if (! coop_is_connected())
                $('#main_content input[type="search"]').attr('disabled', 'disabled');

        }
    };

    if (params) {
        if (params.page) {
            settings.displayStart = params.page.start;
        }
        if (params.ordering) {
            settings.order = params.ordering;
        }
    }
    active_table = main_content.find('table'+domsel).DataTable(settings);

    return active_table;
}

function update_products_qties_for_global(doc) {
    dbc.put(doc, function(err, result) {
        if (err) {
            console.log(err);
            //get new rev and submit again
            if (inventory_update_retries < 5) {
                dbc.get(current_inventory._id, function(err, rdoc) {
                    if (err) {
                        console.log(err);
                        // What can be done here ?
                    } else {
                        doc._rev = rdoc._rev;
                        inventory_update_retries++;
                        setTimeout(function() {
                            update_products_qties_for_global(doc);
                        }, coop_get_random(10, 700));
                    }
                });
            } else {
                alert('Problème avec CouchDB !');
            }
        } else {
            inventory_update_retries = 0;
            reset_current_product_table_local_modif();
            set_data_info_msg('Mise à jour effectuée', 'local');
            main_content.find('td').removeClass('highlight');
        }
    });
}

function make_local_to_global_sync() {
    // Get current_inventory._id
    dbc.get(current_inventory._id, function(err, doc) {
        if (err) {
            console.log(err);

        } else {
            var modified_products = get_current_product_table_local_modif();
            var retrieved_products = doc.products;
            var i = 0;

            $.each(retrieved_products, function(i, e) {
                if (typeof (modified_products[e.id]) !== "undefined") {
                    doc.products[i].shelf_qty = modified_products[e.id].shelf_qty;
                    doc.products[i].stock_qty = modified_products[e.id].stock_qty;
                }
                i++;
            });
            update_products_qties_for_global(doc);
        }
    });
}

function make_global_to_local_sync() {
    var datatable_state = {};

    if (active_table) {
        var order = active_table.order();

        if (typeof (order[0][0]) != "undefined") {
            datatable_state.page = active_table.page.info();
            datatable_state.ordering = [
                order[0][0],
                order[0][1]
            ];
        }

    }

    display_inventory_product_list(current_inventory._id, datatable_state);
}

function init_and_fill_inventories_list() {

    dbc.allDocs({include_docs: true, descending: true}, function(err, resp) {
        if (err) {
            return console.log(err);
        }
        var data = [];
        var is_one_opened = false;

        $.each(resp.rows, function(i, e) {
            if (e.doc.state == 'opened') {
                is_one_opened = true;
            }
        });
        $.each(resp.rows, function(i, e) {
            var available_actions = '';

            if (e.doc.state == 'draft') {
                if (is_one_opened === false)
                    available_actions = '<button type="button" class="btn--success start">Commencer</button>';
            } else if (e.doc.state == 'opened') {
                available_actions+= '<button type="button" class="btn--primary fill">Remplir</button>';
                available_actions+= '<button type="button" class="btn--success end">Clore</button>';
            } else if (e.doc.state == 'closed') {

                available_actions+= '<button type="button" class="btn--success push">M.A.J stocks Odoo</button>';
            } else if (e.doc.state == 'completed') {
                available_actions = '<button type="button" class="btn--info report">Rapport</button>';
            }
            data.push({id: e.id, name: e.doc.name, pdts_num:e.doc.products.length, state: e.doc.state, action: available_actions});
        });

        if (inventories_table)
            inventories_table.destroy();

        var cols = [
            {data: 'name', title: "Nom"},
            {data: 'pdts_num', title: "Nb articles"},
            {data: 'state', title: "Etat"},
            {data: 'action', title: "Action"}
        ];

        inventories_table = coop_init_datatable(null, data, '.inventories', cols);
    });


}

function update_inventory(obj) {
    dbc.put(obj, function(err, result) {
        if (err) {
            console.log(err);
        } else {
            console.log('Update fait');
            admin_list_menu.click();
        }
    });
}
function update_inventory_state(id, newstate) {
    dbc.get(id, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            doc.state = newstate;
            update_inventory(doc);
        }

    });

}

function record_inventory() {
    var selected_products= [];

    create_pdt_list_table.rows().every(function (rowIdx, tableLoop, rowLoop) {
        var data = this.data();

        selected_products.push(data);
    });
    var name = $('input[name="inventory_name"]').val();
    var now = new Date();

    if (name == '') {


        name = getCookie("uid") + '_' + now.toISOString();
    }
    var inventory = {
        _id: now.getTime().toString(),
        name: name,
        products: selected_products,
        state: 'draft'
    };

    dbc.put(inventory, function callback(err, result) {
        if (!err) {
            //alert('Enregistrement réussi !');
            admin_list_menu.click();

        } else {
            alert('Enregistrement impossible !');
            console.log(err);
        }
    });

}

function create_inventory(cats) {
    post_form(
        'create_inventory',
        {
            'cats': JSON.stringify(cats)
        },
        function(err, result) {
            //console.log(result);
            if (typeof (result.products) != "undefined") {
                main_content.find('.loading').hide();
                main_content.find('.dataTables_wrapper').show();
                data = [];
                var products = result.products;

                for (k in products) {
                    //console.log(products[k])
                    data.push({
                        id: products[k]['id'],
                        name: products[k]['name'],
                        qty:products[k]['qty'],
                        barcode: products[k]['barcode'],
                        product_variant_count: products[k]['product_variant_count'],
                        product_tmpl_id: products[k]['product_tmpl_id'],
                        uom_id: products[k]['uom_id']
                    });
                }

                //console.log(data);
                if (create_pdt_list_table)
                    create_pdt_list_table.destroy();

                var action_btn = {
                    text: 'Ouvrir une opération avec ces produits',
                    action : function(e, dt) {
                        if (dt.rows().indexes().length > 0)
                            openModal($('#new_inventory_form_template').html(), record_inventory, 'Enregistrer');
                        else
                            alert("Impossible, il n'y a aucun produit !");

                    }
                };
                var cols = [
                    {data: 'barcode', title: "Code-barre"},
                    {data: 'name', title: "Nom"},
                    {data: 'qty', title: "Qté"},
                    {data: 'product_variant_count', visible: false},
                    {data: 'product_tmpl_id', visible: false},
                    {data: 'uom_id', visible: false}
                ];

                create_pdt_list_table = coop_init_datatable(null, data, '.pdt_liste_for_creation', cols, action_btn);

            }


        }
    );
}

function get_current_product_table_local_modif() {
    current_table_lm = {};
    local_modifications = getLocalModifications();
    if (typeof (local_modifications[current_inventory._id]) !== "undefined") {
        current_table_lm = local_modifications[current_inventory._id];
    }

    return current_table_lm;
}

function reset_current_product_table_local_modif() {
    local_modifications = localStorage.getItem("inventories_modifications") || '{}';
    local_modifications = JSON.parse(local_modifications);
    if (typeof (local_modifications[current_inventory._id]) !== "undefined") {
        delete local_modifications[current_inventory._id];
        localStorage.setItem("inventories_modifications", JSON.stringify(local_modifications));
    }
}
function set_data_info_msg(msg, type) {
    $('#main_content .'+ type +'-data-info').html(msg)
        .show();
}

function highlight_non_sync_qty(pids) {
    main_content.find('td').removeClass('highlight');
    for (i in pids) {
        main_content.find('tr#'+pids[i]).addClass('highlight');
    }
}
function update_local_data_info_msg() {
    if (current_inventory._id) {
        local_modifications = get_current_product_table_local_modif();
        var product_ids = Object.keys(local_modifications);
        var not_sync_changes = product_ids.length;

        if (not_sync_changes > 0) {
            var msg = not_sync_changes + ' produit';

            if (not_sync_changes > 1)
                msg += 's';

            msg += ' à synchroniser';
            msg += ' <button type="button" name="local_to_global_sync" class="btn--success">Envoyer</button>';
            set_data_info_msg(msg, 'local');
            highlight_non_sync_qty(product_ids);
        }

    }
}

function update_product_inventory_quantities(updatedCell, updatedRow, oldValue) {
    if (updatedCell.data().length > 0) {
        // Update inventory products
        local_modifications = getLocalModifications();

        var row = updatedRow.data();

        row.shelf_qty = row.shelf_qty.toString().replace(/,/, '.');
        row.stock_qty = row.stock_qty.toString().replace(/,/, '.');
        if (typeof (local_modifications[current_inventory._id]) == "undefined") {
            local_modifications[current_inventory._id] = {};

        }
        local_modifications[current_inventory._id][row.id] = row;

        localStorage.setItem("inventories_modifications", JSON.stringify(local_modifications));
        q_elts = compute_product_qties_and_delta(row);
        main_content.find('tr#'+row.id+' .delta').text(q_elts[2]);
        update_local_data_info_msg();
    }
}

function compute_product_qties_and_delta(local_p) {
    delta = '';
    found = 0;
    sh_qty = parseFloat(local_p.shelf_qty);
    st_qty = parseFloat(local_p.stock_qty);

    if (isNaN(sh_qty)) {
        sh_qty = '';
    } else {
        found = sh_qty;
    }
    if (isNaN(st_qty)) {
        st_qty = '';
    } else {
        found += st_qty;
    }

    delta = found - parseFloat(local_p.qty);

    return [
        sh_qty,
        st_qty,
        delta.toFixed(2)
    ];
}

function update_odoo_stock(doc_id) {
    openModal(
        "Avant de procéder à la mise à jour des stocks,<br/> assurez-vous que tous les postes utilisés pour l'inventaire <b>ont bien synchronisé les données</b> saisies.<br /><img src=\"/static/img/loading-gear-8.gif\" style=\"display:none;\"/>",
        function() {
            modal.find('img').show();
            btn_nok.off('click');
            btn_ok.off('click');
            post_form(
                'update_odoo_stock',
                {
                    doc_id: doc_id
                },
                function(err, result) {
                    if (result.action.missed.length == 0) {
                        update_inventory_state(doc_id, 'completed');
                        init_and_fill_inventories_list();
                    }
                    closeModal();
                }
            );
        },
        'Mettre à jour',
        false
    );
}

function display_inventory_product_list(id, params) {
    title.text('Saisie inventaire');
    main_content.html(inventory_tpl.html());

    dbc.get(id, function(err, doc) {
        if (err) {
            console.log(err);

        } else {
            current_inventory._rev = doc._rev;
            current_inventory._id = doc._id;
            var data = [];

            local_modifications = get_current_product_table_local_modif();

            $.each(doc.products, function(i, e) {
                var sh_qty = '';
                var st_qty = '';
                var delta = '';
                var ref_prod = null;
                var recount = '';

                if (typeof (local_modifications[e.id]) !== "undefined") {
                    ref_prod = local_modifications[e.id];
                } else if (typeof (e.shelf_qty) !== "undefined") {
                    ref_prod = e;
                }

                if (ref_prod) {
                    var q_elts = compute_product_qties_and_delta(ref_prod);

                    sh_qty = q_elts[0];
                    st_qty = q_elts[1];
                    delta = q_elts[2];
                }

                data.push({id: e.id, barcode: e.barcode, name: e.name, qty: e.qty, shelf_qty: sh_qty, stock_qty: st_qty, delta:delta, recount:recount});
            });

            if (inventory_table) {
                inventory_table.MakeCellsEditable("destroy");
                inventory_table.destroy();
            }

            var cols = [
                {data: 'barcode', title: "Code-barre", className: 'barcode'},
                {data: 'name', title: "Nom", className: 'name'},
                {data: 'qty', title: "Qté"},
                {data: 'shelf_qty', title: "Rayon", className: 'shelf_qty'},
                {data: 'stock_qty', title: "Stock", className: 'stock_qty'},
                {data: 'delta', title: "Delta", className: 'delta'}
            ];
            var editable_cols = [
                3,
                4
            ];

            if (coop_is_connected()) {
                cols.push({data: 'recount', title: 'Recompter'});
                //editable_cols.push(6)
            }

            inventory_table = coop_init_datatable(params, data, '.inventory', cols);

            inventory_table.MakeCellsEditable({
                inputCss: 'editable-cell',
                columns: editable_cols,
                onUpdate: update_product_inventory_quantities,
                confirmationButton: {listenToKeys: true, confirmCss: 'hidden', cancelCss: 'hidden'}
            });

            update_local_data_info_msg();

        }

    });

}



function show_opened_inventory() {

    dbc.allDocs({include_docs: true, descending: true}, function(err, resp) {
        if (first_db_display == null)
            first_db_display = new Date().getTime();
        if (err) {
            return console.log(err);
        }
        var id = null;

        $.each(resp.rows, function(i, e) {
            if (e.doc.state == 'opened') {
                id = e.id;
            }
        });
        if (id) {
            display_inventory_product_list(id);
        } else {
            set_data_info_msg('Aucun inventaire en cours', 'local');
        }
    });

}






/* Make search accent insensitive */

$(document).on('keyup', '#main_content input[type="search"]', function() {
    active_table
        .search(jQuery.fn.DataTable.ext.type.search.string(this.value))
        .draw();
});


$('#create_inventory').click(function() {
    $('.header h1').text('Créer (ouvrir) un inventaire');
    main_content.html(create_tpl.html());
    $.ajax('get_product_categories').done(function(rData) {
        init_and_fill_jstree(rData);


    });
});

$('#raz_archived').click(function() {
    openModal(
        "Le stock des produits archivés sera mis à 0.<br/><img src=\"/static/img/loading-gear-8.gif\" style=\"display:none;\"/>",
        function() {
            modal.find('img').show();
            btn_nok.off('click');
            btn_ok.off('click');
            post_form(
                'raz_archived_stock',
                {},
                function(err, result) {
                    console.log(result);
                    closeModal();
                }
            );
        },
        'Mettre à jour',
        false
    );
});
$('#raz_not_saleable').click(function() {
    openModal(
        "Le stock des produits non vendables sera mis à 0.<br/><img src=\"/static/img/loading-gear-8.gif\" style=\"display:none;\"/>",
        function() {
            modal.find('img').show();
            btn_nok.off('click');
            btn_ok.off('click');
            post_form(
                'raz_not_saleable',
                {},
                function(err, result) {
                    console.log(result);
                    closeModal();
                }
            );
        },
        'Mettre à jour',
        false
    );
});


$(document).on('click', '#main_content .create_from_cat_selection', function() {
    var selected = main_content.find('.jstree').jstree('get_selected');

    if (selected.length > 0) {
        main_content.find('.loading').show();
        main_content.find('.dataTables_wrapper').hide();
        create_inventory(selected);
    }
});

$(document).on('click', '#main_content .inventories button', function() {
    var clicked = $(this);
    var doc_id = clicked.closest('tr').attr('id');

    if (clicked.hasClass('start')) {
        update_inventory_state(doc_id, 'opened');
    } else if (clicked.hasClass('report')) {
        //
        alert('Rapport: fonctionnalité en construction');
    } else if (clicked.hasClass('fill')) {
        display_inventory_product_list(doc_id);
    } else if (clicked.hasClass('end')) {
        update_inventory_state(doc_id, 'closed');
    } else if (clicked.hasClass('push')) {
        update_odoo_stock(doc_id);
    }
});

$(document).on('click', '#main_content button[name="local_to_global_sync"]', make_local_to_global_sync);
$(document).on('click', '#main_content button[name="global_to_local_sync"]', make_global_to_local_sync);

admin_list_menu.click(function() {
    title.text('Listes des inventaires');
    main_content.html(list_tpl.html());
    init_and_fill_inventories_list();

});

$(document).pos();
$(document).on('scan.pos.barcode', function(event) {
    //access `event.code` - barcode data
    var barcode = event.code;

    if (barcode.length >=13) {
        barcode = barcode.substring(barcode.length-13);
        //console.log(new Date().getTime() + ' ' + barcode)


        var focused = $(':focus');

        if (focused.hasClass('editable-cell')) {
            focus_cell_value = focused.val();
            focused.val(focus_cell_value.replace(barcode, ''));
            focused.updateEditableCell(focused.get(0));
        }
        active_table.search(barcode).draw();
        var t_info = active_table.page.info();

        if (t_info.recordsDisplay == 0) {
            // Poids / prix variables ? -> test again with less figures
            barcode = barcode.substring(0, 8);
            active_table.search(barcode).draw();
        }
    } else {
        console.log(new Date().getTime() + ' -> '+barcode);
    }

});

if (!coop_is_connected()) {
    show_opened_inventory();
}