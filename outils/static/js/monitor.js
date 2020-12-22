var results_table = null;

function coop_init_datatable(params, data, cols, action_btn) {
    var buttons = [];
    var columns = [];


    $.each(cols, function(i, e) {
        columns.push(e);
    });



    var settings = {
        dom: '<lf<t>ip><"clear"><B>',
        lengthMenu : [
            [
                50,
                100,
                150,
                200,
                -1
            ],
            [
                50,
                100,
                150,
                200,
                'Tout'
            ]
        ],
        pageLength : 50,
        buttons: buttons,

        columns: columns,
        //select: select ,
        rowId : "_id",
        data : data,
        language: {url : '/static/js/datatables/french.json'}
    };


    return $('#results').DataTable(settings);
}

var viewJSErrors = function() {
    $.get('/monitor/js_errors', {dataType: 'json'})
        .done(function(rData) {
            if (typeof rData.res.content != "undefined") {
                if (results_table) results_table.destroy();
                var data = [];
                var cols = [
                    {data: 'date', title: "Date"},
                    {data: 'module', title: "Module"},
                    {data: 'agent', title: "Signature nav."},
                    {data: 'context', title: "Contexte"},
                    {data: 'message', title: "Message"}

                ];

                rData.res.content.forEach(function(e) {
                    var line = e;

                    if (typeof e.data == 'object') {
                        line.context = e.data.ctx;
                        line.message = e.data.msg;
                        delete e.data;
                    } else {
                        line.context = '?';
                        line.message = e.data;
                    }
                    data.push(line);
                });
                console.log(data);
                results_table = coop_init_datatable(null, data, cols);
            }
        });
};

$(document).ready(function() {
    if (coop_is_connected()) {
        $('header').show();
        $('.nav-list .js_errors').click(viewJSErrors);
    }
});