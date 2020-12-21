var actions_last_dates = {};

function get_litteral_shift_template_name(name) {
    var l_name = '';

    if (/([ABCD]{1})([A-Za-z.]{4}) - ([0-9:]+)/.exec(name)) {
        try {
            var week = RegExp.$1;
            var day = RegExp.$2;
            var hour = RegExp.$3;

            switch (day) {
            case 'Lun.': l_name = " lundi "; break;
            case 'Mar.': l_name = " mardi "; break;
            case 'Mer.': l_name = " mercredi "; break;
            case 'Jeu.': l_name = " jeudi "; break;
            case 'Ven.': l_name = " vendredi "; break;
            case 'Sam.': l_name = " samedi "; break;
            }
            if (l_name != '') {
                l_name += ' à ' + hour + ' (semaine ' + week + ')';
            }
        } catch (e) {
            // browser doesn't support switch (few chances)
        }

    }
    if (l_name == '') l_name = name;

    return l_name;
}


function is_time_to(action, delay = 5000) {
    var answer = false;
    var last_date = actions_last_dates[action] || 0;
    var d = new Date();
    var now = d.getTime();

    if (last_date == 0 || (now - last_date) >= delay) {
        answer = true;
        actions_last_dates[action] = now;
    }

    return answer;
}

function post_form(url, data, callback) {
    var ajax_params = {url : url,
        headers: { "X-CSRFToken": getCookie("csrftoken") },
        data : data,
        dataType :'json'};

    if (data.constructor.name == "FormData") {
        ajax_params.processData = false;
        ajax_params.contentType = false;
    }

    $.post(ajax_params)
        .done(function(rData) {
            callback(null, rData);

        })
        .fail(function(err) {
            console.log(err);
        });
}

// using jQuery
function getCookie(name) {
    var cookieValue = null;

    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');

        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?

            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }

    return cookieValue;
}

function createCookie(name, value, days) {
    var expires;

    if (days) {
        var date = new Date();

        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/; domain=" + window.location.hostname;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}

function coop_get_random(min, max) {
    return Math.floor(Math.random() * (+max - +min)) + +min;
}
// Get GET parameters from URL
function $_GET(param) {
    var vars = {};

    window.location.search.replace(location.hash, '').replace(
        /[?&]+([^=&]+)=?([^&]*)?/gi, // regexp
        function(m, key, value) { // callback
            vars[key] = value !== undefined ? value : '';
        }
    );

    if (param) {
        return vars[param] ? vars[param] : null;
    }

    return vars;
}


// Minimalist modal handling (Knacss doesn't)
var modal = $('#modal'),
    msg_box = $('#msg_box'),
    box_load = $('#box_load'),
    loading_img = $('#loading_img'),
    close_modal_btn = $('#modal_closebtn_top');

function display_msg_box(msg, type) {
    msg_box.find('.content').remove();
    var mtype = type || 'success';
    var mcont = $('<div/>').addClass('content '+ mtype)
        .html(msg);

    msg_box.append(mcont);
    msg_box.show();
}

String.prototype.toCapital = function () {
    return this.toLowerCase().replace(/^.|\s\S/g, function(a) {
        return a.toUpperCase();
    });
};

String.prototype.toFormatedFirstName = function() {
    var formatted = this.trim().toCapital();

    if (typeof force_fn_hyphen != "undefined" && force_fn_hyphen == true) {
        formatted = this.trim().replace(/-+/g, ' ')
            .toCapital()
            .replace(/ +/g, '-');
    }

    return formatted;
};
String.prototype.toFormatedLastName = function() {
    return this.trim().toUpperCase();
};

String.prototype.pad = function(String, len) {
    var str = this;

    while (str.length < len)
        str = String + str;

    return str;
};


var btns = $('<div/>').addClass('btns');
var btn_ok = $('<button/>').addClass('btn--success');
var btn_nok = $('<button/>').addClass('btn--danger')
    .attr('id', 'modal_closebtn_bottom')
    .text('Fermer');

//TODO change arguments management, actual not efficient (args array)
/*
  Args:
    modalContent
    validationCallback
    validationText
    validationClosesModal
    setCancelButton
    cancelCallback
  */
function openModal() {
    close_modal_btn.show();
    if (arguments[0]) {
    // First argument is modal content
        var oc = $('<div/>').addClass('mconfirm')
            .html(arguments[0]);

        btns.html('');
        btn_nok.off('click', closeModal);
        btn_ok.off('click', closeModal);

        // If more than one argument, add 'save' button
        if (arguments[1]) {
            btn_ok.on('click', arguments[1]); // Second argument is callback
            btn_ok.text(arguments[2] || 'Enregistrer'); // Third is button text

            // 4th argument: if not set or set and not false, validate button closes the modal
            if (typeof (arguments[3]) == "undefined" || arguments[3] != false)
                btn_ok.on('click', closeModal);

            btns.append(btn_ok);

            // 5th argument: if not set or set and not false, add 'cancel' button
            if (typeof (arguments[4]) == "undefined" || arguments[4] != false) {
                btn_nok.text('Annuler');
                btn_nok.on('click', closeModal);
                // 6th argument: if set, cancel callback
                if (typeof (arguments[5]) != "undefined") {
                    btn_nok.on('click', arguments[5]);
                }

                btns.append(btn_nok);
            }
        }


        oc.append(btns);
        modal.find('.overlay-content').html(oc);
    } else {
        openWaiting('<em>Chargement en cours...</em>');
    }
    modal.css("width", "100%");
}

function displayMsg(content) {
    // simple version of openModal
    modal.find('.overlay-content').html($('<div/>').addClass('mconfirm')
        .html(content));
    close_modal_btn.show(); // it may have been hidden by openWaiting
    modal.css("width", "100%");
}
function closeModal() {
    $(document).trigger("closemodal");
    box_load.hide();
    modal.find('.overlay-content').removeAttr('style'); // if newWaitingMessage has been called through openWaiting
    modal.css("width", "0%");
}

function openWaiting() {
    close_modal_btn.hide();
    if (arguments[0])
        newWaitingMessage(arguments[0]);

    box_load.css({'top':'auto'});
    loading_img.attr('src', '/static/img/wheels_loading.gif');
    box_load.show();
    modal.css("width", "100%");
}

function newWaitingMessage(msg) {
    var content = $('<div/>').html(msg);
    var container = modal.find('.overlay-content').css({'top': 'auto', 'color':'#FFF'});

    container.html(content);
}

function closeWaiting() {
    modal.css("width", "0%");
    box_load.hide();
}

function closeMsgBox() {
    msg_box.hide();
}

function closeInfo(e) {
    $(e).closest('.infocircle')
        .hide();
}

function format_date_to_sortable_string(date) {
    var formatted = date;

    try {
        formatted = date.toISOString().slice(0, 10) + ' ' + ('00'+ date.getHours()).slice(-2) + ':' + ('00'+ date.getMinutes()).slice(-2);
    } catch (e) {
        console.log(e);
    }

    return formatted;
}


function coop_is_weighted_product(p) {
    var answer = false;

    if (typeof (p.barcode) !== "undefined") {
    //0492
    //27131001
        if (/^(0492)|(27131001)|(0493)/.exec(p.barcode)) {
            answer = true;
        } else if (/SAISIR POID/.exec(p.name)) {
            answer = true;
        }

    } else {
        answer = null;
    }

    return answer;
}

// Admin Connection part
var conn_butt = $('#conn_butt');
var admin_menu = $('#admin_menu');

function coop_is_connected() {
    var answer = false;

    if (typeof (getCookie('authtoken')) != "undefined" && getCookie('authtoken') != null) {
        answer = true;
    }

    return answer;
}

function show_admin_menu() {
    conn_butt.hide();
    admin_menu.show();
}

function store_credentials(data) {
    createCookie("authtoken", data.authtoken);
    createCookie("uid", data.uid);
}

function coop_authenticate(callback) {
    post_form(
        '/members/get_credentials',
        {'login': $('input[name="login"]').val(),
            'password': $('input[name="password"]').val()
        }, function(err, result) {
            if (typeof (result.authtoken) != "undefined") {
                store_credentials(result);
                show_admin_menu();
                window.location.reload(); //needed until an other way is found !
            } else {
                conn_butt.click();
                modal.find('.error_msg').remove();
                var msg = $('<div>').addClass('error_msg')
                    .text('Identifiants inconnus ou erreur dans la saisie');

                modal.find('.mconfirm').prepend(msg);
            }

        }
    );

}

function open_coop_connexion_form() {

    if (getCookie('id'))
        alert("Vous êtes déjà connecté avec un compte coopérateur. Déconnectez-vous ou supprimez les cookies.");
    else
        openModal($('#connect_form_template').html(), coop_authenticate, 'Connexion');
}

try {
    $('#logout').click(function() {
        eraseCookie("authtoken");
        eraseCookie("uid");
        //Does localStorage should be reset ?
        location.reload();
    });
    conn_butt.click(open_coop_connexion_form);
    $('#admin_menu ul').append($('#admin_elts').html());
    if (coop_is_connected()) {
        show_admin_menu();
    }
} catch (e) {
    // no admin possibility, nothing to do
    console.log(e);
}

if (getCookie('deconnect_option') && $('#deconnect').length == 0) {
    //Add deconnect button
    //$('body').prepend($('<button>').attr('id','password_change').text('Changer mon mot de passe'));
    $('body').prepend($('<button>').attr('id', 'deconnect')
        .attr('type', 'button')
        .text('Déconnexion'));
    $('#deconnect').click(function() {
        window.location.href = "/website/deconnect";
    });
    $('#password_change').click(function() {
        window.location.href = '/website/change_pwd';
    });
}

function eanCheckDigit(s) {
    let result = 0;
    let i = 1;

    for (let counter = s.length-1; counter >=0; counter--) {
        result = result + parseInt(s.charAt(counter)) * (1+(2*(i % 2)));
        i++;
    }

    return (10 - (result % 10)) % 10;
}

function isValidEAN13(ean) {
    var answer = true;
    var checkSum = ean.split('').reduce(function(p, v, i) {
        return i % 2 == 0 ? p + 1 * v : p + 3 * v;
    }, 0);

    if (checkSum % 10 != 0) {
        answer = false;
    }

    return answer;
}

Number.prototype.pad = function(size) {
    var s = String(this);

    while (s.length < (size || 2)) {
        s = "0" + s;
    }

    return s;
};

// Accordions
var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
    /* Toggle between adding and removing the "active" class,
    to highlight the button that controls the panel */
        this.classList.toggle("active");

        /* Toggle between hiding and showing the active panel */
        var panel = this.nextElementSibling;

        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
}

function report_JS_error(e, m) {
    try {
        $.post('/log_js_error', {module: m, error: JSON.stringify(e)});
    } catch (err) {
    //console.log(err)
    }
}

function isSafari() {
    let chromeAgent = navigator.userAgent.indexOf("Chrome") > -1,
        safariAgent = navigator.userAgent.indexOf("Safari") > -1;

    if ((chromeAgent) && (safariAgent)) safariAgent = false;

    return safariAgent;
}

function isMacUser() {
    return (navigator.userAgent.indexOf("Mac") != -1 || navigator.userAgent.indexOf("like Mac") != -1);
}

if (isMacUser() && isSafari()) $('.mac-msg').show();
