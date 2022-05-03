var shelfs_table = null;

function init_datatable() {
    return $('#shelfs').DataTable({
        data: shelfs, // data passed at page loading
        rowId: 'id',
        columns:[
            {data: "id", title:"id", "visible": false},
            {
                data:"sort_order",
                title:"Numéro",
                width: "10%",
                className:"dt-body-center"
            },
            {data:"name", title:"Nom"},
            {data:"description", title:"Description", orderable: false},
            {
                data:"date_last_product_added",
                title:"Dernier ajout produit",
                render: function (data, type) {
                    // Sort on data, not rendering
                    if (type == "sort" || type == 'type')
                        return data;

                    if (data == '0001-01-01')
                        return "";
                    else {
                        var date = new Date(data);


                        return date.toLocaleDateString('fr-FR');
                    }
                }
            },
            {
                data:"date_last_inventory",
                title:"Date dernier inventaire",
                render: function (data, type, full, meta) {
                    // Sort on data, not rendering
                    if (type == "sort" || type == 'type')
                        return data;

                    if (data == '0001-01-01')
                        return "Ce rayon n'a jamais été inventorié !";
                    else {
                        var date = new Date(data);


                        return date.toLocaleDateString('fr-FR');
                    }
                }
            },
            {data:"p_nb", title:"Nombre de réfs", width: "5%", className:"dt-body-center"},
            {
                data:"shelf_value",
                title:"Valeur théorique du rayon",
                render: function (data, type, full, meta) {
                    if (type == "sort" || type == 'type')
                        return data;

                    if (data == -1) { // Code: server send empty field -> loading
                        return '<i class="fas fa-spinner fa-spin"></i>';
                    } else if (data == -2) { // Code: error getting data from server
                        return '/';
                    } else {
                        return data + ' €';
                    }
                },
                width: "5%",
                className:"dt-body-center"
            },
            {
                data:"last_inv_delta_percentage",
                title:"Delta (dernier inv.)",
                width: "5%",
                className:"dt-body-center",
                render: function (data, type, full, meta) {
                    if (type == "sort" || type == 'type')
                        return data;

                    if (data == -99999999) {
                        return '/';
                    } else {
                        return data + ' %';
                    }
                }
            },
            {
                data:"last_inv_losses_percentage",
                title:"Pertes (dernier inv.)",
                width: "5%",
                className:"dt-body-center",
                render: function (data, type, full, meta) {
                    if (type == "sort" || type == 'type')
                        return data;

                    if (data == -99999999) {
                        return '/';
                    } else {
                        return data + ' %';
                    }
                }
            },
            {
                data:"inventory_status",
                title:"Inventaire à faire",
                className:"dt-body-center",
                width: "15%",
                render: function (data, type, full, meta) {
                    if (data == '')
                        return "<button class='btn--primary do_shelf_inventory'>Inventaire en rayon</button>";
                    else
                        return "<button class='btn--success do_shelf_inventory'>Inventaire en réserve</button>";
                }
            }
        ],
        dom: 'rtip',
        order: [
            [
                1,
                "asc"
            ]
        ],
        iDisplayLength: 25,
        language: {url : '/static/js/datatables/french.json'}
    });
}

function get_shelfs_extra_data() {
    try {
        $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });
        $.ajax({
            type: 'GET',
            url: '/shelfs/get_shelves_extra_data',
            dataType:"json",
            traditional: true,
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                for (item of data.res) {
                    var row_data = shelfs_table.row('#'+item.id).data();

                    row_data.shelf_value = item.shelf_value;

                    shelfs_table
                        .row('#'+item.id)
                        .data(row_data)
                        .draw();
                }
            },
            error: function(data) {
                if (typeof data.responseJSON != 'undefined') {
                    console.log(data.responseJSON);
                }

                set_null_to_extra_data();
            }
        });
    } catch (e) {
        console.log(e);
        set_null_to_extra_data();
    }
}

function set_null_to_extra_data() {
    shelfs_table.rows().every(function (rowIdx, tableLoop, rowLoop) {
        var d = this.data();

        d.shelf_value = -2;
        this.invalidate(); // invalidate the data DataTables has cached for this row
    });

    shelfs_table.draw();
}

var getRowData = function(clicked) {
    var row = shelfs_table.row(clicked.parents('tr'));


    return row.data();
};

function go_to_shelf_inventory() {
    openModal();

    var clicked = $(this);
    var row_data = getRowData(clicked);

    // Use local storage to pass data to next page
    if (Modernizr.localstorage) {
        var stored_shelf = JSON.parse(localStorage.getItem('shelf_' + row_data.id));

        // Set local storage if key doesn't exist
        if (stored_shelf == null) {
            localStorage.setItem("shelf_" + row_data.id, JSON.stringify(row_data));
        }
    }

    document.location.href = "shelf_inventory/" + row_data.id;
}

function go_to_shelf_view() {
    openModal();

    var clicked = $(this);
    var row_data = getRowData(clicked);

    // Use local storage to pass data to next page
    if (Modernizr.localstorage) {
        var stored_shelf = JSON.parse(localStorage.getItem('shelf_' + row_data.id));

        // Set local storage if key doesn't exist
        if (stored_shelf == null) {
            localStorage.setItem("shelf_" + row_data.id, JSON.stringify(row_data));
        }
    }

    document.location.href = "shelf_view/" + row_data.id;
}

$(document).ready(function() {
    shelfs_table = init_datatable();
    get_shelfs_extra_data();

    $(document).on('click', 'button.do_shelf_inventory', go_to_shelf_inventory);
    $('#shelfs').on('click', 'tbody td', go_to_shelf_view);

    // Search input
    $('#search_input').on('keyup', function () {
        shelfs_table
            .search(jQuery.fn.DataTable.ext.type.search.string(this.value))
            .draw();
    });

});
