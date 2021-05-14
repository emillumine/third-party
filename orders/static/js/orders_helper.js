var suppliers_list = [],
    products_table = null,
    selected_suppliers = [],
    products = [];

const datatable_base_columns = ['Produit']

function save_supplier_products(supplier, new_products) {
    products = products.concat(new_products);

    // TODO: Map supplier and products
    // TODO: Concatenate same product in products list
}

function display_products() {
    // Empty datatable if already exists
    if (products_table) {
        products_table.destroy();
    }

    /* 
    *   TODO: 
    *       - prepare data for datatable:
    *           for each product: 1 column for each supplier
    *           if product not related to the supplier: 'X' (clikable -> value = '')
    *           else: '' (render input)
    *       - dynamically add columns to datatables
    *       - remove "width: 100%" from table and allow vertical scrolling in case of many suppliers
    *       ...
    */

    products_table = $('#products_table').DataTable({
        data: products,
        columns:[
            {
                data:"name",
                title:"Produit"
            }
        ],
        order: [
            [
                0,
                "asc"
            ]
        ],
        dom: 'lrtip',   // TODO: change DOM display?
        iDisplayLength: 100,
        language: {url : '/static/js/datatables/french.json'}
    });

    $('.main').show();
}

$(document).ready(function() {
    $.ajaxSetup({ headers: { "X-CSRFToken": getCookie('csrftoken') } });

    openModal();

    // Get suppliers
    $.ajax({
        type: 'GET',
        url: "/orders/get_suppliers",
        dataType:"json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        success: function(data) {
            suppliers_list = data.res;

            // Set up autocomplete on supplier input
            $( "#supplier_input" ).autocomplete({
                source: suppliers_list.map(a => a.display_name)
            });

            closeModal();
        },
        error: function(data) {
            err = {msg: "erreur serveur lors de la récupération des fournisseurs", ctx: 'get_suppliers'};
            if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                err.msg += ' : ' + data.responseJSON.error;
            }
            report_JS_error(err, 'orders');

            closeModal();
            alert('Erreur lors de la récupération des fournisseurs, rechargez la page plus tard');
        }
    });

    $("#supplier_form").on("submit", function(e) {
        e.preventDefault();

        const user_input = $("#supplier_input").val();

        // Check if user input is a valid supplier
        let supplier = null;
        for (const supplier_item of suppliers_list) {
            if (user_input === supplier_item.display_name) {
                supplier = supplier_item;
            }
        }

        if (supplier != null) {
            openModal();

            selected_suppliers.push(supplier);

            let url = "/orders/get_supplier_products";
            url += "?sid=" + encodeURIComponent(supplier.id);

            // Fetch supplier products
            $.ajax({
                type: 'GET',
                url: url,
                dataType:"json",
                traditional: true,
                contentType: "application/json; charset=utf-8",
                success: function(data) {
                    save_supplier_products(supplier, data.res.products);
                    // TODO: display suppliers on page
                    display_products();
                    $("#supplier_input").val("")
                    closeModal();
                },
                error: function(data) {
                    err = {msg: "erreur serveur lors de la récupération des produits", ctx: 'get_supplier_products'};
                    if (typeof data.responseJSON != 'undefined' && typeof data.responseJSON.error != 'undefined') {
                        err.msg += ' : ' + data.responseJSON.error;
                    }
                    report_JS_error(err, 'orders');
        
                    closeModal();
                    alert('Erreur lors de la récupération des produits, réessayer plus tard.');
                }
            });

        } else {
            alert("Le fournisseur renseigné n'est pas valide.\n" 
            + "Veuillez sélectionner un fournisseur dans la liste déroulante.")
        }

    })
});
