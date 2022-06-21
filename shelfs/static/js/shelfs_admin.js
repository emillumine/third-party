var main_content = $('#main-content'),
    main_table_wrap = $('#main-table-wrap').html(),
    shelfs_table = null,
    create_form = $('#create_form'),
    shelf_id_input = create_form.find('input[name="shelf_id"]'),
    shelf_sort_order = create_form.find('input[name="sort_order"]'),
    shelf_name = create_form.find('input[name="name"]'),
    description = create_form.find('textarea[name="description"]'),
    eye = '<i class="fas fa-eye"></i>',
    delete_icon = '<i class="fas fa-trash p_action_icon"></i>',
    print_icon = '<i class="fas fa-print p_action_icon"></i>',
    add_icon = '<i class="fas fa-plus-circle"></i>',
    edit_icon = '<i class="fas fa-edit"></i>',
    download_icon = '<i class="fas fa-download"></i>',
    destroy_shelf_msg = $('#destroy-shelf-msg'),
    adding_pdts_tpl = $('#adding-products').clone()
        .removeAttr('id'),
    active_phase = 'main',
    add_pdts_btn_text = 'AJOUTER AU RAYON',
    add_to_shelf_product_ids = [],
    barcodes = null;


var deleteShelf = function() {
    var clicked = $(this);

    if (is_time_to('delete_shelf', 15000)) { // prevent double click or browser hic up bug
        var data = rowGetData(clicked);
        var msg = destroy_shelf_msg.clone();

        msg.find('span.shelf').text(data.name);
        openModal(
            msg.html(),
            function() {
                // Confirm button callback
                post_form(
                    '/shelfs/admin/delete',
                    {id: data.id},
                    function(err, result) {
                        if (!err) {
                            if (typeof result.res !== "undefined" && result.res == true) {
                                shelfs_table.row(clicked.parents('tr')).remove()
                                    .draw();

                                alert("Enregistrement détruit");
                            } else {
                                console.log(result);
                            }

                        } else {
                            console.log(err);
                        }
                    }
                );
            },
            'Détruire'
        );
    }
};

var create = function() {
    if (is_time_to('create_shelf', 5000)) { // prevent double click or browser hic up bug
        var shelf_name = modal.find('input[name="name"]'),
            sort_order = modal.find('input[name="sort_order"]'),
            description = modal.find('textarea[name="description"]');

        if (shelf_name.val().length == 0 && sort_order.val().length > 0)
            shelf_name.val(sort_order.val());
        if (shelf_name.val().length > 0 && sort_order.val().length > 0) {
            $('.mconfirm .btns').hide();
            box_load.show();
            post_form(
                '/shelfs/admin/create',
                {name: shelf_name.val(), description: description.val(), sort_order: sort_order.val()},
                function(err, rData) {
                    if (typeof(rData.res.id) !== "undefined") {
                        rData.res.p_nb = 0;
                        if (shelfs_table)
                            shelfs_table.row.add(rData.res).draw();
                        else init_and_fill_selfs_list(); // first shelf
                        closeModal();
                    } else {
                        msg = rData.res.error;
                        if (msg.indexOf("Num must be unique !") > -1) {
                            msg = "Ce numéro de rayon est déjà utilisé !";
                        }
                        alert(msg);
                    }
                    $('.mconfirm .btns').show();
                    box_load.hide();
                }

            );
        } else {
            alert("Champs obligatoires non remplis");
        }
    }
};

var open_create_form = function() {
    shelf_sort_order.attr('value', '');
    shelf_name.attr('value', '');
    description.text('');
    box_load.hide();

    openModal(create_form.html(), create, 'Confirmer', false);
};


var update_shelf = function() {
    if (is_time_to('update_shelf', 5000)) { // prevent double click or browser hic up bug
        var shelf_id = modal.find('input[name="shelf_id"]'),
            shelf_name = modal.find('input[name="name"]'),
            sort_order = modal.find('input[name="sort_order"]'),
            description = modal.find('textarea[name="description"]');

        if (shelf_name.val().length == 0 && sort_order.val().length > 0)
            shelf_name.val(sort_order.val());
        if (shelf_name.val().length > 0 && sort_order.val().length > 0) {
            $('.mconfirm .btns').hide();
            box_load.show();

            post_form(
                '/shelfs/admin/update',
                {
                    id: shelf_id.val(),
                    name: shelf_name.val(),
                    description: description.val(),
                    sort_order: sort_order.val()
                },
                function(err, rData) {
                    if (typeof(rData.res.id) !== "undefined") {
                        shelfs_table.rows().every(function () {
                            var data = this.data();

                            if (data.id == rData.res.id) {
                                rData.res.p_nb = data.p_nb;
                                this.data(rData.res).draw();
                            }

                            return 1;
                        });
                        closeModal();
                    } else alert(rData.res.error);

                    $('.mconfirm .btns').show();
                    box_load.hide();
                }
            );
        } else {
            alert("Champs obligatoires non remplis");
        }
    }
};

// Set update form in modal
var open_update_form = function() {
    var clicked = $(this);

    var shelf_data = rowGetData(clicked);

    shelf_id_input.attr('value', shelf_data.id);
    shelf_sort_order.attr('value', shelf_data.sort_order);
    shelf_name.attr('value', shelf_data.name);
    description.text(shelf_data.description);
    box_load.hide();

    openModal(create_form.html(), update_shelf, 'Mettre à jour', false);
};

var downloadInventoryReport = function() {
    if (is_time_to('download_inv_report', 3000)) { // prevent double click or browser hic up bug
        var clicked = $(this);

        var shelf_data = rowGetData(clicked);

        if (shelf_data['last_inventory_id'] != 0) {
            $.ajax({
                type: "GET",
                url: "/shelfs/"+ shelf_data['id'] +"/last_inventory_report",
                xhrFields: {
                    responseType: 'blob'
                },
                success: function (data, textStatus, request) {
                    var a = document.createElement('a');
                    var url = window.URL.createObjectURL(data);

                    a.href = url;
                    // Assuming headers are correctly set :
                    // -> Content-Disposition : attachment; filename="xxx"
                    a.download = request.getResponseHeader('Content-Disposition').split("\"")[1];
                    document.body.append(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                },
                error: function(data) {
                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                        console.log(data.responseJSON.error);
                    }
                    alert('Le fichier n\'a pas pu être récupéré, réessayez plus tard ou bien allez le chercher dans l\'inventaire Odoo.');
                }
            });
        }
    }
};

// TODO put datatable common methods such as following in a file useable for all modules
var rowGetData = function(clicked) {
    var row = shelfs_table.row(clicked.parents('tr'));


    return row.data();
};

function coop_init_datatable(params, data, domsel, cols) {
    var buttons = [];
    var columns = [];


    $.each(cols, function(i, e) {
        columns.push(e);
    });

    columns.push({
        data: null,
        defaultContent: add_icon,
        title: "Ajout produits",
        className: 'products',
        orderable: false,
        targets:   0
    });

    columns.push({
        data: null,
        defaultContent: edit_icon,
        title: "Modifier le rayon",
        className: 'action',
        orderable: false,
        targets:   0
    });

    columns.push({
        data: null,
        defaultContent: delete_icon,
        orderable: false,
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
        rowId : "id",
        data : data,
        language: {url : '/static/js/datatables/french.json'},
        initComplete: function() {
            /*
                                if (! coop_is_connected())
                                    $('#main_content input[type="search"]').attr('disabled','disabled')
                                */
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

    return main_content.find('table'+domsel).DataTable(settings);
}
var init_and_fill_selfs_list = function() {
    try {
        $.ajax({
            url :'/shelfs/all',
            dataType: 'json'
        })
            .done(function(rData) {
                if (rData.res && rData.res.length > 0) {
                    var cols = [
                        {data: 'sort_order', title: "Numéro"},
                        {data: 'name', title: "Nom"},
                        {data: 'description', title: "Description"},
                        {data: 'p_nb', title: "Nb pdts", className: "p_nb"},
                        {
                            data:"last_inventory_id",
                            title:"Rapport dernier inventaire",
                            className: "action",
                            render: function (data) {
                                if (typeof data != "undefined" && data != 0) {
                                    return download_icon;
                                } else {
                                    return "";
                                }
                            }
                        }

                    ];

                    if (shelfs_table)
                        shelfs_table.destroy();
                    shelfs_table = coop_init_datatable(null, rData.res, '.shelfs', cols);
                }
                //console.log(rData.res)

            });
    } catch (e) {
        console.log(e);
    }
};
var deleteBarcodeFromList = function () {
    let clicked = $(this);
    let new_pids_list = [];
    let tr_to_remove = clicked.closest('tr');
    let pid_to_remove = tr_to_remove.data('id');

    $.each(add_to_shelf_product_ids, function(idx, pid) {
        if (pid != pid_to_remove) new_pids_list.push(pid);
    });
    add_to_shelf_product_ids = new_pids_list;
    tr_to_remove.remove();
};
var is_product_in_shelf_adding_queue_list = function(testing_pid) {
    let found = false;

    $.each(add_to_shelf_product_ids, function(idx, pid) {
        if (pid == testing_pid) found = true;
    });

    return found;
};

var printProduct = function () {
    let clicked = $(this);
    let tr_to_print = clicked.closest('tr');
    let barcode = tr_to_print.data('bc');

    openModal();
    try {
        $.ajax({
            url: '/products/get_product_data',
            data: {'barcode': barcode}
        })
            .done(function(res) {
                var product = res.product;
                var product_tmpl_id = product.product_tmpl_id[0];

                $.ajax({
                    url: '/products/label_print/' + product_tmpl_id
                })
                    .done(function(res_print) {
                        closeModal();
                        if ("error" in res_print.res) {
                            console.log(res_print.res);
                            alert('Une erreur est survenue...');
                        } else {
                            alert('Impression lancée');
                        }
                    });
            });
    } catch (e) {
        closeModal();
        alert('Une erreur est survenue...');
    }

};

var addProductToList = async function(barcode) {
    if (barcodes == null) barcodes = await init_barcodes(); // May appens (after inactivity?)
    //Get Odoo corresponding barcode
    //(May be different due to weight encoded barcode)
    //It could also be a wrong reading one

    odoo_product = barcodes.get_corresponding_odoo_product(barcode);
    if (odoo_product === null) {
        alert(barcode + " : ce code-barre est inconnu, merci d'apporter le produit à un salarié.");
    } else {
        if (is_product_in_shelf_adding_queue_list(odoo_product.data[barcodes.keys.id])) {
            alert("Produit déjà présent dans la liste.");
        } else {
            add_to_shelf_product_ids.push(odoo_product.data[4]);
            var pdt_line = $('<tr>').attr('data-id', odoo_product.data[barcodes.keys.id])
                .attr('data-bc', odoo_product.barcode)
                .addClass('obc');

            $('<td>').text(barcode)
                .appendTo(pdt_line);
            $('<td>').text(odoo_product.barcode)
                .appendTo(pdt_line);
            $('<td>').text(odoo_product.data[barcodes.keys.name])
                .appendTo(pdt_line);
            $('<td>').html(odoo_product.data[barcodes.keys.list_price] + " €")
                .appendTo(pdt_line);
            $('<td>').html(delete_icon + " " + print_icon)
                .appendTo(pdt_line);
            adding_pdts_tpl.find('#added_products tbody').append(pdt_line);
            main_content.find('button.add-products').css('display', 'block')
                .html(add_pdts_btn_text);
        }
    }
};

var addProducts = async function() {
    var clicked = $(this);
    var data = rowGetData(clicked);

    if (barcodes == null) barcodes = await init_barcodes();
    add_to_shelf_product_ids = [];
    adding_pdts_tpl.find('.shelf').text(data.name + ' (num = ' + data.sort_order+')')
        .attr('data-shelfid', data.id);
    adding_pdts_tpl.find('#added_products tbody').empty();

    main_content.html(adding_pdts_tpl);
    active_phase = "adding_products";
    main_content.find('button.add-products').css('display', 'none');
    if (admin_ids.find(id => id == getCookie("uid"))) $('.add-search').show();

};

var recordProductsAddedShelf = function() {
    var to_add = adding_pdts_tpl.find('tr.obc');

    if (to_add.length > 0) {
        var barcodes = [];
        var id = main_content.find('.shelf').data('shelfid');

        to_add.each(function(i, e) {
            barcodes.push($(e).data('bc'));
        });

        if (is_time_to('add_pdts_to_shelf', 5000)) { // prevent double click or browser hic up bug
            main_content.find('button.add-products').html(loading_img);
            post_form(
                '/shelfs/admin/add_products',
                {bc: JSON.stringify(barcodes), shelf_id: id},
                function(err, rData) {
                    let msg = 'Echec';

                    if (typeof rData.res.added != "undefined") {
                        msg = "Ajout des produits réussi.";

                        if (typeof rData.res.missing != "undefined") {
                            msg += "\nSauf pour :";
                            rData.res.missing.forEach(function(bc) {
                                msg += "\n" + bc;
                            });
                        }
                        alert(msg);
                        backToMain();
                    } else {
                        if (typeof rData.res.error != "undefined")
                            msg = rData.res.error;
                        else if (typeof rData.res.msg != "undefined")
                            msg = rData.res.msg;
                        alert(msg);
                        main_content.find('button.add-products').html(add_pdts_btn_text);
                    }

                }
            );

        }
    }
};

var showProductsList = function() {
    var clicked = $(this);
    var data = rowGetData(clicked);

    if (is_time_to('add_pdts_to_shelf', 5000)) { // prevent double click or browser hic up bug

        try {
            $.ajax({
                url :'/shelfs/' + data.id + '/products',
                dataType: 'json'
            })
                .done(function(rData) {
                    if (typeof rData.res.data != "undefined" && rData.res.data.length > 0) {
                        var table = $('<table>').attr('border', '1');

                        $.each(rData.res.data, function(i, pdt) {
                            var tr = $('<tr>');
                            var td1 = $('<td>').css('width', '100px')
                                .text(pdt.barcode);
                            var td2 = $('<td>').css({'text-align':'left', 'padding-left':'10px'})
                                .text(pdt.name);

                            tr.append(td1);
                            tr.append(td2);
                            table.append(tr);
                        });
                        displayMsg(table.html());
                    }

                });
        } catch (e) {
            console.log(e);
        }

    }
};

var addSearchDisplay = function(action) {
    var isw = $('.input-search-wrapper');
    var open = $('.add-search .fa-eye');
    var close = $('.add-search .fa-eye-slash');

    if (action == 'show') {
        isw.show();
        open.hide();
        close.show();
    } else {
        isw.hide();
        open.show();
        close.hide();
    }
};
var processAddSearchInput = function() {
    //Basic process for now : append text as barcode to list
    addProductToList($('.input-search-wrapper input[name="kw"]').val());
};

var backToMain = function () {
    active_phase = 'main';
    main_content.html(main_table_wrap);
    init_and_fill_selfs_list();
};

$(document).ready(function() {
    if (coop_is_connected()) {
        $('#content_wrapper').show();
        $('#need_connect').hide();
        main_content.html(main_table_wrap);
        init_and_fill_selfs_list();
        /* Make search accent insensitive */

        $(document).on('keyup', '#main_content input[type="search"]', function() {
            shelfs_table
                .search(jQuery.fn.DataTable.ext.type.search.string(this.value))
                .draw();
        });

        $(document).on('click', 'button.create', open_create_form);
        $(document).on('click', '.shelfs .fa-edit', open_update_form);
        $(document).on('click', '.shelfs .fa-trash', deleteShelf);
        $(document).on('click', '.shelfs .fa-download', downloadInventoryReport);
        $(document).on('click', '.obc .fa-trash', deleteBarcodeFromList);
        $(document).on('click', '.obc .fa-print', printProduct);
        $(document).on('click', 'td.products .fa-plus-circle', addProducts);
        $(document).on('click', '#main-content button.add-products', recordProductsAddedShelf);
        $(document).on('click', 'td.p_nb', showProductsList);
        try {
            if (admin_ids.find(id => id == getCookie("uid"))) {
                $(document).on('click', '.add-search .fa-eye', function() {
                    addSearchDisplay('show');
                });
                $(document).on('click', '.add-search .fa-eye-slash', function() {
                    addSearchDisplay('hide');
                });
                $(document).on('click', '.input-search-wrapper button', processAddSearchInput);
            }
        } catch (e) {
            console.log(e);
        }

        $(document).pos();
        $(document).on('scan.pos.barcode', function(event) {
            //access `event.code` - barcode data
            var barcode = event.code;

            if (barcode.length >=13) {
                barcode = barcode.substring(barcode.length-13);
                //console.log(new Date().getTime() + ' ' + barcode)
            } else if (barcode.length == 12 && barcode.indexOf('0') !== 0) {
            // User may use a scanner which remove leading 0
                barcode = '0' + barcode;
            }


            if (active_phase == "adding_products") {
                addProductToList(barcode);
            }

        });

    }
});
