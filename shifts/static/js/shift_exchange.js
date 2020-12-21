/*
Deal with the shift exchanges or shift registrations for ftop partners
  or ABCD partners who need to catch-up for a missed shift.

(ftop = volant; ABCD = inscrit à un créneau)
*/

var optDate = {weekday: "long", year: "numeric", month: "long", day: "numeric"};
var listeShiftPartner =[];
var listStates = {
    not_concerned: "Non concerné",
    up_to_date:" A jour ",
    alert:"Alerte",
    exempted:"Exempté",
    delay:"Délai (extension en cours)",
    suspended:"Suspendu(e)",
    unsubscribed:"Désinscrit",
    unpayed: "Impayé"
};

let limitDate = null;
let dp = null;
let lastY = null;
let loaded_events = [];
let make_up_nb = 0;
let non_regular_shifts = [];
let can_make_exchange = false;
let can_add_shift = false;


// Init Dom for member's shifts
function iniListShift(listeShift, echange) {
    if (echange) {
        $('#shifts').html("");
        listeShift.forEach(function f(shift) {
            var dateStart = new Date(shift.date_begin);

            monshift = '<div class="shift_list_item"><label> <input type="checkbox" name = "shiftRadio" value="' + shift.id + '"" /> <span class="shift_booked">' + dateStart.toLocaleDateString("fr-fr", optDate) + " --- " + dateStart.toLocaleTimeString("fr-fr") + '</span></label></div>';
            $('#shifts').append(monshift);
        });
    }
}

// Load the shifts the member is registered to
function loadShiftPartner(partner_id) {
    $.getJSON('/shifts/get_list_shift_partner/' + partner_id, function(donnees) {
        // Init the partner's shifts list
        listeShiftPartner = [];
        donnees.forEach(function f(shift) {
            var dateStart = new Date(shift.date_begin);

            if (dateStart.getHours() < 22) {
                listeShiftPartner.push(shift);
            }
        });

        $('#shift_msg').remove();
        $('#partnerData').append('<div id="shift_msg"></div>');
        if (dataPartner.in_ftop_team == "True" || listeShiftPartner.length > 0) {
        // ftop, no shift planned
            if (listeShiftPartner.length == 0) {
                var date = new Date(dataPartner.next_regular_shift_date);
                // ftop looses 1 point if points >=0, looses 2 otherwise
                var lost_points = "un point";

                if (dataPartner.final_ftop_point < 0) {
                    lost_points = "deux points";
                }

                var msg = "Je m'inscris à un service, en cliquant sur un des services du calendrier ci-dessous.<br/>";
                /*** TODO : add message structure to html #templates
          msg += "Si je ne fais pas de service avant le " + date.toLocaleDateString("fr-fr") + ", mon compteur perdra " + lost_points + ".  <i class=\"fas fa-info-circle\" title=\"Je clique pour avoir plus de détails.\"></i><div class=\"infocircle\"> <div class=\"close\" onclick=\"closeInfo(this)\"><i class=\"far fa-times-circle\"></i></div>Mon compteur sera diminué de 1 point le "+date.toLocaleDateString("fr-fr")+" si mon solde est supérieur ou égal à 0, sinon de 2 points, comme tous <strong>les jeudis de semaine A</strong> pour tou.te.s les volant.e.s.</div>"
          **/

                $('#shift_msg').append('<span id="new_shift_msg" class="highlight"><br />'+msg+'</span>');
            } else {
                $('#new_shift_msg').remove();

                // Set DOM for partner's shifts and shift message for ftops
                iniListShift(listeShiftPartner, true);
                if (dataPartner.in_ftop_team == "True") {
                    $('#shift_msg').append("<br /><strong>Je peux choisir d'autres services pour les mois à venir ou échanger un de ceux de la liste.</strong>");
                }
            }
        }
    });
}

// Proceed to shift exchange or registration
function changeShift(idOldRegister, idNewShift) {
    if (is_time_to('change_shift')) {
        openModal(); // loading on

        tData = 'idNewShift=' + idNewShift +'&idPartner=' + dataPartner.partner_id + '&in_ftop_team=' + dataPartner.in_ftop_team + '&verif_token=' + dataPartner.verif_token;
        if (idOldRegister == "") {
            tUrl = '/shifts/add_shift';
        } else {
            register = listeShiftPartner.find(function(shift) {
                return shift.id === Number(idOldRegister);
            });
            tUrl = '/shifts/change_shift';
            tData = tData + '&idOldShift='+ register.shift_id[0] +'&idRegister=' + idOldRegister;
        }

        $.ajaxSetup({headers: {"X-CSRFToken": getCookie('csrftoken')}});
        $.ajax({
            type: 'POST',
            url: tUrl,
            dataType:"json",
            data: tData,
            timeout: 3000,
            complete: function () {
                $("#box_load").fadeOut();
            },
            success: function(data) {
                if (data.result) {
                    closeModal();
                    setTimeout( // Due to chrome effect
                        function() {
                            parent.window.postMessage('scrollToTop', '*');
                            msg = "Parfait! ";
                            if (idOldRegister == "") {
                                msg += "Le service choisi a été ajouté.";
                            } else {
                                msg += "Le service a été échangé.";
                            }
                            alert(msg);
                            loadShiftPartner(dataPartner.partner_id);
                            $('#dp').fullCalendar('refetchEvents');
                        }
                        , 500
                    );
                }
            },
            error: function() {
                closeModal();
                alert('Une erreur est survenue. Il est néanmoins possible que la requête ait abouti, veuillez patienter quelques secondes puis vérifier vos services enregistrés.');
                // Refectch shifts anyway:
                //  in case an error rises but the registration/exchange was still succesful
                setTimeout( // Due to chrome effect
                    function() {
                        loadShiftPartner(dataPartner.partner_id);
                        $('#dp').fullCalendar('refetchEvents');
                    }
                    , 500
                );
            }
        });
    }
}

// Check if the member can proceed to a service exchange
function canMakeExchange() {
    var answer = false;
    // Set the partner's limit date (after which he'll loose a point)

    if (dataPartner.dateProlonge != "False" || dataPartner.final_standard_point < 0 || dataPartner.in_ftop_team == "True") {
        var dateProlonge = new Date(dataPartner.dateProlonge);
        var dateNextRegularShift = new Date(dataPartner.next_regular_shift_date);

        limitDate = dateNextRegularShift;

        // For ABCD : the limit date is end of alert
        var dateEndAlert = new Date(dataPartner.date_alert_stop);

        if (dataPartner.in_ftop_team == "False" && limitDate < dateEndAlert) {
            limitDate = dateEndAlert;
        }

        // For partner in delay : limit date is end of delay
        if (dateProlonge - dateNextRegularShift < 0 || dataPartner.cooperative_state == 'delay') {
            limitDate = dateProlonge;
        }
    }

    let shifts_before_limit = 0;
    // If has shifts

    if (listeShiftPartner.length > 0) {
    // Calculate needed data
        non_regular_shifts = [];
        listeShiftPartner.forEach(function(s) {
            if (limitDate) {
                var s_date_begin = new Date(s.date_begin);

                if (s_date_begin - limitDate <= 0) {
                    shifts_before_limit += 1; // any shift before limit date
                }
                try {
                    if (s.shift_id[1].indexOf(dataPartner.regular_shift_name) == -1 && s_date_begin - limitDate <= 0) {
                        non_regular_shifts.push(s.date_begin); // non regular shifts before limit date
                    }
                } catch (e) {
                    //nothnig special to do
                }
            }
        });

        // Allow exchange if points >= 0 or he already has enough services booked before the limit date
        var partner_points = dataPartner.in_ftop_team == "True" ? dataPartner.final_ftop_point : dataPartner.final_standard_point;

        if (partner_points >= 0 || shifts_before_limit >= 1) {
            answer = true;
        }

        // If member in alert, allow service exchange if he selected enough 'catch-ups'
        if (dataPartner.cooperative_state == "alert" || dataPartner.cooperative_state == "delay") {
            answer = (shifts_before_limit >= 1) && (non_regular_shifts.length >= Math.abs(partner_points));
        }

        // ftop can always exchange service
        if (dataPartner.in_ftop_team == "True") {
            answer = true;
        }
    }

    return answer;
}

/*
Génère le message à afficher lorsque le coop doit faire un rattrapage.
  L'affiche si besoin.
  Pour les volants, chaque service compte comme un rattrapage.
*/
function addMakeUpMsg() {
    var partner_points = dataPartner.in_ftop_team == "True" ? dataPartner.final_ftop_point : dataPartner.final_standard_point;
    let shifts_before_limit = 0;

    // Calcul du nombre de rattrapages à faire
    if (partner_points < 0) {
        let s_date_begin = null;

        // Calcul du nombre de rattrapages déjà prévus avant la date limite
        non_regular_shifts.forEach(function(s) {
            s_date_begin = new Date(s);
            if (s_date_begin > new Date() && s_date_begin - limitDate <= 0) {
                shifts_before_limit += 1;
            }
        });
        make_up_nb = parseInt(partner_points) + shifts_before_limit;

        // Besoin de choisir un rattrapage : afficher message rattrapage
        if (make_up_nb < 0) {
            make_up_nb = Math.abs(make_up_nb);
            var msg = "";

            var mun_letters = "un";

            if (make_up_nb == 2) {
                mun_letters = "deux";
            } else if (make_up_nb == 3) {
                mun_letters = "trois";
            } else if (make_up_nb == 4) {
                mun_letters = "quatre";
            } else if (make_up_nb == 5) {
                mun_letters = "cinq";
            }

            msg = "Je dois ";
            if (non_regular_shifts > 0) {
                msg += "encore";
            }
            msg += " m'inscrire à " + mun_letters + " service";
            if (make_up_nb > 1) {
                msg += "s de rattrapage en les sélectionant ";
            } else {
                msg +=" de rattrapage en en sélectionant un ";
            }
            msg +=" dans le calendrier ci-dessous.";

            if (make_up_nb > 1) {
                msg += "<br/>Ces services doivent être fait ";
            } else {
                msg += "<br/>Ce service doit être fait ";
            }

            // Si le membre est un volant
            if (dataPartner.in_ftop_team == "True") {
                msg = "Je dois faire " + make_up_nb + " service";
                if (make_up_nb > 1) msg += "s";
                if (non_regular_shifts.length > 0) msg += " en plus";
            }

            msg += " avant le " + limitDate.toLocaleDateString("fr-fr", optDate) + ", faute de quoi je serai suspendu.e à cette date.";

            $('#partnerData').append("<span class=\"need_make_up\"><strong>"+ msg + "</strong></span>");
            $('.need_make_up').show();
        } else {
            $('.need_make_up').hide();
        }
    } else {
        $('.need_make_up').hide();
    }
}

function manageCheckedBoxes() {
    let clicked = $(this);
    let checked = clicked.is(':checked');

    $('[name="shiftRadio"]').prop('checked', false);
    if (checked) clicked.prop('checked', checked);
}

/*
  Check if a partner can add a new shift.
  Those who can't are:
    - ftops, with points <0 and new service selected after limit date
    - ABCD up to date (or with enough catch-ups)
    - ABCD who choose catch-up after their limit date
*/
function canAddShift(date_new_shift) {
    var answer = false;

    // If partner is ftop (ftop = volant)
    if (dataPartner["in_ftop_team"] == "True") {
    // If points >= 0 : can register to any shift
        if (dataPartner.final_ftop_point >= 0) {
            answer = true;
        } else {
            // If points < 0 : can only register to a shift before the limit date
            if (date_new_shift < limitDate) {
                answer = true;
            }
        }
    }
    // Rattrapages des ABCD
    else if (dataPartner["cooperative_state"] != "up_to_date") {
        // how many makeup have already been choosen ? (before end of alert)
        var dateEndAlert = null;

        if (dataPartner["dateProlonge"] == "False") {
            dateEndAlert = new Date(dataPartner["date_alert_stop"]);
        } else {
            dateEndAlert = new Date(dataPartner["dateProlonge"]);
        }

        var choosen_makeups = 0;

        $.each(listeShiftPartner, function(i, e) {
            if (new Date(e.date_begin) < dateEndAlert && e.shift_id[1].indexOf(dataPartner["regular_shift_name"]) < 0) {
                choosen_makeups++;
            }
        });

        // Si moins de rattrapages sélectionnés que de points à rattraper :
        //   dois faire un rattrapage, donc peut ajouter un service.
        if (choosen_makeups < Math.abs(dataPartner["final_standard_point"])) {
            // can only register to a shift before the limit date
            if (date_new_shift < limitDate) {
                answer = true;
            }
        }
    }

    return answer;
}

// Request a delay for the current member, starting at the end of his limit date
// TODO : shift_common
function request_delay() {
    openModal(); // Loading on

    var formated_limit_date = limitDate.getFullYear()+'-'+(limitDate.getMonth()+1)+'-'+limitDate.getDate();
    let delay_data = {
        idPartner: dataPartner.partner_id,
        verif_token: dataPartner.verif_token,
        start_date: formated_limit_date // date when the 28 days delay begins
    };

    // If not already in delay
    if (dataPartner.cooperative_state != 'delay') {
        let today = new Date();
        var extension_beginning = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

        // set today as the actual starting date for the object delay
        // so odoo take account of the delay
        delay_data['extension_beginning'] = extension_beginning;
    }

    $.ajaxSetup({headers: {"X-CSRFToken": getCookie('csrftoken')}});
    $.ajax({
        type: 'POST',
        url: '/shifts/request_delay',
        dataType: 'json',
        timeout: 3000,
        data: delay_data,
        success: function(doc) {
            closeModal();
            alert("L'extension a bien été accordée ! Cette page va se recharger...");
            setTimeout( // Due to chrome effect
                function() {
                    document.location.reload();
                }
                , 500
            );
        },
        error: function() {
            alert('Impossible de créer l\'extension. Je dois passer au Bureau des membres pour régler le problème.');
        }
    });
}


$(document).ready(function() {
    // Retrieve and display partner's shifs
    loadShiftPartner(dataPartner.partner_id);

    // Display information depending on partner's type and state
    if (dataPartner.in_ftop_team == "True") {
        $('div.intro div h2').text("Bienvenue dans le système de choix et d'échange de services");
        $('.additionnal_intro_data').text(' ou en choisir un nouveau');
        var partnerData = "Je suis en statut <span class=\"status\">" + listStates[dataPartner.cooperative_state]+ "</span>.<br>";
        /** TODO : Change code to use a parameter to know if following assertion has to be shown or not
    partnerData += "Je suis volant.e et j'ai <strong>"+ dataPartner.final_ftop_point +" point";
    if(Math.abs(dataPartner.final_ftop_point) > 1) {
      partnerData += "s";
    }
    partnerData += "</strong>. "
    **/

        $('#partnerData').html(partnerData);
    } else {
        $('.additionnal_intro_data').text(' ou choisir un rattrapage');
        var msg = "Je suis inscrit.e sur le créneau du " + get_litteral_shift_template_name(dataPartner.regular_shift_name) + '.';

        if (dataPartner.final_standard_point < 0) {
            msg += " J'ai " + dataPartner.final_standard_point+" point";
            if (dataPartner.final_standard_point < -1) {
                msg += "s";
            }
            msg += ".";
        }
        $('#partnerData').html(msg);
        if (dataPartner.cooperative_state == "up_to_date") {
            $('#partnerData').append("<br> Je suis à jour.");
        } else {
            $('#partnerData').append("<br> Je suis en statut <span class=\"status\">"+ listStates[dataPartner.cooperative_state] +"</span>.<br />");
        }
    }

    if (dataPartner.is_leave == "True") {
        var dateFinConge = new Date(dataPartner.leave_stop_date);
        var dateDebutConge = new Date(dataPartner.leave_start_date);

        $('#partnerData').append("<br/> En congé du " + dateDebutConge.toLocaleDateString("fr-fr", optDate) + " au " + dateFinConge.toLocaleDateString("fr-fr", optDate) + '<br/>');
    }

    // Listeners on click
    $(document).on("click", ".fa-info-circle", function() {
        var clicked = $(this);

        clicked.parent().find('>.infocircle')
            .toggle();
    });
    $(document).on("click", '[name="shiftRadio"]', manageCheckedBoxes);

    // Set calendar

    dp = $('#dp').fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay,listWeek'
        },
        timeFormat: 'HH:mm',
        locale: "fr",
        navLinks: true, // can click day/week names to navigate views
        eventLimit: showMoreLinks, // allow "more" link when too many events showMoreLinks defines in view HTML
        height: 900,
        minTime: "06:00:00",
        maxTime: "22:00:00",
        hiddenDays: daysToHide,
        initialView: calInitialView,
        navLinks: true,
        weekNumbers: true,
        events: function(start, end, timezone, callback) {
            // Load possible shifts
            $.ajax({
                url: '/shifts/get_list_shift_calendar/' + dataPartner.partner_id,
                dataType: 'json',
                data: {
                    start: start.format('YYYY-MM-DD'),
                    end: end.format('YYYY-MM-DD')
                },
                success: function(doc) {
                    loaded_events = doc;
                    // Show service exchange panel if allowed
                    can_make_exchange = canMakeExchange();
                    if (can_make_exchange) {
                        $('#exchange_instructions').show();
                    }

                    // Show make-up instructions if needed
                    $('.need_make_up').remove();
                    addMakeUpMsg();

                    callback(loaded_events);
                }
            });
        },
        eventClick: function(event) {
            // When a service is clicked
            if (event.changed) {
                var dateShiftNew = new Date(event.start);

                can_make_exchange = canMakeExchange();
                can_add_shift = canAddShift(dateShiftNew);

                if (dataPartner.is_leave == "True" && (dateShiftNew < dateFinConge && dateShiftNew > dateDebutConge)) {
                    alert("Je suis en congé à cette date ... ");
                } else {
                    var idShiftOld = Number($('input[name=shiftRadio]:checked').val() || "");
                    var msg = '';

                    // si un service a été sélectionné --> Echange (pour tout le monde)
                    if (idShiftOld != "" && can_make_exchange) {
                        var resOldShift = listeShiftPartner.find(function(shift) {
                            return shift.id === idShiftOld;
                        });
                        var dateShiftOld = new Date(resOldShift.date_begin);

                        msg = '<div>Je suis sur le point d\'échanger le service du : </div>';
                        msg += '<div>' + dateShiftOld.toLocaleDateString("fr-fr", optDate) + ' à ' + dateShiftOld.toLocaleTimeString("fr-fr") +'</div>';
                        msg += '<div>par celui de : </div>';
                        msg += '<div>'+ dateShiftNew.toLocaleDateString("fr-fr", optDate) + ' à ' + dateShiftNew.toLocaleTimeString("fr-fr") + '</div>';
                    } else {
                        // Pas de service selectionné --> Ajout d'un service

                        // For partners who can't add a shift as it is
                        if (!can_add_shift) {
                            // Partners who could ask for a delay
                            if (dataPartner.in_ftop_team == "True" || dataPartner.in_ftop_team == "False" && dateShiftNew > limitDate) {
                                // Member can ask for 6 delays, which is 24 weeks after entering alert status
                                // 'date_alert_stop' field is begining of alert + 4 weeks
                                let date_end_alert = new Date(dataPartner.date_alert_stop);

                                date_end_alert.setDate(date_end_alert.getDate()+20*7);

                                // If member can ask for delay
                                if (new Date() < date_end_alert) {
                                    openModal(
                                        "Pour pouvoir sélectionner un service à partir du <strong>" + limitDate.toLocaleDateString("fr-fr", optDate) + "</strong> je dois demander une extension.<br/>"
                            + "Je devrais re-sélectionner ce service dans l'agenda une fois l'extension accordée.",
                                        request_delay,
                                        "Demander une extension"
                                    );
                                } else {
                                    // can't ask for delays anymore
                                    openModal(
                                        "Je dois sélectionner un service <strong>avant le " + limitDate.toLocaleDateString("fr-fr", optDate) + "</strong>",
                                        closeModal, "J'ai compris"
                                    );
                                }
                            } else { // ABCD up-to-date
                                openModal(
                                    "Je dois sélectionner un service à échanger.",
                                    closeModal, "J'ai compris"
                                );
                            }
                            // Can add shift
                        } else {
                            msg = "<div>Je suis sur le point de m'inscrire au service du : </div>";
                            msg += '<div>'+ dateShiftNew.toLocaleDateString("fr-fr", optDate) + ' à ' + dateShiftNew.toLocaleTimeString("fr-fr") +'</div>';
                        }
                    }
                    if (msg != '') {
                        openModal(
                            msg,
                            function() {
                                var bl = $('#box_load');

                                bl.fadeIn(50);
                                bl.css('top', (lastY - 300) + 'px');
                                changeShift(idShiftOld, event.id);
                            }, 'Valider'
                        );
                    }
                }
            }
        }
    });

});

$(document).mousedown(function(e) {
    lastY = e.clientY;
});
