var shelfs_table = null;

function init_datatable() {
    return $('#lists').DataTable({
        data: lists, // data passed at page loading
        rowId: 'id',
        columns:[
            {data: "id", title:"id", "visible": false},
            {
                data:"datetime_created",
                title:"Liste",
                render: function (data, type, full, meta) {
                    return "Liste du " + data;
                }
            },
            {data:"p_nb", title:"Nombre de réfs", width: "10%", className:"dt-body-center"},
            {
                data:"inventory_status",
                title:"Inventaire à faire",
                className:"dt-body-center",
                width: "15%",
                render: function (data, type, full, meta) {
                    if (data == '')
                        return "<button class='btn--primary do_inventory'>Inventaire en rayon</button>";
                    else
                        return "<button class='btn--success do_inventory'>Inventaire en réserve</button>";
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


function go_to_inventory() {
    openModal();

    var clicked = $(this);
    var row_data = shelfs_table.row(clicked.parents('tr')).data();

    // Use local storage to pass data to next page
    if (Modernizr.localstorage) {
        var stored_list = JSON.parse(localStorage.getItem('custom_list_' + row_data.id));

        // Set local storage if key doesn't exist
        if (stored_list == null) {
            localStorage.setItem("custom_list_" + row_data.id, JSON.stringify(row_data));
        }
    }

    document.location.href = "custom_list_inventory/" + row_data.id;
}

$(document).ready(function() {
    console.log(lists);
    shelfs_table = init_datatable();

    $(document).on('click', 'button.do_inventory', go_to_inventory);
});
