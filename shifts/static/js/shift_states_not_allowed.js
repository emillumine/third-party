// Request a delay for the current member
function request_delay() {
    //Loading on
    openModal();
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

    $.ajaxSetup({headers: {"X-CSRFToken": getCookie('csrftoken')}});
    $.ajax({
        type: 'POST',
        url: '/shifts/request_delay',
        dataType: 'json',
        timeout: 3000,
        data: {
            idPartner: dataPartner.partner_id,
            verif_token: dataPartner.verif_token,
            start_date: date
        },
        success: function(doc) {
            document.location.reload();
        },
        error: function() {
            closeModal();
            alert('Impossible de créer l\'extension. Je dois passer au Bureau des membres pour régler le problème.');
        }
    });
}

$(document).ready(function() {
    $('#'+dataPartner.cooperative_state).removeAttr('hidden');

    if (dataPartner.cooperative_state == "suspended") {
    // Member can ask for 6 delays, which is 24 weeks after entering alert status
    // 'date_alert_stop' field is begining of alert + 4 weeks
        var date_end_alert = new Date(dataPartner.date_alert_stop);

        date_end_alert.setDate(date_end_alert.getDate()+20*7);

        if (date_end_alert < new Date()) {
            $('#no_delay').removeAttr('hidden');
        } else {
            $('#delay').removeAttr('hidden');
        }
    } else if (dataPartner.cooperative_state == "unsubscribed") {
        $('#unsubscribed').show();
    } else if (dataPartner.cooperative_state == "exempted") {
        $('#exempted').show();
    } else {
        $('body').append('Merci de prendre contact avec le Bureau des membres pour examiner votre situation.');
    }
});
