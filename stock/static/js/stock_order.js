
/* Page de la commande: 
 * Creation d'un nouvelle commande d'un fournisseur. 
 *  Liste des articles d'un fournisseur (Recherche des fournisseurs avec un prés saisi)
 *  Sur un article on a les stocks, la moyenne des ventes des 4 dernière semaines en incluant les rupture
 *  Visualisation par un graph des vente des 4 dernier semaines
 *  Pré-saisie des qantitee à commander en fonction du stock, des moyennes de vente, d'un coef multi et la date de la prochaine commande
 * 
 * */


var table_article;
var dataSet =[] ;
var csrftoken;
var four_id=0;

// lance la recherche sur le nom des l'article
function search_table_article(){

    table_article.ajax.url('get_list_article_fournisseur/'+four_id+"/").load();
    
    
}

// Initialise  le table des articles
$(document).ready(function() {
    table_article = $('#tableArticle').DataTable( {
      "ajax": {
            "url": "get_list_article_fournisseur/1712/",
            "data": "" 
            
        },
      "columns":[
        {data:"name_template", "title":"Article","width": "50%"},
        {data:"stock_qty", "title":"En Stock", "width": "10%"},
        {data:"average", "title":"Moyen de vente", "width": "10%"},
        {data:"average_breaking", "title":"Moyenne vent rupture", "width": "10%"},
      ],
      
      "searching": false,
      "order": [[ 0, "desc" ]],
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


$(document).on('click','#dp_Search',function(){search_table_article();});

//barcode-reader


$(document).ready(function() {
    var pressed = false; 
    var chars = []; 
    $(window).keypress(function(e) {
        if (e.which >= 48 && e.which <= 57) {
            chars.push(String.fromCharCode(e.which));
        }
        
        if (pressed == false) {
            setTimeout(function(){
                if (chars.length >= 13) {
                    var barcode = chars.join("");
                    if (!isNaN(barcode)) {
                        chars = [];
                        pressed = false;
                        search_article_byBarcode();
                    }
                    
                }
                
            },300);
        }
        pressed = true;
    });
});

$(document).ready(function() {
 csrftoken = getCookie('csrftoken');
});

// Lancement de la rupture sur l'article choisie
function ruptureArticle(test){

    var jIdArcticle = { 'idArticle': selArctileData.id, 'uom_id' :  selArctileData.uom_id[0] };
    
      
    $.ajaxSetup({   headers: {  "X-CSRFToken": csrftoken  }  });
    $.ajax({
      type: "PUT",
      url: "set_rupture" ,
      //dataType: "json",
      traditional: true,
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(jIdArcticle),

      success: function(data) {
        
        document.location.href = "/stock";
      },
      error: function(resultat, statut, erreur) {
        alert('Erreur' + erreur);
        
      }
    });
    }

var selArctileData;




$(document).ready(function() {
    var options = {
        url : "get_liste_supplyer",
        list: {
                maxNumberOfElements: 8,
                match: {
                    enabled: true
                },
                sort: {
                    enabled: true
                },
                onSelectItemEvent: function() {
                    four_id = $("#template-custom").getSelectedItemData().id;
                }
            
            }
            ,
            
        getValue: "display_name",
        template: {
            type: "display_name",
            //method: function(value, item) {
            //    return "<img src='" + item.icon + "' /> | " + item.type + " | " + value;
            //}
        }
    };

    $("#template-custom").easyAutocomplete(options);
});


