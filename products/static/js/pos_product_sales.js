var table = $('#sales_list');
var active_table = null;
var filter_pareto = $('#filter_pareto');
var raw_lines_data = [];
var pareto_sales_80_data = [];
var parsed_sum_up = {total: 0, sale_to_zero: []};

var compute_price_delta_level = function(prices) {
    var min = 100000000000000;
    var max = -100000000000000;
    var level = 0;

    for (i in prices) {
        if (prices[i] < min) min = prices[i];
        if (prices[i] > max) max = prices[i];
    }
    if (min == 0) {
        level = 10;
    } else {
        var ratio = max/min;

        if (ratio > 10) {
            level = 9;
        } else if (ratio > 5) {
            level = 8;
        } else if (ratio > 2) {
            level = 7;
        } else if (ratio > 1.75) {
            level = 6;
        } else if (ratio > 1.5) {
            level = 5;
        } else if (ratio > 1.4) {
            level = 4;
        } else if (ratio > 1.3) {
            level = 3;
        } else if (ratio > 1.2) {
            level = 2;
        } else if (ratio > 1.1) {
            level = 1;
        }
    }

    return level;
};
//console.log(window.sales_data)

$.each(window.sales_data.sales.products, function(pid, elt) {
    //clef elts = discount_x, details, qty, total
    try {
        product = window.sales_data.products[pid];
        raw_lines_data.push({id: pid, barcode: product.barcode, name: product.p_name, categ: window.sales_data.pcat[product.categ_id], qty: elt.qty, total: elt.total, details: elt.details});
        parsed_sum_up.total += elt.total;
    } catch {
        console.log("Pb avec produit " + pid);
    }
});
// console.log(window.sales_data)
// console.log(parsed_sum_up.total)
var display_table = function (data) {
    var cols = [
        {data: 'barcode', title: "Code-barre", className: 'barcode'},
        {data: 'name', title: "Nom", className: 'name'},
        {data: 'categ', title: "Catégorie", className: 'categ'},
        {data: 'qty', title: "Qté"},
        {data: 'total', title: "Total TTC", className: 'ttc'},
        {data: 'details', title: "Détails", className: 'details'}
    ];
    var select = {
        style:    'os',
        selector: 'td:first-child'

    };

    var settings = {
        dom: '<lf<t>i><"clear"><B>',
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
        buttons: [],
        columns: cols,
        select: select,
        rowId : "id",
        data : data,
        language: {url : '/static/js/datatables/french.json'},
        createdRow: function(row, rdata, index) {
            var details = '';
            var nb_dates = Object.keys(rdata.details).length;
            var anomalie_classes = [];

            if (nb_dates > 0) {
                details = $('<div>');
                list = $('<ul>').css('display', 'none');
                var prices = [];
                var price_delta_level = 0;
                var price_1 = false;
                var price_0 = false;

                for (d in rdata.details) {
                    var l = $('<li>');
                    var detail_info = rdata.details[d].date + ' : ' + rdata.details[d].val + '€, ';

                    detail_info += rdata.details[d].qty + ' en ' + rdata.details[d].transacs.length + ' transac.';
                    if (rdata.details[d].transacs.length > 1) {
                        detail_info = $('<a>').addClass('open_day_details')
                            .text(detail_info);
                        day_list = $('<ul>').css('display', 'none');
                        $.each(rdata.details[d].transacs, function(idx, transac) {
                            var det_line = $('<li>');
                            var pfound = false;

                            for (pidx in prices) {
                                if (prices[pidx] == transac.price) pfound = true;
                            }
                            if (pfound == false || prices.length == 0) prices.push(transac.price);
                            if (transac.price == 1) {
                                price_1 = true;
                                day_list.addClass('pr_1');
                                det_line.addClass('pr_1');
                                l.addClass('pr_1');
                            } else if (transac.price == 0) {
                                price_0 = true;
                                day_list.addClass('pr_0');
                                det_line.addClass('pr_0');
                                l.addClass('pr_0');
                            }
                            var full_d = transac.qty + ' x ' + transac.price + '€ = ' + transac.subtotal;

                            if (transac.discount > 0)
                                full_d += ' (remise=' + transac.discount +')';
                            det_line.text(full_d);
                            day_list.append(det_line);
                        });

                        detail_info.append(day_list);
                    }
                    if (price_1 == true) anomalie_classes.push('pr_1');
                    if (price_0 == true) anomalie_classes.push('pr_0');
                    l.html(detail_info);
                    list.append(l);
                }

                if (prices.length > 1) price_delta_level = compute_price_delta_level(prices);
                if (price_delta_level > 0) anomalie_classes.push('pdl_'+price_delta_level);
                var date_msg = nb_dates + ' date';

                if (nb_dates > 1) date_msg += 's';
                text = $('<a>').addClass('open_details')
                    .text(date_msg);
                details.append(text);
                details.append(list);
            }
            $(row).addClass(anomalie_classes.join(' '));
            $(row).find('td')
                .last()
                .html(details);

        },
        initComplete: function() {


        }
    };

    active_table = table.DataTable(settings);
    table.show();
    table.off('click', '.open_details');
    table.off('click', '.open_day_details');

    table.on('click', '.open_details', function() {
        var clicked = $(this);
        var details = clicked.closest('td').find('ul')
            .first();

        if (details.css('display') == 'none') {
            details.show();
        } else {
            details.hide();
        }

    });
    table.on('click', '.open_day_details', function() {
        var clicked = $(this);
        var details = clicked.find('ul');

        if (details.css('display') == 'none') {
            details.show();
        } else {
            details.hide();
        }

    });
};

function get_x_pc_sales_products() {
    var kept = [];
    var local_sum = 0;
    var ref_sum = window.sales_data.sales.full_total - window.sales_data.sales.full_discount;
    var pareto_num = $('#pareto_num').val();

    if (isNaN(pareto_num))
        pareto_num = 0.8;
    else
        pareto_num = pareto_num / 100;
    raw_lines_data.sort(function(a, b) {
        return parseFloat(b.total) - parseFloat(a.total);
    });
    $.each(raw_lines_data, function(i, e) {
        local_sum += e.total;
        if (local_sum < ref_sum * pareto_num) {
            kept.push(e);
        }
    });

    return kept;
}
function display_sum_up() {
    // verifier delta parsed_sum_up.total et window.sales_data.sales.full_total - window.sales_data.sales.full_discount
    var ttc_ar = window.sales_data.sales.full_total;
    var total_r = window.sales_data.sales.full_discount;
    var msg = '<strong>Total TTC</strong> : ' + ttc_ar + ' - ' + total_r + ' (remises) ';

    msg += '= <strong>' + (ttc_ar - total_r) + ' €</strong>';
    msg += ' (' + window.sales_data.sales.orders + ' passages en caisse ';
    msg += ' --> ' + window.sales_data.sales.pol_nb + ' lignes de tickets)';
    msg += ' réalisé avec ' + window.sales_data.sales.partners + ' coopérateurs différents';
    $('#sum_up').html(msg);
}

filter_pareto.click(function() {
    active_table.destroy();
    if ($(this).is(':checked')) {
        display_table(get_x_pc_sales_products());
    } else {
        display_table(raw_lines_data);
    }
});
display_sum_up();
display_table(raw_lines_data);
