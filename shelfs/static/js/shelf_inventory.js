/*
Cette page traite l'inventaire d'un rayon ou d'une liste personnalisée de produits.
Un objet 'shelf' peut donc ici être un rayon, ou une liste personnalisée.

Sémantiquement, ici  :
  list_to_process représente la liste des produits à inventorier
  list_processed la liste des produit déjà inventoriés
*/

var validation_msg = $('#validation_msg'),
    inventory_validated_msg = $('#inventory_validated'),
    process_all_items_msg = $('#process_all_items_msg'),
    faq_content = $("#FAQ_modal_content"),
    issues_reporting = $("#issues_reporting"),
    add_product_form = $("#add_product_form"),
    change_shelf_form = $("#change_shelf_form"),
    change_shelf_btn = $('#change_shelf_btn');

var shelf = null,
    parent_location = '/shelfs',
    originView = "shelf", // or custom_list (create from order view)
    list_to_process = [],
    table_to_process = null,
    table_processed = null,
    editing_item = null, // Store the item currently being edited
    editing_origin = "", // Keep track of where editing_item comes from
    processed_row_counter = 0, // Keep count of the order the item were added in processed list
    search_chars = [],
    user_comments = '',
    adding_product = false, // True if modal to add a product is open.
    barcodes = null, // Barcodes stored locally
    // datetime for which shelf's ongoing_inv_start_datetime is considered null
    default_inventory_start_datetime = "0001-01-01 00:00:00",
    selected_products_for_shelf_change = [],
    all_shelfs = null; // Use get_all_shelfs to access it's value


/* UTILS */

// polyfill to check for safe integers: Number method not supported by all browsers
Number.isInteger = Number.isInteger || function(value) {
    return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value;
};
if (!Number.MAX_SAFE_INTEGER) {
    Number.MAX_SAFE_INTEGER = 9007199254740991; // Math.pow(2, 53) - 1;
}
Number.isSafeInteger = Number.isSafeInteger || function (value) {
    return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
};



function back() {
    document.location.href = parent_location;
}

function get_added_qties_sum(item) {
    let total = null;

    function add(accumulator, a) { // for array sum
        result = 0;
        if (a) {
            if (item.uom_id[1] == "kg") {
                if (typeof a === "string") {
                    a = a.replace(',', '.');
                }
                result = parseFloat(accumulator) + parseFloat(a);
                result = result.toFixed(3);
            } else {
                result = parseInt(accumulator, 10) + parseInt(a, 10);
            }
        }

        return result;
    }
    if (typeof item.added_qties != "undefined" && item.added_qties.length > 0) {
        total = item.added_qties.reduce(add);
    }


    return total;
}
function barcode_analyzer(chars) {
    let barcode = chars;

    if (barcode && barcode.length >=13) {
        barcode = barcode.substring(barcode.length-13);
    } else if (barcode && barcode.length == 12 && barcode.indexOf('0') !== 0) {
    // User may use a scanner which remove leading 0
        barcode = '0' + barcode;
    } else {
    //manually submitted after correction
        var barcode_input = $('#search_input');

        barcode = barcode_input.val();
    }

    document.getElementById('search_input').value = '';
    $('table.dataTable').DataTable()
        .search('')
        .draw();

    // If modal to add a product is open
    if (adding_product) {
        $('input.add_product_input').val(barcode);
        do_add_product();
    } else {
        select_product_from_bc(barcode);
    }
}

/**
 * Option to display an icon next to edition input to cancel last value.
 * Disabled for now. Look for #reset_to_previous_qty to restore.
 *
 * WARNING: if you restore this functionality, update validateEdition() so
 *  canceling last value is ignored if edition_cancel is pressed.
 */
// function reset_previous_value() {
//     if (editing_item !== null) {
//         if (typeof editing_item.added_qties !== "undefined") {
//             editing_item.qty -= editing_item.added_qties.pop();
//         }
//         $('#edition_input').val(editing_item.qty);
//         $("#reset_to_previous_qty").hide();
//     }
// }

function refresh() {
    location.reload();
}

// Directly send a line to edition when barcode is read
function select_product_from_bc(barcode) {
    var found = null,
        qty = null;

    if (isValidEAN13(barcode)) {
        var scannedProduct = barcodes.get_corresponding_odoo_product(barcode);

        if (scannedProduct === null) {
            alert("Le code-barre " + barcode + " ne correspond à aucun article connu.");

            return -1;
        } else {
            barcode = scannedProduct.barcode;
            if (scannedProduct.rule.length > 0 && scannedProduct.rule != "product") {
                qty = scannedProduct.qty;
            }
        }
    }

    if (editing_item === null) {

        $.each(list_to_process, function(i, e) {
            if (e.barcode == barcode) {
                found = e;
                editing_origin = 'to_process';
            }
        });

        if (typeof shelf != 'undefined' && typeof shelf.list_processed != 'undefined') {
            $.each(shelf.list_processed, function(i, e) {
                if (e.barcode == barcode) {
                    found = e;
                    if (qty) {
                        let message = "Attention, ce produit a déjà été compté.\n";

                        message += "La quantité " + qty + " n'a pas été ajoutée !\n";
                        // temporary add read qty and recorded one to added_qties to compute sum
                        found.added_qties = [
                            qty,
                            found.qty
                        ];
                        message += "Le total serait " + get_added_qties_sum(found);
                        alert(message);
                        qty = null;
                    }

                    editing_origin = 'processed';
                }
            });
        }

        if (found !== null) {
            delete found.added_qties;
            setLineEdition(found, qty);
            if (editing_origin === 'to_process') {
                let row = table_to_process.row($('tr#'+found.id));

                remove_from_toProcess(row);
            } else {
                let row = table_processed.row($('tr#'+found.id));

                remove_from_processed(row);
            }
        } else {
            console.log('Code barre introuvable');
        }
    } else if (barcode == editing_item.barcode && qty) {
        // We scan the same product as the current one
        let edition_input = $('#edition_input');

        if (typeof editing_item.added_qties == "undefined") {
            editing_item.added_qties = [edition_input.val()];
        }
        editing_item.added_qties.push(qty);
        // TODO : add an action icon to view added quantities
        editing_item.qty = get_added_qties_sum(editing_item);
        edition_input.val(editing_item.qty);
    }
}

/*
  To make an element blink:
  Call this function on an element so blinking is handled
  Then simply add 'blink_me' class on the element to make it blink
*/
function handle_blinking_effect(element) {
    element.addEventListener('animationend', onAnimationEnd);
    element.addEventListener('webkitAnimationEnd', onAnimationEnd);

    function onAnimationEnd() {
        element.classList.remove('blink_me');
    }
}


/* EDITION */

// When edition event is fired
function edit_event(clicked) {
    // Remove from origin table
    var row_data = null;

    if (editing_origin == 'to_process') {
        let row = table_to_process.row(clicked.parents('tr'));

        row_data = row.data();

        remove_from_toProcess(row);
    } else {
        let row = table_processed.row(clicked.parents('tr'));

        row_data = row.data();

        remove_from_processed(row);
    }

    // Product goes to editing
    setLineEdition(row_data);

    // Reset search
    $('#search_input').val('');
    $('table.dataTable').DataTable()
        .search('')
        .draw();
    search_chars = [];
}

// Set edition area
/**
 * If qty is not null, it comes from barcode reading result
 * */
function setLineEdition(item, qty) {
    var edition_input = $('#edition_input'),
        set_focus = true;

    editing_item = item;
    $('#product_name').text(editing_item.name);
    $('#product_uom').text(editing_item.uom_id[1]);

    if (editing_item.uom_id[0] == 1) { // Unit
        edition_input.attr('type', 'number').attr('step', 1)
            .attr('max', 9999);
    } else {
        edition_input.attr('type', 'number').attr('step', 0.001)
            .attr('max', 9999);
    }

    if (qty) {
        /*
            To prevent futur data mess if someone scans barcode while focus is on edition input
            qty is stored in editing_item object

        */
        editing_item.qty = qty;
        edition_input.val(qty);
        set_focus = false;
    }
    // If item is reprocessed, set input with value
    if (editing_origin == 'processed') {
        edition_input.val(editing_item.qty);
    }
    if (set_focus === true)
        edition_input.focus();

    // Make edition area blink when edition button clicked
    container_edition.classList.add('blink_me');
}

// Clear edition
function clearLineEdition() {
    editing_item = null;

    $('#product_name').text('');
    $('#edition_input').val('');
    $('#search_input').focus();
    // $("#reset_to_previous_qty").hide();
}

/**
 * Validate product edition.
 * Keep track of every qty change.
 */
function validateEdition() {
    if (editing_item != null) {
        const current_val = $("#edition_input").val();

        // Let's verify if quantity have been changed
        if (current_val != editing_item.qty) {
            if (typeof editing_item.added_qties !== "undefined") {
                // total may have been affected by manual typing
                const total = get_added_qties_sum(editing_item);

                if (current_val != total) {
                    // add difference in added_qties array
                    editing_item.added_qties.push(current_val - total);
                }
            } else {
                // Init added_qties to take change into account
                editing_item.added_qties = [
                    editing_item.qty,
                    current_val - editing_item.qty
                ];
            }
        }

        editing_item.qty = current_val;

        if (editProductInfo(editing_item)) {
            clearLineEdition();
        }
    }
}

/**
 * Unselect all rows from datatable
 * Only for table_to_process
 */
function unselect_all_rows() {
    $("#select_all_products_cb").prop("checked", false);

    table_to_process.rows().every(function() {
        const node = $(this.node());

        node.removeClass('selected');
        node.find(".select_product_cb").first()
            .prop("checked", false);

        return 0;
    });

    selected_rows = [];
}
/*
 * Update a product info and add it to processed items.
 * If 'value' is set, use it as new value.
*/
function editProductInfo (productToEdit, value = null) {
    // If 'value' parameter not set, get value from edition input
    var newValue = (value == null) ? parseFloat($('#edition_input').val()
        .replace(',', '.')) : value;

    // If uom is unit, prevent float
    if (productToEdit.uom_id[0] == 1 && !Number.isSafeInteger(newValue)) {
        alert('Vous ne pouvez pas rentrer de chiffre à virgule pour des produits à l\'unité');

        return false;
    }

    productToEdit.qty = newValue;

    add_to_processed(productToEdit);

    // Update local storage
    localStorage.setItem(originView + "_" + shelf.id, JSON.stringify(shelf));

    return true;
}

/* Change shelf process */

/*
 data should be an array of {product_id: xx, shelf_id: yy}
*/
function record_products_shelf_on_server(data) {
    return new Promise(resolve => {
        $.ajax({
            type: "POST",
            url: "/shelfs/change_products_shelfs",
            dataType: "json",
            data: JSON.stringify(data),
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                if (typeof data.res !== "undefined" && typeof data.res.done !== "undefined")
                    resolve(data.res.done);
                else
                    resolve(null);
            },
            error: function() {
                alert("Impossible de mettre à jour les données");
                resolve(null);
            }
        });
    });
}

// call on change_shelf_btn click action
async function open_change_shelf_modal() {
    selected_products_for_shelf_change = [];
    $('.select_product_cb:checked').each(function(idx, elt) {
        const row = $(elt).closest('tr');

        selected_products_for_shelf_change.push(table_to_process.row(row).data());
    });
    if (selected_products_for_shelf_change.length > 0) {
        /*
          As button is not shown if no product is selected, should be always true
          But, with CSS changes, it could happen that length == 0
        */

        let shelfs = await get_all_shelfs();

        if (shelfs !== null) {
            let modal_content = $('#templates #change_shelf_form').clone(),
                shelf_selector = $('<select>').addClass('shelf_selection'),
                table = modal_content.find('table tbody').empty();

            /* construct shelfs selector */
            // first of all, sort by name
            shelfs.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
            // if ahead_shelfs_ids is not empty, put them ahead
            if (ahead_shelfs_ids.length > 0) {
                let to_move = {},
                    idx = 0;
                // find index of shelfs to move

                shelfs.forEach((shelf) => {
                    if (ahead_shelfs_ids.indexOf(shelf.id) > -1) {
                        to_move[shelf.id] = idx;
                    }
                    idx += 1;
                });
                // Respecting ahead_shelfs_ids order, move shelf ahead
                // splice can not be used, since more than 1 elt could be involved
                let ahead_elts = [];

                ahead_shelfs_ids.forEach((shelf_id) => {
                    let shelf = shelfs[to_move[shelf_id]];

                    ahead_elts.push(shelf);
                });
                //remove ahead elts
                shelfs = shelfs.filter((item) => {
                    return !ahead_elts.includes(item.id);
                });
                // put them ahead by concatenation
                shelfs = ahead_elts.concat(shelfs);
            }

            shelfs.forEach((shelf) => {
                let option = $('<option>')
                    .val(shelf.id)
                    .text(shelf.name + ' (' + shelf.sort_order + ')');

                shelf_selector.append(option);
            });
            /* add product rows */
            selected_products_for_shelf_change.forEach((product) => {
                let tr = $('<tr>').attr('data-id', product.id)
                    .append($('<td>').text(product.name))
                    .append($('<td>').append(shelf_selector.clone()));

                table.append(tr);
            });

            openModal(
                modal_content.html(),
                () => {
                    if (is_time_to('change_product_shelf', 500)) {
                        make_change = async () => {
                            // Prepare data to be transmitted to server to be recorded
                            let data = [];

                            $('.overlay-content table tbody tr').each(function(idx, e) {
                                data.push({
                                    product_id : $(e).data('id'),
                                    shelf_id : $(e).find('select')
                                        .val()
                                });
                            });
                            const update_result = await record_products_shelf_on_server(data);

                            if (update_result !== null) {
                                update_result.forEach((product_id) => {
                                    remove_from_toProcess(table_to_process.row($('tr#'+product_id)));
                                });
                                let message = "L'opération a bien réussi.";

                                if (update_result.length !== data.length) {
                                    message = "L'opération a partiellement réussi.\n";
                                    message += (data.length - update_result.length) + " produit(s) non déplacé(s).";
                                    //TODO: display which products changes were in error
                                }
                                $.notify(
                                    message,
                                    {
                                        globalPosition:"top right",
                                        className: "info"
                                    }
                                );
                            }
                        };
                        make_change();
                    }
                },
                'Changer les produits de rayons'
            );
        } else {
            alert("Les informations des autres rayons n'ont pas pu être récupérées.");
        }

    }
}

/* LISTS HANDLING */

// Init Data & listeners
function initLists() {
    if ('list_processed' in shelf) {
    // Remove processed items from items to process
        for (processed_item of shelf.list_processed) {
            var index_in_toProcess = list_to_process.findIndex(x => x.id == processed_item.id);

            if (index_in_toProcess > -1) {
                list_to_process.splice(index_in_toProcess, 1);
            }
        }
    } else {
        shelf.list_processed = [];
    }

    // Init table for items to process

    var columns_to_process = [];

    if (shelf.inventory_status !== "") {
        columns_to_process.push({data:"id", title: "id", visible: false});
    } else {
        columns_to_process.push({
            title: `<div id="table_header_select_all" class="txtcenter">
                                            <input type="checkbox" id="select_all_products_cb" name="select_all_products_cb" value="all">
                                        </div>`,
            className: "dt-body-center",
            orderable: false,
            render: function (data) {
                return `<input type="checkbox" class="select_product_cb" />`;
            },
            width: "4%"});
    }
    columns_to_process = columns_to_process.concat([
        {data:"name", title:"Produit", width: "60%"},
        {data:"uom_id.1", title:"Unité de mesure", className:"dt-body-center"},
        {
            title:"Renseigner qté",
            defaultContent: "<a class='btn' id='process_item' href='#'><i class='far fa-edit'></i></a>", "className":"dt-body-center",
            orderable: false
        }
    ]);

    if (originView == 'custom_list') {
        columns_to_process.splice(1, 0, {data:"shelf_sortorder", title:"Rayon", className:"dt-body-center"});
    }

    table_to_process = $('#table_to_process').DataTable({
        data: list_to_process,
        columns: columns_to_process,
        rowId : "id",
        order: [
            [
                0,
                "asc"
            ]
        ],
        scrollY: "28vh",
        scrollCollapse: true,
        paging: false,
        dom: 'lrtip', // Remove the search input from that table
        language: {url : '/static/js/datatables/french.json'}
    });


    // Init table for processed items
    var columns_processed = [
        {data:"row_counter", title:"row_counter", "visible": false},
        {data:"id", title: "id", visible: false},
        {data:"name", title:"Produit", width: "60%"},
        {data:"qty", title:"Qté", className:"dt-body-center"},
        {data:"uom_id.1", title:"Unité de mesure", className:"dt-body-center"},
        {
            title:"Modifier qté",
            defaultContent: "<a class='btn' id='reprocess_item' href='#'><i class='far fa-edit'></i></a>", "className":"dt-body-center",
            orderable: false
        }
    ];

    if (originView == 'custom_list') {
        columns_processed.splice(2, 0, {data:"shelf_sortorder", title:"Rayon", className:"dt-body-center"});
    }

    table_processed = $('#table_processed').DataTable({
        data: shelf.list_processed,
        columns: columns_processed,
        rowId : "id",
        order: [
            [
                0,
                "desc"
            ]
        ],
        scrollY: "28vh",
        scrollCollapse: true,
        paging: false,
        dom: 'lrtip', // Remove the search input from that table
        language: {url : '/static/js/datatables/french.json'}
    });


    /* Listeners on tables & search input */

    // Edit line from items to process
    $('#table_to_process tbody').on('click', 'a#process_item', function () {
    // Prevent editing mutiple lines at a time
        if (editing_item == null) {
            editing_origin = "to_process";
            edit_event($(this));
        }
    });

    // Edit line from items processed
    $('#table_processed tbody').on('click', 'a#reprocess_item', function () {
    // Prevent editing mutiple lines at a time
        if (editing_item == null) {
            editing_origin = "processed";
            edit_event($(this));
        }
    });

    // Search input for both tables
    $('#search_input').on('keyup', function () {
        $('table.dataTable')
            .DataTable()
            .search(jQuery.fn.DataTable.ext.type.search.string(this.value)) // search without accents (see DataTable plugin)
            .draw();
    });

    // Cancel line editing
    $('#edition_cancel').on('click', function () {
        if (editing_item != null) {
            if (editing_origin == "to_process") {
                add_to_toProcess(editing_item);
            } else if (editing_origin == "processed") {
                add_to_processed(editing_item, false);
            }

            clearLineEdition();
        }
    });

    // Select row(s) on checkbox change (copied from orders_helper.js -only table_to_process changed-)
    $(table_to_process.table().header()).on('click', 'th #select_all_products_cb', function () {
        if (this.checked) {
            selected_rows = [];
            table_to_process.rows().every(function() {
                const node = $(this.node());

                node.addClass('selected');
                node.find(".select_product_cb").first()
                    .prop("checked", true);

                // Save selected rows in case the table is updated
                selected_rows.push(this.data().id);

                return 0;
            });
            change_shelf_btn.show();
        } else {
            unselect_all_rows();
            change_shelf_btn.hide();
        }
    });

    $(table_to_process.table().body()).on('click', '.select_product_cb', function () {
        if (this.checked) {
            change_shelf_btn.show();
        } else {
            // must hide change_shelf_btn only if no other product is selected
            if ($('.select_product_cb:checked').length === 0) {
                change_shelf_btn.hide();
            }
        }
    });
    change_shelf_btn.click(open_change_shelf_modal);
}

// Add a line to the 'items to process' list
function add_to_toProcess(product) {
    // Add to list
    list_to_process.push(product);

    // Add to table (no data binding...)
    var rowNode = table_to_process.row.add(product).draw(false)
        .node();

    // Blinking effect on newly added row
    handle_blinking_effect(rowNode);
    $(rowNode).addClass('blink_me');
}

// Remove a line from the 'items to process' list
function remove_from_toProcess(row) {
    item = row.data();

    // Remove from list
    var index = list_to_process.indexOf(item);

    if (index > -1) {
        list_to_process.splice(index, 1);
    }

    // Remove from table
    row.remove().draw();
}

// Add a line to the 'items processed' list
function add_to_processed(product, withCounter = true) {
    // Add to list
    shelf.list_processed.push(product);

    // Add a counter to display first the last row added
    if (withCounter) {
        product.row_counter = processed_row_counter;
        processed_row_counter++;
    }

    // Add to table (no data binding...)
    var rowNode = table_processed.row.add(product).draw(false)
        .node();

    // Handle blinking efect for newly added row
    handle_blinking_effect(rowNode);
    $(rowNode).addClass('blink_me');
}

// Remove a line from 'items processed'
function remove_from_processed(row) {
    let item = row.data();

    // Remove from list
    let index = shelf.list_processed.indexOf(item);

    if (index > -1) {
        shelf.list_processed.splice(index, 1);
    }

    //Remove from table
    row.remove().draw();
}


/* ACTIONS */

// Set the quantity to 0 for all the remaining unprocessed items
function confirmProcessAllItems() {
    openModal();

    // Iterate over all rows in table of items to process
    table_to_process.rows().every(function () {
        var data = this.data();

        editProductInfo(data, 0);

        return 1;
    });

    // Reset data
    list_to_process = [];
    table_to_process.rows().remove()
        .draw();

    closeModal();
}

// Verifications before processing
function pre_send() {
    if (list_to_process.length > 0 || editing_item != null) {
        alert('Il reste des produits à compter. Si ces produits sont introuvables, cliquez sur "Il n\'y a plus de produits à compter".');
    } else {
        if (shelf.inventory_status != '')
            validation_msg.find('.validation_msg_step2').show();

        openModal(validation_msg.html(), send, 'Confirmer', false);
    }
}

// Proceed with inventory: send the request to the server
function send() {
    if (is_time_to('submit_inv_qties')) {
        // Loading on
        var wz = $('#main-waiting-zone').clone();

        wz.find('.msg').text("Patience, cela peut prendre de nombreuses minutes s'il y a une centaine de produits");
        openModal(wz.html());

        // Add user comments to data sent to server
        shelf.user_comments = user_comments;

        var url = "../do_" + originView + "_inventory";
        var call_begin_at = new Date().getTime();

        $.ajax({
            type: "PUT",
            url: url,
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(shelf),
            success: function(data) {
                // If step 1, display additionnal message in validation popup
                if (shelf.inventory_status == '') {
                    inventory_validated_msg.find('#step1_validated').show();
                }

                if (typeof data.res.inventory != 'undefined') {
                    if (typeof data.res.inventory.missed != 'undefined' && data.res.inventory.missed.length > 0) {
                        $('#products_missed_container').show();
                        for (p of data.res.inventory.missed) {
                            $('ul#products_missed_list').append('<li>'+ p.product.name +'</li>');
                        }
                    }
                }

                var msg = (originView == 'shelf') ? 'OK, je passe à la suite !' : 'Retour';

                // Go to step 2 if step 1 is validated and modal closed
                openModal(inventory_validated_msg.html(), refresh, msg, true, false);

                // Go to step 2 if modal is closed
                $('#modal_closebtn_top').on('click', refresh);
                $('#modal_closebtn_bottom').on('click', refresh);

                // Clear local storage before leaving
                localStorage.removeItem(originView + '_' + shelf.id);
            },
            error: function(jqXHR) { // 500 error has been thrown or web server sent a timeout
                if (jqXHR.status == 504) {
                    /*
                        django is too long to respond.
                        Let it the same time laps before asking if the process is well done
                    */
                    var now = new Date().getTime();

                    setTimeout(
                        function() {
                            $.ajax({
                                type: 'GET',
                                url: '../inventory_process_state/' + shelf.id,
                                success: function(rData) {
                                    if ('res' in rData && 'state' in rData.res) {
                                        // Verification for step 2 only ; step 1 is always fast
                                        if (shelf.inventory_status == 'step1_done' && rData.res.state != 'step1_done') {
                                            // shelf inventory has been already done
                                            localStorage.removeItem(originView + '_' + shelf.id);
                                            closeModal();
                                            back();
                                        } else {
                                            console.log('Still in process : need to call recursively to make other calls');
                                        }
                                    } else {
                                        console.log(rData);
                                    }
                                }
                            });
                        }
                        , now - call_begin_at
                    );

                } else if (jqXHR.status == 500) {
                    var message = "Erreur lors de la sauvegarde des données. " +
                                  "Pas de panique, les données de l'inventaire n'ont pas été perdues ! " +
                                  "Merci de contacter un salarié et de réessayer plus tard.";

                    if (typeof jqXHR.responseJSON != 'undefined' && typeof jqXHR.responseJSON.error != 'undefined') {
                        //console.log(jqXHR.responseJSON.error);

                        if ('busy' in jqXHR.responseJSON) {
                            message = "Inventaire en cours de traitement.";
                        } else if (jqXHR.responseJSON.error == 'FileExistsError') {
                            //step1 file has been found => previous request succeeded
                            message = "Les données avaient déjà été transmises....";
                            // Clear local storage before leaving
                            localStorage.removeItem(originView + '_' + shelf.id);
                        }
                    }
                    closeModal();
                    alert(message);
                    back();
                }
            }
        });
    } else {
        alert('Clic reçu il y a moins de 5 secondes. La demande est en cours de traitement.');
    }

}

function exit_adding_product() {
    $('input.add_product_input').val('');
    adding_product = false;
}

/**
 * Set the ongoing inventory start datetime.
 * This operation is invisible to the user.
 */
function set_begin_inventory_datetime() {
    if (originView === 'shelf' &&
        (
            shelf.ongoing_inv_start_datetime === default_inventory_start_datetime
            || shelf.ongoing_inv_start_datetime === undefined
        )
    ) {
        $.ajax({
            type: "POST",
            url: "/shelfs/"+shelf.id+"/set_begin_inventory_datetime",
            dataType: "json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                shelf.ongoing_inv_start_datetime = data.res.inventory_begin_datetime;
                // Update local storage
                localStorage.setItem(originView + "_" + shelf.id, JSON.stringify(shelf));
            },
            error: function() {
                console.log("Impossible de mettre à jour la date de début d'inventaire");
            }
        });
    }
}

// Add a product that's not in the list
function open_adding_product() {
    if (originView == 'shelf') {
        adding_product = true;

        openModal(add_product_form.html(), do_add_product, 'Valider', false, true, exit_adding_product);
        $('input.add_product_input').focus();
    }
}

function do_add_product() {
    prod_data = {
        barcode: $('input.add_product_input').val()
    };

    openModal();
    $.ajax({
        type: "POST",
        url: "../"+shelf.id+"/add_product",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(prod_data),
        success: function() {
            exit_adding_product();
            closeModal();
            alert('Produit ajouté !');
            location.reload();
        },
        error: function(data) {
            if (typeof data.responseJSON != 'undefined') {
                console.log(data.responseJSON);
            }

            exit_adding_product();
            closeModal();

            msg = "";
            if (typeof data.responseJSON.res != 'undefined' && typeof data.responseJSON.res.msg != 'undefined') {
                msg = " (" + data.responseJSON.res.msg + ")";
            }
            alert("Impossible d'ajouter le produit au rayon." + msg);
        }
    });
}


function openFAQ() {
    openModal(faq_content.html(), function() {}, 'Compris !', true, false);
}

function openIssuesReport() {
    openModal(issues_reporting.html(), saveIssuesReport, 'Confirmer');

    var textarea = $("#issues_report");

    textarea.val(user_comments);
    textarea.focus();
}

function saveIssuesReport() {
    user_comments = $('#issues_report').val();
    $('#search_input').focus();
}


/* INIT */

// (for shelf change)
function get_all_shelfs() {
    return new Promise(resolve => {
        if (all_shelfs !== null) {
            resolve(all_shelfs);
        } else {
            $.ajax({
                type: 'GET',
                url: "/shelfs/all/simple",
                dataType:"json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                success: function(data) {
                    shelfs = null;
                    if (typeof data.res !== "undefined" && data.res.length > 0)
                        shelfs = data.res;
                    resolve(shelfs);
                },
                error: function(data) {
                    err = {msg: "erreur serveur lors de la récupération des rayons", ctx: 'get_all_shelfs'};
                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                        err.msg += ' : ' + data.responseJSON.error;
                    }
                    report_JS_error(err, 'shelf_inventory');
                    resolve(null);
                }
            });
        }
    });
}

// Get shelf data from server if not in local storage
function get_shelf_data() {
    var url = (originView == 'shelf') ? '../' + shelf.id : '../get_custom_list_data?id=' + shelf.id;

    $.ajax({
        type: 'GET',
        url: url,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            shelf = data.res;
            init();
            set_begin_inventory_datetime();
        },
        error: function(data) {
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                console.log(data.responseJSON.error);
            }
            alert('Les données n\'ont pas pu être récupérées, réessayez plus tard.');
        }
    });
}

// Init page : to be launched when shelf data is here
function init() {
    // Products passed at page loading
    // TODO: get products by ajax for better ui experience (? -> warning js at loading)
    // TODO : What happens if products are being put or removed from the self before the end of the inventory ?
    list_to_process = products;
    initLists();

    // Set DOM
    if (originView == "shelf") {
        $('#shelf_name').text(shelf.name + ' (numéro ' + shelf.sort_order + ')');
    } else {
        $('#page_title').text("Inventaire du");
        $('#shelf_name').text(shelf.datetime_created);

        $("#add_product_to_shelf").hide();
    }

    if (shelf.inventory_status == "") { // Step 1
    // Header
        $('#header_step_one').addClass('step_one_active');

        // Container items to process
        $('#container_left').css('border', '3px solid #212529');

        // Container processed items
        $('#container_right').css('border', '3px solid #0275D8');

        // Edition
        $('#edition_header').text('Quantité en rayon');

        // Validation button
        // $('#validation_button').html("<button class='btn--primary full_width_button' id='validate_inventory'>J'ai fini de compter</button>")
        $('#validate_inventory').addClass('btn--primary');
        $('#add_product_to_shelf').addClass('btn--inverse');
    } else { // Step 2
        $('#header_step_two').addClass('step_two_active');

        var check_icon = document.createElement('i');

        check_icon.className = 'far fa-check-circle';
        $('#header_step_one_content').append(check_icon);

        // Containers
        $('#container_left').css('border', '3px solid #0275D8');
        $('#container_right').css('border', '3px solid #5CB85C');

        // Edition
        $('#edition_header').text('Quantité en réserve');

        // Validation button
        $('#validate_inventory').addClass('btn--success');
        $('#add_product_to_shelf').addClass('btn--primary');
    }


    // Buttons Listeners
    $(document).on('click', 'button#validate_inventory', pre_send);
    $(document).on('click', 'button#add_product_to_shelf', open_adding_product);
    $(document).on('click', 'button#open_issues_report', openIssuesReport);
    $(document).on('click', 'button#open_faq', openFAQ);
    $(document).on('click', 'button#process_all_items', function () {
        openModal(process_all_items_msg.html(), confirmProcessAllItems, 'Confirmer', false);
    });

    // Action at modal closing
    $(document).on('click', 'a#modal_closebtn_top', exit_adding_product);


    // Load FAQ modal content
    faq_content.load("/shelfs/shelf_inventory_FAQ");

    // Handle blinking effect on edition area
    var container_edition = document.querySelector('#container_edition');

    handle_blinking_effect(container_edition);

    // Disable mousewheel on an input number field when in focus
    $('#edition_input').on('focus', function () {
        $(this).on('wheel.disableScroll', function (e) {
            e.preventDefault();
            /*
        Option to possibly enable page scrolling when mouse over the input, but :
          - deltaY is not in pixels in Firefox
          - movement not fluid on other browsers

      var scrollTo = (e.originalEvent.deltaY) + $(document.documentElement).scrollTop();
      $(document.documentElement).scrollTop(scrollTo);
      */
        });

        // if ($(this).val().length > 0) {
        //     let reset_icon = $("#reset_to_previous_qty");
        //     reset_icon.show();
        //     reset_icon.off();
        //     reset_icon.on("click", reset_previous_value);
        // } else {
        //     $("#reset_to_previous_qty").hide();
        // }
    })
        .on('blur', function () {
            $(this).off('wheel.disableScroll');
        });

    $("#edition_input").keypress(function(event) {
        // Force validation when enter pressed in edition
        if (event.keyCode == 13 || event.which == 13) {
            validateEdition();
        }
    });

    // client-side validation of numeric inputs, optionally replacing separator sign(s).
    $("input.number").on("keydown", function (e) {
        // allow function keys and decimal separators
        if (
        // backspace, delete, tab, escape, enter, comma and .
            $.inArray(e.keyCode, [
                46,
                8,
                9,
                27,
                13,
                110,
                188,
                190
            ]) !== -1 ||
          // Ctrl/cmd+A, Ctrl/cmd+C, Ctrl/cmd+X
          ($.inArray(e.keyCode, [
              65,
              67,
              88
          ]) !== -1 && (e.ctrlKey === true || e.metaKey === true)) ||
          // home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {

            /*
          // optional: replace commas with dots in real-time (for en-US locals)
          if (e.keyCode === 188) {
              e.preventDefault();
              $(this).val($(this).val() + ".");
          }

          // optional: replace decimal points (num pad) and dots with commas in real-time (for EU locals)
          if (e.keyCode === 110 || e.keyCode === 190) {
              e.preventDefault();
              $(this).val($(this).val() + ",");
          }
          */

            return;
        }
        // block any non-number
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });

    // Manual and textual input
    $('#search_input').keypress(function(e) {
        if (e.which >= 48 && e.which <= 57) { // figures [0-9]
            search_chars.push(String.fromCharCode(e.which));
        } else if (e.which == 13 || search_chars.length >= 13) {
            barcode_analyzer();
        }
    });

    $(document).pos();
    $(document).on('scan.pos.barcode', function(event) {
        //access `event.code` - barcode data
        var barcode = event.code;

        barcode_analyzer(barcode);

    });

}

// Load barcodes at page loading, then barcodes are stored locally
var get_barcodes = async function() {
    if (barcodes == null) barcodes = await init_barcodes();
};

$(document).ready(function() {
    // Get Route parameter
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    var pathArray = window.location.pathname.split('/');

    shelf = {id: pathArray[pathArray.length-1]};

    // Working on a shelf
    if (pathArray.includes('shelf_inventory')) {
        originView = 'shelf';
        parent_location = '/shelfs';
    } else {
        originView = 'custom_list';
        parent_location = '/inventory/custom_lists';
    }

    // Get shelf data from local storage
    if (Modernizr.localstorage) {
        var stored_shelf = JSON.parse(localStorage.getItem(originView + '_' + shelf.id));

        if (stored_shelf != null) {
            shelf = stored_shelf;

            init();
            set_begin_inventory_datetime();
        } else {
            // Get shelf info if not coming from shelves list
            get_shelf_data();
        }
    } else {
        get_shelf_data();
    }
    get_barcodes();

});
