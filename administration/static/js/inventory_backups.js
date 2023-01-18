const displayed_results = document.querySelector('#displayed_results');

let files_list_row_click_handler = function(data) {
	load_content('/administration/retrieve_inventory_backup/' + data.file).then(rep => {
		if (typeof rep.content !== "undefined") {
			show_file_content(rep.content);
		} else {
			alert("La récupération du fichier n'a pas aboutie");
		}
	});
}

let content_file_row_click_handler = function(data) {

}

let show_file_content = function(data) {
	let title = '<h3>Saisie du rayon ' + data.name + '</h3>',
	    info = $('<p>').addClass('info');
    $(displayed_results).empty();

    $(displayed_results).append(title);
    info.append('Total HT : <b>' + data.total_price + ' €</b>')
    $(displayed_results).append(info);

    const columns = [
            {data:"id", visible: false},
            {
                data:"barcode",
                title:"Code-barre",
             },
             {
                data:"name",
                title:"Nom article",
             },
            {
                data:"qty_available",
                title:"Théorique",
            },
            {
                data:"qty",
                title:"Compté",
            },
            {
                data:"standard_price",
                title:"Achat HT",
            },
            {
                data:"line_price",
                title:"Total HT",
            },

    ];
    showListInDatatable(displayed_results, data.list_processed, columns, content_file_row_click_handler);
};

let get_selections_data = function() {
	let files = [];
	$('input.select_file_cb:checked').each(function(i,elt) {
		files.push($(elt).val())
	});
	files_list_row_click_handler({file: files.join('|-|')})
}

let show_files_list = function (params) {
   	const columns = [
            {
	            data: "file",
	            className: "dt-body-center",
	            orderable: false,
	            render: function (data) {
	                return `<input type="checkbox" class="select_file_cb" value="${data}">`;
	            },
	            width: "4%"
        	},
            {
                data:"date",
                title:"Jour",
                className: "as-row-clickable"
             },
             {
                data:"hms",
                title:"HMS",
                className: "as-row-clickable"
             },
            {
                data:"shelf_name",
                title:"Rayon",
                className: "as-row-clickable"
            },
    ];
    showListInDatatable(params.parentElt, params.data, columns, files_list_row_click_handler);
    $(document).off('click.select_file');
    $(document).on('click.select_file', '.select_file_cb', function(event){
    	event.stopPropagation();
    	get_selections_data();
    });
};

// Chargement des données et traitement
load_content('/administration/retrieve_inventory_backups').then(rep => {
	if (typeof rep.content !== "undefined") {
		const params = {
			parentElt: document.querySelector('[class="page_body"]'),
			data: rep.content
		};
		show_files_list(params);
	} else {
		alert("La récupération des fichiers n'a pas aboutie");
	}
});