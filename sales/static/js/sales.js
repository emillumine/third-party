var dateFormat = "yy-mm-dd",
    from_datepicker = null,
    to_datepicker = null,
    orders_table = null;

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
    if (getDate(from_datepicker.val()) &&
        getDate(to_datepicker.val())) {

        $('#dates_selection_button').prop('disabled', false);
    } else {
        $('#dates_selection_button').prop('disabled', true);
    }
}

function display_orders(orders) {
    // Empty datatable if already exists
    if (orders_table) {
        orders_table.destroy();
    }

    orders_table = $('#orders_table').DataTable({
        data: orders,
        columns:[
            {
                data:"create_date",
                title:"Date enregistrement",
                width: "10%"
            },
            {
                data:"pos_order_name",
                title:"Ref. Caisse",
                width: "10%"
            },

            {
                data:"partner",
                title:"Membre",
                // width: "40%"
            },
            {
                data:"total_amount",
                title: "Montant dû",
                // className:"dt-body-center",
                render: function (data) {
                    return parseFloat(data).toFixed(2) + ' €';
                }
            },
            {
                data:"payments",
                title:"Paiements",
                orderable: false,
                render: function (data) {
                    let res = '<ul>';

                    for (p of data) {
                        res += `<li>${p.journal_id[1]} : ${p.amount} €</li>`;
                    }
                    res += "</ul>";

                    return res; 
                }
            },
            {
                data:"payments[0].meal_voucher_issuer",
                title: "Émetteur CB Déj",
                render: function (data) {
                    return data === 'false' || data == false ? '' : data;
                }
            },
        ],
        order: [
            [
                0,
                "asc"
            ]
        ],
        buttons: [
            {
                extend: 'excelHtml5',
                text: 'Export en Excel',
                className: 'btn--primary btn_export_movements'
            }
        ],
        dom: '<lr<t>ip><"clear"><B>',
        iDisplayLength: 100,
        language: {url : '/static/js/datatables/french.json'}
    });

    $('.main').show();
}


function get_sales() {
    openModal();

    var url = "/sales/get_sales";

    url += '?from=' + encodeURIComponent(from_datepicker.val());
    url += '&to=' + encodeURIComponent(to_datepicker.val());

    $.ajax({
        type: 'GET',
        url: url,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            display_orders(data.res);
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

    $('.select_sales_date_input').change(function() {
        enable_validation();
    });

    $("#sales_form").submit(function(event) {
        event.preventDefault();
        get_sales();
    });
});
