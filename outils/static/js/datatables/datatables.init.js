
function coop_init_datatable(params,data, domsel, cols, action_btn) {
    var buttons = []
    var columns = []    
    var dom = '<lf<t>ip><"clear"><B>'                              
    var select = {
                    style:    'os',
                    selector: 'td:first-child'
                    
                 };
    if (action_btn) {
        buttons = [
                    {
                        extend: 'selected',
                        text: 'Supprimer les sélectionnés',
                        action: function ( e, dt, button, config ) {
                            dt.rows({selected: true}).remove().draw();
                            
                        },
                    },
                    {
                        extend: 'selected',
                        text: 'Ne garder que les sélectionnés',
                        action: function ( e, dt, button, config ) {
                            dt.rows({selected: false}).remove().draw();
                            
                        },
                    }
                  ]
    
        buttons.push(action_btn)

        columns = [ {
                        data: null,
                        defaultContent: '',
                        orderable: false,
                        className: 'select-checkbox',
                        targets:   0
                    }
                  ]
        select.style = 'multi'
       
    }
   
    
    $.each(cols,function(i,e){
            columns.push(e);
    });
    var settings = {
                            dom: dom,
                            lengthMenu : [[10,25,50,100,-1],[10,25,50,100,'Tout']],
                            buttons: buttons,
                            
                            columns: columns,
                            select: select ,
                            rowId : "id",
                            data : data,
                            language: {url : '/static/js/datatables/french.json'},
                            createdRow: function(row, rdata, index) {
                                if (coop_is_weighted_product(rdata) === true) {
                                    $(row).addClass("to_weight");
                                }
                            },
                            initComplete: function() {
                                if (! coop_is_connected())
                                    $('#main_content input[type="search"]').attr('disabled','disabled')
                                
                            }
                    }
    if (params) {
        if (params.page) {
            settings.displayStart = params.page.start
        }
        if (params.ordering) {
            settings.order = params.ordering
        }
        if (params.rowCallback) {
            settings.rowCallback = params.rowCallback
        }
        if (params.no_search) {
            settings.dom = '<l<t>ip><"clear"><B>'
        }
    }
    active_table = $('#main_content').find('table'+domsel).DataTable(settings);

    return active_table
}
