/*
Cette page affiche les détails des produits d'un rayon

Informations affichées :
- Quantité en stock théorique
*/

var parent_location = '/shelfs',
    shelf,
    table_products,
    search_chars = []

/* UTILS */

// Round a decimal value
function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function back() {
  document.location.href = parent_location
}

// Set search field with product name when barcode is read
function select_product_from_bc(barcode) {
  $.each(shelf_products, function(i,e) {
    if (e.barcode == barcode) {
      $('#search_input').val(e.name)
      table_products.search(jQuery.fn.DataTable.ext.type.search.string(e.name)).draw()
    }
  })
}

/* LIST HANDLING */

// Init Data & listeners
function initList() {
  // Init table for items to process
  table_products = $('#table_shelf_products').DataTable( {
    data: shelf_products,
    columns: [
      {data:"id", title: "id", visible: false},
      {data:"name", title:"Produit"},
      {
        data:"qty_available",
        title:"Stock théorique",
        width: "10%",
        render: function (data, type, full) {
          return round(data, 2) + '  ' + full.uom_id[1]
        }
      },
      {
        data:"last_inv_delta",
        title:"Delta (dernier inv.)",
        width: "10%",
        className:"dt-body-center",
        render: function (data, type, full, meta) {
          if (type == "sort" || type == 'type')
            return data

          if (data == -99999999) {
            return  '/'
          } else {
            return data
          }
        }
      },
      {
        data:"last_inv_losses",
        title:"Pertes (dernier inv.)",
        width: "10%",
        className:"dt-body-center",
        render: function (data, type, full, meta) {
          if (type == "sort" || type == 'type')
            return data

          if (data == -99999999) {
            return  '/'
          } else {
            return data + ' €'
          }
        }
      },
    ],
    rowId : "id",
    order: [[ 0, "asc" ]],
    paging: false,
    dom: 'lrtip',       // Remove the search input from that table
    language: {url : '/static/js/datatables/french.json'}
  });


  /* Listeners on table & search input */

  // Search input for table
  $('#search_input').on('keyup', function () {
    table_products
      .search(jQuery.fn.DataTable.ext.type.search.string(this.value))   // search without accents (see DataTable plugin)
      .draw()
  })
}


/* INIT */

// Get shelf data from server if not in local storage
function get_shelf_data() {
  $.ajaxSetup({   headers: {  "X-CSRFToken": getCookie('csrftoken')  }  });
  $.ajax({
    type: 'GET',
    url: '../' + shelf.id,
    dataType:"json",
    traditional: true,
    contentType: "application/json; charset=utf-8",
    success: function(data) {
      shelf = data.res
      init()
    },
    error: function(data) {
      if (typeof data.responseJSON != 'undefined' ) {
        console.log(data.responseJSON)
      }
      alert('Les données n\'ont pas pu être récupérées, réessayez plus tard.');
    }
  })
}

// Init page : to be launched when shelf data is here
function init() {
  // Set shelf name in DOM
  $('#shelf_name').text(shelf.name)

  // Products passed at page loading as 'shelf_products'
  initList()

  // Barcode reader: listen for 13 digits read in a very short time
  $('#search_input').keypress(function(e) {
    if (e.which >= 48 && e.which <= 57) {
        search_chars.push(String.fromCharCode(e.which));
    }
    if (search_chars.length >= 13) {
      var barcode = search_chars.join("");
      if (!isNaN(barcode)) {
        search_chars = [];
        setTimeout(function(){
          select_product_from_bc(barcode);
        }, 300);
      }
    }
  })
}


$(document).ready(function() {
  // Get Route parameter
  var pathArray = window.location.pathname.split('/')
  shelf = {id: pathArray[pathArray.length-1]}

  // Get shelf data from local storage
  if (Modernizr.localstorage) {
    var stored_shelf = JSON.parse(localStorage.getItem('shelf_' + shelf.id))

    if (stored_shelf != null) {
      shelf = stored_shelf
      init()
    } else {
      // Get shelf info if not coming from shelves list
      get_shelf_data()
    }
  } else {
    get_shelf_data()
  }

  // listeners
  // Cancel search
  $('.cancel_search').on('click', function () {
    $('#search_input').val('')
    table_products.search('').draw()
  })
});
