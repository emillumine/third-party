
/* Module de rupture : Selection un article et le met en rupture à 0 dans les stockes:
 *
 *  Ecran de rechreche d'un article sur le nom et sur le code barre */


// Initialise  le table des articles
$(document).ready(function() {
    table_article = $('#tableArticle').DataTable({
        "ajax": {
            "url": "get_saleWitheNotSale",
            "data": ""
        },
        "columns":[

            {data:"name", "title":"Article", "width": "50%"},


            {data:"qty", "title":"Qt. en vendu", "width":"15%"
            },
            {data:"daySale", "title":"Jours de vente", "width":"15%"
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
            "searchPlaceholder": "Référence, nom du fournisseur...",
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
        }
    });
});

/* Listener */


$(document).on('click', '#dp_Search', function() {
    search_table_article();
});

var csrftoken;

$(document).ready(function() {
    csrftoken = getCookie('csrftoken');
});


// Lancement de la rupture sur l'article choisie
function ruptureArticle() {
    var jIdArcticle = { 'idArticle': selArctileData.id, 'uom_id' :  selArctileData.uom_id };

    actionButton("set_rupture", jIdArcticle, "/stock/stockQuantLastSale");
}
function archiveArticle() {
    var jIdArcticle = { 'idArticle': selArctileData.id};

    actionButton("set_archive", jIdArcticle, "/stock/stockQuantLastSale");
}

function dontPurchase() {
    var jIdArcticle = { 'idArticle': selArctileData.id};

    actionButton("set_dontPurchase", jIdArcticle, "/stock/stockQuantLastSale");
}
function actionButton (vUrl, jIdArcticle, followPage) {

    $.ajaxSetup({ headers: { "X-CSRFToken": csrftoken } });
    $.ajax({
        type: "PUT",
        url: vUrl,
        //dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(jIdArcticle),
        success: function(data) {
            document.location.href = followPage;
        },
        error: function(resultat, statut, erreur) {
            alert('Erreur' + erreur);

        }
    });
}

var selArctileData;

// Fenetre de validation sur l'article

$(document).on('click', 'button#bt_change', function () {
    var row = table_article.row($(this).parents('tr'));
    var data = row.data();

    html ='<div id="askTitle" >Vous êtes sur que cet article est en rupture de stock ? </div>';
    html += '<div id="showData" ><div id="articleName" >'+data.name+'</div><div id="articleQty" >'+data.stockqt+ ' - '+data.uom_id + '</div></div>';
    selArctileData = data;
    openModal(html, ruptureArticle, " - Ok - ");
});

$(document).on('click', 'button#bt_archive', function () {
    var row = table_article.row($(this).parents('tr'));
    var data = row.data();

    html ='<div id="askTitle" >Vous êtes sur que cet article doit être archivée ? </div>';
    html += '<div id="showData" ><div id="articleName" >'+data.name+'</div><div id="articleQty" >'+data.stockqt+ ' - '+data.uom_id + '</div></div>';
    selArctileData = data;
    openModal(html, archiveArticle, " - Ok - ");

});
$(document).on('click', '#bt_dontPurchase', function () {

    if (!this.checked) {
        var row = table_article.row($(this).parents('tr'));
        var data = row.data();

        html ='<div id="askTitle" >Vous êtes sur que cet article ne doit plus être acheter ? </div>';
        html += '<div id="showData" ><div id="articleName" >'+data.name+'</div><div id="articleQty" >'+data.stockqt+ ' - '+data.uom_id + '</div></div>';
        selArctileData = data;
        openModal(html, dontPurchase, " - Ok - ");
        this.checked = true;
    } else {
        this.checked = false;
    }

});





