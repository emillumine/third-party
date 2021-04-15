
/* Module de rupture : Selection un article et le met en rupture à 0 dans les stockes:
 *
 *  Ecran de rechreche d'un article sur le nom et sur le code barre */


var table_article = null;
var dataSet =[];
var csrftoken = '';

// lance la recherche sur le nom des l'article
function search_table_article() {
    table_article.ajax.url('get_list_article?rech='+$("#searchInput").val()).load();
}

// Lance la recherche sur les codes barres
function search_article_byBarcode() {
    table_article.ajax.url('get_article_byBarcode?rech='+$("#searchInput").val()).load();
}


// Initialise  le table des articles
$(document).ready(function() {
    table_article = $('#tableArticle').DataTable({
        "ajax": {
            "url": "get_list_article?rech=",
            "data": ""
        },
        "columns":[
            {
                data:"image_small",
                "title":"Photo",
                "render": function (data, type, full) {

                    debut = '<button id="page1" type="button" data-toggle="modal" data-target=".modal" data-remote=' + full.id + ' class="btn btn-primary">';
                    fin = "</button>";

                    return debut + "<img  src='data:image/png;base64," + data + "'>" + fin;
                }
            },
            {data:"name", "title":"Article", "width": "50%"},
            {data:"qty_available", "title":"En Stock", "width": "10%"},
            {data:"uom_id",
                "render":function (data) {

                    return data[1];
                },
                "title":"Unité", "width":"5%"},
            {data:"reception_status",
                "title":"Rupture", "className":"dt-body-center",
                "render": function (data, type, full) {
                    if (full.qty_available > 0) {
                        return "<div><button id='bt_change' href='#'>Rupture</button></div>";
                    } else {
                        return "<div>--</div>";
                    }
                }
            }
        ],

        "searching": false,
        "order": [
            [
                0,
                "desc"
            ]
        ],
        "iDisplayLength": 25,
        "language": {
            "emptyTable":     "Pas de donnée",
            "info":           "Affiché : lignes _START_ à _END_ sur _TOTAL_",
            "infoEmpty":      "Affiché : 0 ligne",
            "infoFiltered":   "(filtré de _MAX_ lignes au total)",
            "thousands":      ",",
            "lengthMenu":     "Afficher _MENU_ lignes",
            "loadingRecords": "Loading...",
            "processing":     "Processing...",
            //"search":         "Rechercher un article :",
            //"searchPlaceholder": "Référence, nom du fournisseur...",
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

//barcode-reader


$(document).ready(function() {
    var pressed = false;
    var chars = [];

    $(window).keypress(function(e) {
        if (e.which >= 48 && e.which <= 57) {
            chars.push(String.fromCharCode(e.which));
        }

        if (pressed == false) {
            setTimeout(function() {
                if (chars.length >= 13) {
                    var barcode = chars.join("");

                    if (!isNaN(barcode)) {
                        chars = [];
                        pressed = false;
                        search_article_byBarcode();
                    }

                }

            }, 300);
        }
        pressed = true;
    });
});

$(document).ready(function() {
    csrftoken = getCookie('csrftoken');
});

// Lancement de la rupture sur l'article choisie
function ruptureArticle() {

    var jIdArcticle = { 'idArticle': selArctileData.id, 'uom_id' :  selArctileData.uom_id[0] };

    $.ajaxSetup({ headers: { "X-CSRFToken": csrftoken } });
    $.ajax({
        type: "PUT",
        url: "set_rupture",
        //dataType: "json",
        traditional: true,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(jIdArcticle),

        success: function() {

            document.location.href = "/stock/listArticleBreaking";
        },
        error: function(resultat, statut, erreur) {
            alert('Erreur' + erreur);

        }
    });
}

var selArctileData = null;

// Fenetre de validation sur l'article

$(document).on('click', 'button#bt_change', function () {
    var row = table_article.row($(this).parents('tr'));
    var data = row.data();

    html ='<div id="askTitle" >Vous êtes sur que cet article est en rupture de stock ? </div>';
    html += '<div id="showData" ><img id ="showImg" WIDTH="100" HEIGHT="100" src="data:image/png;base64,'+data.image_small+'"><div id="articleName" >'+data.name+'</div><div id="articleQty" >'+data.qty_available+ ' - '+data.uom_id[1] + '</div></div>';
    selArctileData = data;

    openModal(html, ruptureArticle, " - Ok - ");

});



