var active_table = null,
    loader = $('#main_content img.loading'),
    local_pdt_db = null,
    search_input = $('div.search input'),
    search_div = $('div.search'),
    search_result = $('#search_result'),
    bc_scanner = $('#barcode_scanner');

function getLocalSelected() {
    var local_in_process = localStorage.getItem("selected_products") || "[]"
    return JSON.parse(local_in_process)
}

function setLocalSelected(lip) {
    localStorage.setItem("selected_products",JSON.stringify(lip))
}

function getLocalPdtDB() {
    var local_pdt_db = JSON.parse(localStorage.getItem("products_db") || "{}")
    if (typeof (local_pdt_db.list) == "undefined")
        local_pdt_db.list = []
    return local_pdt_db
}

function setLocalPdtDB(lpdb) {
    localStorage.setItem("products_db",JSON.stringify(lpdb))
}

function display_in_search_results(matching) {
    var ul = $('<ul>');
    $.each(matching, function(i,e){
        var li = $('<li>').attr('data-index',e.index).text(e.doc.barcode + ' ' + e.doc.display_name)
        ul.append(li)
    })
    search_result.html(ul)
}

function search_in_pdt_list(kwords) {
    if (kwords.length > 3) {
        var matching = []
        var is_bc = !isNaN(kwords)
        if (!is_bc)
            kwords = jQuery.fn.DataTable.ext.type.search.string(kwords.toLowerCase())
        $.each(local_pdt_db.list, function(i,e) {
            if (is_bc) {
                if (e.barcode && e.barcode.indexOf(kwords) === 0) {
                    matching.push({doc:e,index:i})
                }

            } else  {
                var p_name = jQuery.fn.DataTable.ext.type.search.string(e.display_name)
                if (p_name.toLowerCase().indexOf(kwords) > -1)
                    matching.push({doc:e,index:i})
            }
        })
        if (matching.length > 0) {
            if (matching.length == 1 && is_bc == true){
                add_product_to_table(matching[0].index)
            } else {
                display_in_search_results(matching)
            }
        }
    } else {
        search_result.html('')
    }
    
}   

$(document).pos();
$(document).on('scan.pos.barcode', function(event){
        //access `event.code` - barcode data
        var barcode = event.code
        if (barcode.length >=13) {
            barcode = barcode.substring(barcode.length-13)
            search_in_pdt_list(barcode)
        } else {
            console.log($(':focus').attr('type'))
            console.log(new Date().getTime() + ' -> '+barcode)
        }
        
}); 

function destocking_record() {
    console.log('envoyer les informations à Django')
}

function init_table_interface (data) {
    if (active_table)
        active_table.destroy()
    var cols =  [
                       {data: 'display_name', title: "Nom"},
                       {data: 'qty', title: "Quantité", defaultContent: ""}
                       
                ]
    var action_btn = {
                        text: 'Valider le déstockage',
                        action : function(e,dt) {
                            if (dt.rows().indexes().length > 0)
                                openModal('Valider le déstockage', destocking_record, 'Enregistrer');
                            else
                                alert("Impossible, il n'y a aucun produit !")
                            
                        }
                    };
    var params = {no_search: true}
       
    active_table = coop_init_datatable(params, data, '.pdt_liste_to_transfert', cols, action_btn);
}
function add_product_to_table(p_index) {
    var local_selected = getLocalSelected();
    selected_p = local_pdt_db.list[p_index]
    if (selected_p.uom_id[0] == 1)
        selected_p.qty = 1
    console.log('p_index='+p_index)
    console.log(selected_p)
    local_selected.push(selected_p)
    setLocalSelected(local_selected)
    search_result.html('')
    init_table_interface(local_selected)
}
var need_to_load_odoo_products = true;
local_pdt_db = getLocalPdtDB()
local_selected = getLocalSelected()
if (local_pdt_db.list.length > 0) {
    if (new Date().getTime() - local_pdt_db.created_at < 7200000) {
        // if data have been retrieved less than 2h ago, no need to make ajax call
        need_to_load_odoo_products = false;
        loader.hide()
        search_div.show()
    }
    
    
}
if (need_to_load_odoo_products == true) {
    $.ajax('get_all_available_products').done(function(rData){
        local_pdt_db.list = rData
        local_pdt_db.created_at = new Date().getTime()
        setLocalPdtDB(local_pdt_db)
        loader.hide()
        search_div.show()
    });
} 

search_input.on('keyup focus', function(){
    search_in_pdt_list($(this).val())
})

search_div.on('click', 'li', function(){
    var p_index = $(this).data('index')
    add_product_to_table(p_index) 
})

if (local_selected.length > 0) {
    init_table_interface(local_selected)
}