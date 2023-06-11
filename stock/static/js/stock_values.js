
$(document).ready(function() {
    table_article = $('#tableArticle').DataTable({
        "ajax": {
            "url": "get_valuable_stock",
            "data": ""
        },
        "columns":[
            {data:"barcode", "title":"Code-barre", "width": "10em"},
            {data:"display_name", "title":"Article", "width": "50%"},

            {data:"qty_available", "title":"Stock", "width":"5em",
             render: function(data) {
               if (data == parseInt(data,10)) {
		  return data
               } else {
                  return data.toFixed(3)
	       }
             }
            },
            {data:"standard_price", "title":"Prix Achat", "width":"4em",
             render: function(data) {
               return data.toFixed(2)
             }

            },
            {data: "total", "title": "Total",
             render: function(data, type, full) {
               return data.toFixed(2)
             }
            }

        ],

        "searching": true,
        "order": [
            [
                2,
                "desc"
            ]
        ],
        "paging": true,
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
        dom: '<lr<t>ip><"clear"><B>'
    });
});
