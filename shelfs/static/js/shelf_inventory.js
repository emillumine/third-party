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
    add_product_input = $("#add_product_input");

var shelf,
    parent_location = '/shelfs',
    originView = "shelf", // or custom_list (create from order view)
    list_to_process = [],
    table_to_process,
    table_processed,
    editing_item = null, // Store the item currently being edited
    editing_origin, // Keep track of where editing_item comes from
    processed_row_counter = 0, // Keep count of the order the item were added in processed list
    search_chars = [],
    user_comments = '',
    adding_product = false; // True if modal to add a product is open


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

function refresh() {
    location.reload();
}

// Directly send a line to edition when barcode is read
function select_product_from_bc(barcode) {
    if (editing_item == null) {
        var found = null;

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
                    editing_origin = 'processed';
                }
            });
        }

        if (found !== null) {
            setLineEdition(found);
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

    function onAnimationEnd(e) {
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
function setLineEdition(item) {
    var edition_input = $('#edition_input');

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
    // If item is reprocessed, set input with value
    if (editing_origin == 'processed') {
        edition_input.val(editing_item.qty);
    }

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
}

// Validate product edition
function validateEdition(form) {
    if (editing_item != null) {
        if (editProductInfo(editing_item)) {
            clearLineEdition();
        }
    }
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
    var columns_to_process = [
        {data:"id", title: "id", visible: false},
        {data:"name", title:"Produit", width: "60%"},
        {data:"uom_id.1", title:"Unité de mesure", className:"dt-body-center"},
        {
            title:"Renseigner qté",
            defaultContent: "<a class='btn' id='process_item' href='#'><i class='far fa-edit'></i></a>", "className":"dt-body-center",
            orderable: false
        }
    ];

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
    table_to_process.rows().every(function (rowIdx, tableLoop, rowLoop) {
        var data = this.data();

        editProductInfo(data, 0);
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

        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
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

                // Go back to list if modal closed
                $('#modal_closebtn_top').on('click', refresh);
                $('#modal_closebtn_bottom').on('click', refresh);

                // Clear local storage before leaving
                localStorage.removeItem(originView + '_' + shelf.id);
            },
            error: function(jqXHR, textStatus) { // 500 error has been thrown or web server sent a timeout
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
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
    $.ajax({
        type: "POST",
        url: "../"+shelf.id+"/add_product",
        dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(prod_data),
        success: function(data) {
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

// Get shelf data from server if not in local storage
function get_shelf_data() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

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
    //console.log(shelf)
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
    $(document).on('click', 'button#process_all_items', function (e) {
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
    $('#edition_input').on('focus', function (e) {
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
    })
        .on('blur', function (e) {
            $(this).off('wheel.disableScroll');
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
                }, 300);
            }
        }
    });
}


$(document).ready(function() {
    // Get Route parameter
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
        } else {
            // Get shelf info if not coming from shelves list
            get_shelf_data();
        }
    } else {
        get_shelf_data();
    }

});
