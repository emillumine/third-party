var shelfs_table = null,
    default_inventory_start_datetime = "0001-01-01 00:00:00";

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
                className:"dt-body-center clickable"
            },
            {data:"name", title:"Nom", className:"clickable"},
            // {data:"description", title:"Description", orderable: false},
            {
                data:"ongoing_inv_start_datetime",
                title:"Début inventaire en cours",
                className:"dt-body-center clickable",
                render: function (data, type) {
                    // Sort on data, not rendering
                    if (type == "sort" || type == 'type')
                        return data;

                    if (data == '0001-01-01 00:00:00')
                        return "";
                    else {
                        var date = new Date(data);

                        return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')}`;
                    }
                }
            },
            {
                data:"date_last_product_added",
                title:"Dernier ajout produit",
                className:"dt-body-center clickable",
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
                title:"Dernier inventaire",
                className:"dt-body-center clickable",
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
            {data:"p_nb", title:"Nombre de réfs", width: "5%", className:"dt-body-center clickable"},
            {
                data:"shelf_value",
                title:"Valeur théorique du rayon",
                render: function (data, type) {
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
                className:"dt-body-center clickable"
            },
            /* NOT IN USE */
            // {
            //     data:"last_inv_delta_percentage",
            //     title:"Delta (dernier inv.)",
            //     width: "5%",
            //     className:"dt-body-center",
            //     render: function (data, type) {
            //         if (type == "sort" || type == 'type')
            //             return data;

            //         if (data == -99999999) {
            //             return '/';
            //         } else {
            //             return data + ' %';
            //         }
            //     }
            // },
            // {
            //     data:"last_inv_losses_percentage",
            //     title:"Pertes (dernier inv.)",
            //     width: "5%",
            //     className:"dt-body-center",
            //     render: function (data, type) {
            //         if (type == "sort" || type == 'type')
            //             return data;

            //         if (data == -99999999) {
            //             return '/';
            //         } else {
            //             return data + ' %';
            //         }
            //     }
            // },
            {
                data:"inventory_status",
                title:"Inventaire à faire",
                className:"dt-body-center",
                width: "15%",
                render: function (data) {
                    if (data == '')
                        return "<button class='btn--primary do_shelf_inventory'>Inventaire en rayon</button>";
                    else
                        return "<button class='btn--success do_shelf_inventory'>Inventaire en réserve</button>";
                }
            },
            {
                data:"id",
                title:"Supprimer inventaire en cours",
                className:"dt-body-center",
                width: "5%",
                render: function () {
                    return `<i class="fas fa-trash delete_ongoing_inv_icon"></i>`;
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
    shelfs_table.rows().every(function () {
        var d = this.data();

        d.shelf_value = -2;
        this.invalidate(); // invalidate the data DataTables has cached for this row

        return 1;
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

function pre_delete_ongoing_inventory() {
    let clicked = $(this);
    let row_data = getRowData(clicked);

    let template = $("#modal_delete_ongoing_inv");

    template.find(".shelf_name").text(row_data.name);

    openModal(
        template.html(),
        () => {
            delete_ongoing_inventory(row_data);
        },
        "Valider",
        false
    );
}

function delete_ongoing_inventory(row_data) {
    openModal();
    $.ajax({
        type: 'POST',
        url: `/shelfs/${row_data.id}/delete_ongoing_inv_data`,
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function() {
            row_data.inventory_status = '';
            row_data.ongoing_inv_start_datetime = default_inventory_start_datetime;

            shelfs_table
                .row('#'+row_data.id)
                .data(row_data)
                .draw();

            // Delete shelf data from localstorage
            if (Modernizr.localstorage) {
                localStorage.removeItem('shelf_' + row_data.id);
            }

            closeModal();
        },
        error: function(data) {
            if (typeof data.responseJSON != 'undefined') {
                console.log(data.responseJSON);
            }
            closeModal();
            alert("Une erreur est survenue...");
        }
    });
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
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    // Check if local data is outdated
    for (let shelf of shelfs) {
        let stored_shelf = JSON.parse(localStorage.getItem('shelf_' + shelf.id));

        if (
            stored_shelf !== null
            && stored_shelf.ongoing_inv_start_datetime !== undefined
            && shelf.ongoing_inv_start_datetime !== stored_shelf.ongoing_inv_start_datetime
        ) {
            localStorage.removeItem('shelf_' + shelf.id);
        }
    }

    shelfs_table = init_datatable();
    get_shelfs_extra_data();

    $(document).on('click', 'button.do_shelf_inventory', go_to_shelf_inventory);
    $(document).on('click', 'tbody td .delete_ongoing_inv_icon', pre_delete_ongoing_inventory);
    $('#shelfs').on('click', 'tbody td.clickable', go_to_shelf_view);

    // Search input
    $('#search_input').on('keyup', function () {
        shelfs_table
            .search(jQuery.fn.DataTable.ext.type.search.string(this.value))
            .draw();
    });

});
