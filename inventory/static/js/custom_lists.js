var shelfs_table = null,
    delete_icon = '<i class="fas fa-trash"></i>';



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
            {
                data:"partner",
                title:"Fournisseur"
            },
            {
                data:"order",
                title:"Ref."
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
            },
            {
                data: null,
                defaultContent: delete_icon,
                orderable: false,
                width: "30px",
                className: 'action',
                targets:   0
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

var rowGetData = function(clicked) {
    var row = shelfs_table.row(clicked.parents('tr'));


    return row.data();
};

function deleteRow() {
    var clicked = $(this),
        data = rowGetData(clicked);

    openModal(
        'Etes-vous sûr de vouloir supprimer la liste du ' + data.datetime_created+ ' ?',
        function() {
            post_form(
                '/inventory/delete_custom_list',
                {id: data.id},
                function(err, result) {
                    closeModal();
                    if (!err) {
                        if (typeof result.success !== "undefined" && result.success == true) {
                            clicked.parents('tr').remove();
                            alert("Liste détruite");
                        } else {
                            alert(JSON.stringify(result));
                        }

                    } else {
                        console.log(err);
                    }


                }
            );
        },
        'Oui'
    );
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
    shelfs_table = init_datatable();

    $(document).off('.do_inv, .del_row')
        .on('click.do_inv', 'button.do_inventory', go_to_inventory)
        .on('click.del_row', '.fa-trash', deleteRow);
});
