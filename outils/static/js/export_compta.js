jQuery(document).ready(function($){

    var month_sel = $("select[name$='_month']"),
        year_sel = $("select[name$='_year']"),
        default_month, default_year

    var now = new Date()
    var current_month = now.getMonth() + 1 //jan = 0
    //Usually, export concerns previous month, so we select it as the default

    if (current_month == 1){
        default_month = 12
        default_year = now.getFullYear() - 1
    }
    else {
        default_month = current_month - 1
        default_year = now.getFullYear()
    }

    month_sel.find("option[value='" + default_month + "']").attr('selected','selected');
    year_sel.find("option[value='" + default_year + "']").attr('selected','selected');

    function wait_for_odoo_export_file (export_id, url) {
        openWaiting('La demande de génération du document Odoo avec toutes les lignes comptables est lancée.<br/>Cela peut prendre plusieurs minutes.')
        $.ajax({url : url + '?phase=1&export_id='+export_id ,
            dataType :'json'
        })
        .done(function(rData){
            if (rData.response && rData.response == true) {
                newWaitingMessage('Le document Odoo est terminé.<br/>Les ventes journalières sont compilées et les identifiants de coop. substitués.')
                $.ajax({url : url + '?phase=2&export_id='+export_id+ '&final_format=' + $('[name="final_format"]').val(),
                    dataType :'json'
                })
                .done(function(rData){
                    if (rData.response && rData.response.file_path) {
                        var download_link = $('<a>').attr('href','/' + rData.response.file_path).text('Télécharger le fichier')
                        $('form').hide()
                        if (rData.response.sells_total) {
                            var preambule = $('<p>').html('A titre indicatif:')
                            var vente_ht = $('<p>').html('Ventes H.T: <strong>' + parseFloat(rData.response.sells_total).toFixed(2) + '</strong> € ')
                            var tva = $('<p>').html('TVA sur ventes: <strong>' + parseFloat(rData.response.vat_total).toFixed(2) + '</strong> € ')

                            $('body')
                            .append(preambule)
                            .append(vente_ht)
                            .append(tva)
                            .append(download_link)
                        } else {
                            $('body').append(download_link)
                        }
                    }
                    closeWaiting()
                })
            }

        })
    }

    $('form').submit(function(){
        var form = $(this)
        var month = month_sel.val()
        var year = year_sel.val()
        if ( month > 0 && year > 0 && is_time_to('request_compta',120000)) {
            month = new String(month).pad('0',2)
            data = {'from': year + '-' + month + '-01',
                    'to': year + '-' + month + '-' + new Date(year, month, 0).getDate()
                   }
            url = form.attr('action')
            post_form(url, data, function(error, rData){
                if (rData.response && !isNaN(rData.response))
                    wait_for_odoo_export_file (rData.response, url)
                else
                    alert("L'export ne peut pas se faire, merci de contacter le service informatique.")
            })

        } else {
            if ( month > 0 && year > 0) {
                alert('Délai trop court entre 2 demandes...')
            } else {
                alert('La sélection du mois n\'est pas valable')
            }
        }
        //always return false because form is processed through ajax call
        return false

    })
})
