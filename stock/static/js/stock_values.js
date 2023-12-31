
$(document).ready(function() {
    table_article = $('#tableArticle').DataTable({
        "ajax": {
            "url": "get_valuable_stock",
            "data": ""
        },
        "columns":[
            {data:"barcode", "title":"Code-barre", "width": "50%"},
            {data:"display_name", "title":"Article", "width": "50%"},

            {data:"qty_available", "title":"Stock", "width":"15%"
            },
            {data:"standard_price", "title":"Prix achat", "width":"15%"
            }


        ],

        "searching": true,
        "order": [
            [
                2,
                "desc"
            ]
        ],
        "iDisplayLength": 50,
        "language": {
            "emptyTable":     "Pas de donnée",
            "info":           "Affiché : lignes _START_ à _END_ sur _TOTAL_",
            "infoEmpty":      "Affiché : 0 ligne",
            "infoFiltered":   "(filtré de _MAX_ lignes au total)",
            "thousands":      ",",
            "lengthMenu":     "Afficher _MENU_ lignes",
            "loadingRecords": "Loading...",
            "processing":     "Processing...",
            "search":         "Rechercher un article :",
            "searchPlaceholder": "Référence, code-barre",
            "zeroRecords":    "Aucun résultat",
            "paginate": {
                "first":      "Premier",
                "last":       "Dernier",
                "next":       "Suivant",
                "previous":   "Precedant"
            },
            "aria": {
                "sortAscending":  ": activate to sort column ascending",
                "sortDescending": ": activate to sort column descending"
            }
        },
        buttons: [
            {
                extend: 'excelHtml5',
                text: 'Export en Excel',
                className: 'btn--primary btn_export'
            },
        ],
        dom: '<lr<t>ip><"clear"><B>',
    });
});