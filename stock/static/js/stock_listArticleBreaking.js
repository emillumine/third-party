
/* Module de rupture : Selection un article et le met en rupture à 0 dans les stockes:
 * 
 *  Ecran de rechreche d'un article sur le nom et sur le code barre */


var table_article;
var dataSet =[] ;
var csrftoken;

// lance la recherche sur le nom des l'article
function search_table_article(){
  table_article.ajax.url('get_list_article?rech='+$("#searchInput").val()).load();
}

// Lance la recherche sur les codes barres
function search_article_byBarcode(){
    table_article.ajax.url('get_article_byBarcode?rech='+$("#searchInput").val()).load();
    }


function archiveArticle(){
    var jIdArcticle = { 'idArticle': selArctileData.product_id};
    actionButton("set_archive", jIdArcticle, "/stock/listArticleBreaking");
};

function dontPurchase(){
    var jIdArcticle = { 'idArticle': selArctileData.product_id};
    actionButton("set_dontPurchase", jIdArcticle, "/stock/listArticleBreaking");
};

function actionButton (vUrl,jIdArcticle, followPage){
    
    $.ajaxSetup({   headers: {  "X-CSRFToken": csrftoken  }  });
    $.ajax({
      type: "PUT",
      url: vUrl ,
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


// Initialise  le table des articles
$(document).ready(function() {
    table_article = $('#tableArticle').DataTable( {
      "ajax": {
            "url": "get_list_article_breaking",
            "data": ""
        },
      "columns":[
        {
          data:"image_small",
          "title":"Photo", 
          "render": function (data, type, full, meta) {
            
            debut = '<button id="page1" type="button" data-toggle="modal" data-target=".modal" data-remote=' + full.product_id + ' class="btn btn-primary">'
            fin = "</button>"
            
            return debut + "<img  src='data:image/png;base64," + data + "'>" + fin;
            }
        },
        {data:"name", "title":"Article","width": "50%"},
        {data:"create_date", 
            "render":function (data, type, row){
                my = new Date (data)
                
                return my.toLocaleDateString() +" " + my.toLocaleTimeString();
                },
            "title":"Date","width":"15%"},
        
        {data:"create_date", 
            "render":function (data, type, row){
                my = new Date (data)
                var today = new Date();
                dif = new Number((today - my)/86400000).toFixed(2);
                return dif;
                },
            "title":"Durée","width":"5%"},
            
        {data:"purchase_ok", "width":"5%", 
          "title":"Achetable", "className":"dt-body-center",
          "render": function (data, type, full, meta) {
                
                if (data == true){
                  return '<div><input type="checkbox"  id="bt_dontPurchase" checked><div>';}
                else{
                  return '<div><input type="checkbox"  id="bt_dontPurchase" ><div>';}
            }
          },
        {data:"reception_status",
          "title":"Archive", "className":"dt-body-center",
          "render": function (data, type, full, meta) {
                return "<div><button id='bt_archive' href='#'>Archive</button></div>";
            }
          }
        
      ],
      
      "searching": true,
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


var selArctileData;

// Fenetre de validation sur l'article 

  
  
    $(document).on('click', 'button#bt_archive', function () {
    var row = table_article.row($(this).parents('tr'));
    var data = row.data();
    html ='<div id="askTitle" >Vous êtes sur que cet article doit être archivée ? </div>';
    html += '<div id="showData" ><div id="articleName" >'+data.name+'</div></div>';
    selArctileData = data ; 
    openModal(html, archiveArticle, " - Ok - ");
  
  } );

  $(document).on('click', '#bt_dontPurchase', function () {
    if (!this.checked){
        var row = table_article.row($(this).parents('tr'));
        var data = row.data();
        html ='<div id="askTitle" >Vous êtes sur que cet article ne doit plus être acheter ? </div>';
        html += '<div id="showData" ><div id="articleName" >'+data.name+'</div><div id="articleQty" >'+data.create_date+ '</div></div>';
        selArctileData = data ; 
        openModal(html, dontPurchase, " - Ok - ");
        this.checked = true
    }else{
        this.checked = false
        }
    
  
  } );
