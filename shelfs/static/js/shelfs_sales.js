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
                data:"date_last_inventory",
                title:"Date dernier inventaire",
                render: function (data, type) {
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
            {data:"p_nb", title:"Nb réfs", width: "5%", className:"dt-body-center"},
            {
                title:"",
                className:"dt-body-center",
                width: "15%",
                render: function () {
                    return "<button class='btn--success do_export_sales_data'>Export Ventes</button>";
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



var getRowData = function(clicked) {
    var row = shelfs_table.row(clicked.parents('tr'));


    return row.data();
};



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

function get_shelfs_sales_data() {
    try {

        $.ajax({
            type: 'GET',
            url: '/shelfs/get_shelves_sales_data',
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


            }
        });
    } catch (e) {
        err = {msg: e.toString(), ctx: 'get_shelfs_sales_data'};
        report_JS_error(err, 'shelfs');
    }
}
function export_sales_data(event) {
    event.stopImmediatePropagation();
    var clicked = $(this);
    var row_data = getRowData(clicked);

    console.log(row_data);

}

$(document).ready(function() {
    shelfs_table = init_datatable();

    $('#shelfs').on('click', 'button.do_export_sales_data', export_sales_data);
    $('#shelfs').on('click', 'tbody td', go_to_shelf_view);

    // Search input
    $('#search_input').on('keyup', function () {
        shelfs_table
            .search(jQuery.fn.DataTable.ext.type.search.string(this.value))
            .draw();
    });

});
