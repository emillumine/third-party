/*
 * Extract and display a stock movement type between two dates
 *
 */

var dateFormat = "yy-mm-dd",
    from_datepicker = null,
    to_datepicker = null,
    movements_table = null;

// Return a date from a string if valid, else return null
function getDate(element) {
    var date = null;

    try {
        date = $.datepicker.parseDate(dateFormat, element);
    } catch (error) {
        date = null;
    }

    return date;
}

// Enable validation button if all fields are valid
function enable_validation() {
    if ($('#movement_type_selector').val() != '' &&
        getDate(from_datepicker.val()) &&
        getDate(to_datepicker.val())) {

        $('#movement_selection_button').prop('disabled', false);
    } else {
        $('#movement_selection_button').prop('disabled', true);
    }
}

function display_movements(movements) {
    total_value = 0;
    for (move of movements) {
        total_value += move.inventory_value;
    }

    $('#count_movements').text(movements.length);
    $('#total_value_movements').text(parseFloat(total_value).toFixed(2));

    // Empty datatable if already exists
    if (movements_table) {
        movements_table.destroy();
    }

    movements_table = $('#movements_table').DataTable({
        data: movements,
        columns:[
            {
                data:"name",
                title:"Mouvement (Type - Date - Fait par)",
                width: "70%"
            },

            {
                data:"inventory_value",
                title: "Valeur",
                className:"dt-body-center",
                render: function (data) {
                    return parseFloat(data).toFixed(2) + ' €';
                }
            },
            {
                data:"date_done",
                title:"Trier par Date",
                className:"dt-body-center",
                render: function (data) {
                    return '<i>' + data + '</i>';
                }
            }
        ],
        order: [
            [
                2,
                "desc"
            ]
        ],
        buttons: [
            {
                extend: 'excelHtml5',
                text: 'Export en Excel',
                className: 'btn--primary btn_export_movements'
            },
            {
                extend: 'pdfHtml5',
                text: 'Export en PDF',
                className: 'btn--primary btn_export_movements'
            }
        ],
        dom: '<lr<t>ip><"clear"><B>',
        iDisplayLength: 10,
        language: {url : '/static/js/datatables/french.json'}
    });

    $('.main').show();
}

function get_movements() {
    openModal();

    var url = "/stock/get_movements";

    url += '?movement_type=' + encodeURIComponent($('#movement_type_selector').val());
    url += '&from=' + encodeURIComponent(from_datepicker.val());
    url += '&to=' + encodeURIComponent(to_datepicker.val());

    $.ajax({
        type: 'GET',
        url: url,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            display_movements(data.res);
            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la sélection des mouvements de stock", ctx: 'get_movements'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'stock');

            closeModal();
            alert('Erreur lors de la récupération, réessayez plus tard');
        }
    });
}

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

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
        dayNamesMin: [
            'Di',
            'Lu',
            'Ma',
            'Me',
            'Je',
            'Ve',
            'Sa'
        ],
        dateFormat: dateFormat,
        firstDay: 1,
        minDate: 1,
        maxDate: '+12M +0D'
    };
    $.datepicker.setDefaults($.datepicker.regional['fr']);

    from_datepicker = $("#from")
        .datepicker({
            defaultDate: "-1d",
            changeMonth: true,
            changeYear: true,
            yearRange: "-03:+00",
            minDate: new Date(2007, 1 - 1, 1),
            maxDate: new Date()
        })
        .on("change", function() {
            to_datepicker.datepicker("option", "minDate", getDate(this.value));
        });

    to_datepicker = $("#to")
        .datepicker({
            defaultDate: "-1d",
            changeMonth: true,
            changeYear: true,
            yearRange: "-03:+00",
            minDate: new Date(2007, 1 - 1, 1),
            maxDate: new Date()
        })
        .on("change", function() {
            from_datepicker.datepicker("option", "maxDate", getDate(this.value));
        });

    $('.select_movement_element').change(function() {
        enable_validation();
    });

    $('#movement_selection_button').click(function() {
        get_movements();
    });

});
