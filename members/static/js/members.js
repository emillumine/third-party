//The magic code to add show/hide custom event triggers
(function ($) {
    $.each([
        'show',
        'hide',
        'css'
    ], function (i, ev) {
        var el = $.fn[ev];

        $.fn[ev] = function () {
            this.trigger(ev);

            return el.apply(this, arguments);
        };
    });
})(jQuery);

var current_displayed_member = null,
    operator = null,
    results = null,
    loaded_services = null,
    selected_service = null,
    last_search_time = null,
    rattrapage_ou_volant = null,
    timeout_counter = null;
var search_button = $('.btn--primary.search');
var sm_search_member_button = $('#sm_search_member_button'),
    sm_search_member_input = $('#sm_search_member_input');
var loading2 = $('.loading2');
var search_field = $('input[name="search_string"]');
var shift_title = $('#current_shift_title');
var shift_members = $('#current_shift_members');
var service_validation = $('#service_validation');
var associated_service_validation = $('#associated_service_validation');
var validation_last_call = 0;
var rattrapage_wanted = $('[data-next="rattrapage_1"]');
var webcam_is_attached = false;
var photo_advice = $('#photo_advice');
var photo_studio = $('#photo_studio');
var coop_info = $('.coop-info');
var service_data = null;

const missed_begin_msg = $('#missed_begin_msg').html();
const current_shift_process_data_actions = $('#current_shift_process_data_actions');

let no_pict_msg = $('#no-picture-msg');

var pages = {
    'first_page' : $('#first_page'),
    'shopping_entry' : $('#shopping_entry'),
    'service_entry' : $('#service_entry'),
    'service_entry_validation': $('#service_entry_validation'),
    'service_entry_success': $('#service_entry_success'),
    'rattrapage_1' : $('#rattrapage_1'),
    'rattrapage_2' : $('#rattrapage_2')

};

var html_elts = {
    member_slide : $('#member_slide'),
    barcode_base : $('#barcode_base'),
    barcode : $('#barcode'),
    name : $('#name'),
    image_medium : $('#image_medium'),
    real_capture : $('#real_capture'),
    multi_results : $('#multi_results_preview'),
    cooperative_state : $('#cooperative_state'),
    status_explanation: $('#status_explanation'),
    next_shifts : $('#next_shifts')
};

var chars = []; //input chars buffer

var reset_shift_process_actions_zone = function() {
    current_shift_process_data_actions.off('click', 'a');
    current_shift_process_data_actions.hide();
    current_shift_process_data_actions.empty();
}

function fill_member_slide(member) {
    no_pict_msg.hide();
    current_displayed_member = member;
    html_elts.next_shifts.html('');
    coop_info.removeClass('b_red');
    coop_info.removeClass('b_orange');
    if (member.barcode) {
        html_elts.barcode.JsBarcode()
            .options({font: "OCR-B"}) // Will affect all barcodes
            .EAN13(member.barcode, {fontSize: 14, textMargin: 0})
            .render();
    }
    html_elts.barcode_base.html(member.barcode_base);
    html_elts.name.html(member.name);
    var img_src = '';

    if (member.image_medium) {
        img_src = 'data:image/'+member.image_extension+';base64,'+member.image_medium;
    } else {
        img_src = "/static/img/pas-de-photo.png";
        no_pict_msg.show();
    }
    html_elts.image_medium.html('<img src="'+img_src+'" width="128" />');
    html_elts.cooperative_state.html(member.cooperative_state);
    if (member.cooperative_state == 'Rattrapage') {
        var explanation = "Tu as dû manquer un service! Pour pouvoir faire tes courses aujourd'hui, tu dois d'abord sélectionner un rattrapage sur ton espace membre.";

        html_elts.status_explanation.html(explanation);
    }
    if (member.cooperative_state == 'Désinscrit(e)') coop_info.addClass('b_red');
    else if (member.cooperative_state == 'En alerte' || member.cooperative_state == 'Délai accordé' || member.cooperative_state == 'Rattrapage') coop_info.addClass('b_orange');

    if (member.shifts.length > 0) {
        html_elts.next_shifts.append('Prochains services : ');
        var slist = $('<ul>');

        for (i in member.shifts) {
            var s = $('<li>').text(member.shifts[i].start);

            slist.append(s);
        }
        html_elts.next_shifts.append(slist);
    }
    html_elts.member_slide.show();
    setTimeout(
        function() {
            html_elts.member_slide.hide();
        },
        180000
    );
}

function search_box_clear_html_elts() {

    for (elt in html_elts)
        if (elt != 'member_slide')
            html_elts[elt].html('');
    html_elts.barcode.removeAttr('src');
}

function preview_member_search_select() {
    var clicked = $(this);
    var context = clicked.closest('section[id]').attr('id');
    var selected_member = results[clicked.data('i')];

    if (context == "shopping_entry") {
        fill_member_slide(selected_member);
    } else if (context == "rattrapage_1") {
        current_displayed_member = selected_member;
        fill_rattrapage_2();
        goto_page(pages.rattrapage_2);

    }
}

function preview_results() {

    for (i in results) {

        if (results[i].is_member != false) {
            var m = $('<button class="button_is_member">').attr('data-i', i)
                .text(results[i].barcode_base + ' - ' + results[i].name);

            html_elts.multi_results.append(m);
        }
        if (results[i].is_associated_people != false) {
            m = $('<button class="button_is_associated_people"></button_is_member>').attr('data-i', i)
                .text('B ' + results[i].barcode_base + ' - ' + results[i].name);



            html_elts.multi_results.append(m);
        }


    }

}

function canSearch() {
    var answer = true;

    if (last_search_time != null) {
        if (new Date().getTime() - last_search_time < 5000)
            answer = false;
    }

    return answer;
}

function search_member(force_search = false) {
    chars = []; // to prevent false "as barcode-reader" input
    operator = null;
    if (canSearch() || force_search) {

        html_elts.member_slide.hide();
        search_box_clear_html_elts();
        current_displayed_member = null;

        var search_seed = search_field.val() || '';

        if (search_seed.length > 0) {
            last_search_time = new Date().getTime();
            search_button.hide();
            loading2.show();
            $.ajax({
                url: '/members/search/' + search_seed,
                dataType : 'json'
            })
                .done(function(rData) {
                    var nb = rData.res.length || 0;

                    if (nb > 0) {
                        if (nb == 1) {
                            var context = search_field.closest('section[id]')
                                .attr('id');

                            if (context == 'rattrapage_1') {
                                current_displayed_member = rData.res[0];
                                fill_rattrapage_2();
                                goto_page(pages.rattrapage_2);
                            } else {
                                fill_member_slide(rData.res[0]);
                            }

                        } else {

                            results = rData.res;
                            preview_results();
                        }
                    } else {
                        alert('Aucun résultat');
                    }
                    loading2.hide();
                    search_button.show();
                });
        }

    }


}

function get_simple_service_name(s) {
    var simple_name = s.name;
    var reg = new RegExp('([a-z]+). - [0-9:]+ ?-? ?([a-z]*)', 'i');

    if (reg.exec(s.name)) {
        var wd = RegExp.$1;
        var p = RegExp.$2;

        if (p == 'Balar') {
            p = 'BDM';
        } else if (p == 'Cleme') {
            p = 'Magasin';
        } else {
            p = 'Magasin';
        }
        var start = new Date(Date.parse(s.date_begin_tz));
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        var end_time = new Date(Date.parse(s.date_end_tz)).toTimeString()
            .replace(/^(\d{2}:\d{2}).*/, "$1");
        var start_time = start.toTimeString().replace(/^(\d{2}:\d{2}).*/, "$1");

        simple_name = 'Service au ' + p;
        simple_name += ' le '+ start.toLocaleDateString('fr-FR', options);
        simple_name += ' de ' + start_time + ' à ' + end_time;
        simple_name += ' (' + wd[0] + ') ';
    } else {
        simple_name = '???';
    }

    return simple_name;
}

function move_service_validation_to(page) {
    service_data.stid=0;
    page.find('.validation_wrapper')
        .append(service_validation.detach());
}

function fill_service_entry(s) {
    selected_service = s;
    shift_title.text(get_simple_service_name(s));
    shift_title.show();
    var m_list = 'Personne n\'est inscrit à ce service.';

    if (s.members) {
        m_list = '<ul class="members_list">';
        // if (typeof s.late != "undefined" && s.late == true) {
        //     m_list = '<ul class="members_list late">';
        // }
        if (s.state == 'done') {
            m_list = '<ul class="members_list done">';
        }
        $.each(s.members, function(i, e) {
            var li_class = "btn";
            var li_data = "";

            if (e.state == "done" && coop_is_connected()) {
                li_data = ' data-rid="'+e.id+'" data-mid="'+e.partner_id[0]+'"';
                li_class += "--inverse";
                if (e.is_late == true) {
                    li_class += " late";
                }
                if (e.associate_registered=='both') {
                    li_class += " both";
                }
            } else if (e.state == "done" && !coop_is_connected()) {
                li_data = ' data-rid="'+e.id+'" data-mid="'+e.partner_id[0]+'"';
                li_class += "--inverse not_connected";
                if (e.is_late == true) {
                    li_class += " late";
                }
            } else {
                li_data = ' data-rid="'+e.id+'" data-mid="'+e.partner_id[0]+'"';
            }
            if (s.state == 'done') {
                li_data += ' disabled ';
            }
            m_list += '<li class="'+li_class+'" '+li_data+'>';
            m_list += e.partner_id[1];
            m_list += '</li>';
        });
        m_list += '</ul>';

    }
    if (coop_is_connected()) {
        // Add shift process data
        reset_shift_process_actions_zone();
        if (s.state == 'draft' || s.state == 'confirm') {
            let btn = $('<a>').addClass('btn btn--primary txtcenter')
                              .text('Enregistrer les absences / présences')
                              .attr('id','record_shift_absences');
            current_shift_process_data_actions.append(btn);
            current_shift_process_data_actions.on('click', '#record_shift_absences', function(){
                msg = "<p>Lancer le traitement des présences et absences de ce service</p>";
                openModal(msg, function() {
                    try {
                        $.ajax({
                            url: '/members/record_shift_absences/' + s.id,
                            dataType : 'json'
                        })
                        .done(function(rData) {
                            if (typeof rData.update !== "undefined" && rData.update == true) {
                                enqueue_message_for_next_loading("Données de présences traitées.");
                                location.reload();
                            }
                        });
                    } catch (e) {
                        console.log(e);
                    }
                }, 'Confirmer');
                
            });
        } else {
            current_shift_process_data_actions.append("<em>Traitement des présences : " + s.state + "</em>");
        }
        
        current_shift_process_data_actions.show();
    }
    rattrapage_ou_volant = null;
    shift_members.html(m_list);
    rattrapage_wanted.show();
}

function clean_search_for_easy_validate_zone() {
    $('.search_member_results_area').hide();
    $('.search_member_results').empty();
    sm_search_member_input.val('');
    operator = null;
}

function clean_service_entry() {
    clean_search_for_easy_validate_zone();
    rattrapage_wanted.hide();
    shift_title.text('');
    shift_members.html('');
}

function fill_service_validation(rid, coop_num_name, coop_id) {
    var coop_name_elts = coop_num_name.split(' - ');

    for (member of loaded_services[0].members) {
        if (member.id ==rid) {
            if (member.associate_name) {
                pages.service_entry_validation.find('#service_validation').hide();
                pages.service_entry_validation.find('#associated_service_validation').show();
                pages.service_entry_validation.find('#associated_btn').text(member.associate_name);
                pages.service_entry_validation.find('#partner_btn').text(member.partner_name);

            } else {
                pages.service_entry_validation.find('#associated_service_validation').hide();
                pages.service_entry_validation.find('#service_validation').show();

            }
        }
    }
    service_data={
        rid: rid,
        sid: selected_service.id,
        mid: coop_id};


    pages.service_entry_validation.find('span.member_name').text(coop_name_elts[1]);
    move_service_validation_to(pages.service_entry_validation);
}

function select_possible_service() {
    var clicked = $(this);
    var id = clicked.data('id');

    if (loaded_services && !isNaN(id)) {
        var selected = null;

        $.each(loaded_services, function(i, e) {
            if (e.id == id) {
                selected = e;
            }
        });
        if (selected) {

            fill_service_entry(selected);
            pages.service_entry.find('.info').empty();
            pages.service_entry.find('h1').text('Qui es-tu ? (ou personne remplacée)');
        }
    }

}
function get_service_entry_data() {
    var info_place = pages.service_entry.find('.info');

    info_place.text('Chargement du service actuel...');
    shift_title.hide();

    var now = new Date();
    var time_param = now.toISOString();
    var offset = now.getTimezoneOffset();

    if (/([^/]+)$/.exec(window.location)) {
        time_param = RegExp.$1.replace('%20', 'T') + 'Z';
        offset = 0;
    }
    //time_param = '2018-10-29T09:45:18.37'
    $.ajax({
        url: '/members/services_at_time/'+time_param
                    +'/'+ offset,
        dataType : 'json'
    })
        .done(function(rData) {
            info_place.text('');
            reset_shift_process_actions_zone();

            var page_title = pages.service_entry.find('h1');

            page_title.text('Qui es-tu ?');
            try {
                if (rData.res.length == 0) {
                    info_place.html(missed_begin_msg);
                    page_title.html('');

                } else {
                    if (rData.res.length > 1) {
                        loaded_services = rData.res;
                        var message = rData.res.length + ' possibilités : <br />';

                        for (i in rData.res) {
                            var s_name = get_simple_service_name(rData.res[i]);

                            message += '<a data-id="' + rData.res[i].id + '" class="btn">';
                            message += s_name + ' </a><br/>';
                        }
                        info_place.html(message);
                        page_title.text('Quel est ton service ?');

                    } else {
                        loaded_services = rData.res;
                        fill_service_entry(rData.res[0]);
                    }
                }
            } catch (e) {
                console.log(e);
            }
        });
}

function fill_service_entry_sucess(member) {
    pages.service_entry_success.find('span.member_name').text(member.name);

    var points = member.display_std_points;

    if (member.shift_type == 'ftop') {
        points = member.display_ftop_points;
    }
    pages.service_entry_success.find('span.points').text(points);
    var compteur_div = pages.service_entry_success.find('.compteur');

    if (points < 0 || rattrapage_ou_volant) {
        compteur_div.show();
    } else {
        compteur_div.hide();
    }

    var next_shift = '???';
    var service_verb = 'est prévu';

    if (member.next_shift) {
        if (member.shift_type == 'ftop'
            && member.next_shift.shift_type == "ftop") {
            var start_elts = member.next_shift.start.split(' à ');

            next_shift = start_elts[0];
            service_verb = 'est à faire avant';
        } else {
            next_shift = member.next_shift.start;
        }
    }
    pages.service_entry_success.find('span.next_shift').text(next_shift);
    pages.service_entry_success.find('span.service_verb').text(service_verb);


}

function record_service_presence(e) {
    var d = new Date();
    var elapsed_since_last_call = d.getTime() - validation_last_call;

    if (elapsed_since_last_call > 1000) {
        loading2.show();
        validation_last_call = d.getTime();
        var rid = service_data.rid;
        var mid = service_data.mid;
        var sid = service_data.sid;
        var stid = service_data.stid;

        post_form(
            '/members/service_presence/',
            {'mid': mid, 'rid': rid, 'sid': sid, 'stid' : stid, 'cancel': false, 'type': e.data.type},
            function(err, rData) {
                if (!err) {
                    var res = rData.res;
                    var next = (res.update == 'ok')
                                  ||(res.rattrapage && !isNaN(res.rattrapage));

                    if (next) {
                        fill_service_entry_sucess(rData.res.member);
                        goto_page(pages.service_entry_success);
                    } else if (rData.res.error) {
                        alert(rData.res.error);
                    } else {
                        alert("Un problème est survenu. S'il persiste merci de le signaler à un responsable du magasin.");
                    }
                }
                loading2.hide();
            }
        );
    }
}

function cancel_service_presence(mid, rid) {
    var d = new Date();
    var elapsed_since_last_call = d.getTime() - validation_last_call;

    if (elapsed_since_last_call > 1000) {
        loading2.show();
        validation_last_call = d.getTime();
        var sid = selected_service.id;

        post_form(
            '/members/service_presence/',
            {'mid': mid, 'rid': rid, 'sid': sid, 'stid' : 0, 'cancel': true},
            function(err) {
                if (!err) {
                    get_service_entry_data();
                }
                loading2.hide();
            }
        );
    }
}

function fill_rattrapage_2() {
    pages.rattrapage_2.find('span.member_name').text(current_displayed_member.name);
    var msg = "Bienvenue pour ton rattrapage !";
    var shift_ticket_id = selected_service.shift_ticket_ids[0];

    if (current_displayed_member.shift_type == 'ftop') {
        msg ="Bienvenue dans ce service !";
        if (selected_service.shift_ticket_ids[1])
            shift_ticket_id = selected_service.shift_ticket_ids[1];
    }
    if (current_displayed_member.state == 'unsubscribed') {
        msg = "Tu es en désincrit.e ... La situation doit être réglée avez le Bureau des Membres";
    } else {
        move_service_validation_to(pages.rattrapage_2);
        service_data = {
            rid : 0,
            sid : selected_service.id,
            stid : shift_ticket_id,
            mid : current_displayed_member.id};
    }
    pages.rattrapage_2.find('h2').text(msg);


}

function init_webcam() {
    try {
        Webcam.set({
            width: 320,
            height: 240,
            dest_width: 640,
            dest_height: 480,
            crop_width: $('#crop_width').val(),
            crop_height: 480,
            image_format: 'jpeg',
            jpeg_quality: 90

        });
        Webcam.attach('#webcam');


    } catch (e) {
        //console.log(e)
    }

}


function preview_snapshot() {

    // freeze camera so user can preview current frame
    Webcam.freeze();

    // swap button sets
    document.getElementById('pre_take_buttons').style.display = 'none';
    document.getElementById('post_take_buttons').style.display = '';
}

function cancel_preview() {
    // cancel preview freeze and return to live camera view
    Webcam.unfreeze();

    // swap buttons back to first set
    document.getElementById('pre_take_buttons').style.display = '';
    document.getElementById('post_take_buttons').style.display = 'none';
}

function save_photo() {
    // actually snap photo (from preview freeze) and store it
    Webcam.snap(function(data_uri) {

        if (/data:image\/jpeg;base64,(.+)/.exec(data_uri)) {
            image_code = RegExp.$1;
            if (current_displayed_member != null) {
                cancel_preview();
                photo_studio.hide();
                html_elts.image_medium.html('<img src="/static/img/Pedro_luis_romani_ruiz.gif" />');
                $.post(
                    '/members/save_photo/'+current_displayed_member.id,
                    {'photo':image_code,
                        'csrfmiddlewaretoken': $('input[name="csrfmiddlewaretoken"]').val()
                    }
                )
                    .done(function(rData) {
                        if (rData.res == true) {
                            $.get('/members/image/'+ current_displayed_member.id)
                                .done(function(img_b64) {
                                    var img_src = 'data:image/jpeg;base64,'+img_b64;

                                    html_elts.image_medium.html('<img src="'+img_src+'" />');

                                });
                        }
                    });
            } else {
                html_elts.real_capture.html('<img src="'+data_uri+'" />');
            }



        }


    });
}

function search_input_listing(e) {
    e = e || window.event;
    if (e.keyCode == '13') {
        // enter
        e.preventDefault();
        search_member();
    }
}

function move_search_box(from, to) {
    search_box_clear_html_elts();
    search_field.val('');
    var search_box = from.find('.search_box_wrapper section').detach();

    if (search_box.length > 0)
        search_box.appendTo(to.find('.search_box_wrapper'));
}

function goto_page(jquery_page_selected) {
    $.each(pages, function(i, e) {
        e.hide();
    });
    jquery_page_selected.css('display', 'grid');
}

function timeout_to_homepage() {
    if (timeout_counter) clearTimeout(timeout_counter);
    timeout_counter = setTimeout(function() {
        goto_page(pages.first_page);
    }, 40000);
}

$('button.search').click(search_member);
search_field.keyup(search_input_listing);

$('.btn[data-next]').click(function() {
    var clicked = $(this);
    var next_page = $('#' + clicked.data('next'));

    if (clicked.data('type')) {
        var type = clicked.data('type');

        if (type == "rattrapage" || type == "volant") {
            rattrapage_ou_volant = type;
        }
    }

    if (next_page.length > 0) {
        goto_page(next_page);
    }

});

service_validation.on("click", ".btn", {type:'normal'}, record_service_presence);
associated_service_validation.on("click", "#associated_btn", {type:'associate'}, record_service_presence);
associated_service_validation.on("click", "#partner_btn", {type:'partner'}, record_service_presence);
associated_service_validation.on("click", "#both_btn", {type:'both'}, record_service_presence);

shift_members.on("click", '.btn[data-rid]', function() {
    var clicked = $(this);
    var rid = clicked.data('rid');
    var mid = clicked.data('mid');

    goto_page(pages.service_entry_validation);
    fill_service_validation(rid, clicked.text(), mid);

});

shift_members.on("click", '.btn--inverse', function() {
    if (coop_is_connected()) {
        var clicked = $(this);
        var rid = clicked.data('rid');
        var mid = clicked.data('mid');

        cancel_service_presence(mid, rid);
    }
});

pages.shopping_entry.on('css', function() {
    photo_advice.hide();
    photo_studio.hide();
    search_box_clear_html_elts();
    html_elts.member_slide.hide();
    move_search_box(pages.rattrapage_1, pages.shopping_entry);
});

pages.service_entry.on('css', function() {
    photo_advice.hide();
    photo_studio.hide();
    clean_service_entry();
    get_service_entry_data();
});

pages.rattrapage_1.on('css', function() {
    search_box_clear_html_elts();
    var msg = "Vous venez pour un rattrapage.";

    if (rattrapage_ou_volant == "volant") {
        msg = "Vous venez en tant que volant.";
    }
    pages.rattrapage_1.find('h1').text(msg);
    move_search_box(pages.shopping_entry, pages.rattrapage_1);

});
pages.service_entry.on("click", '.info a[data-id]', select_possible_service);
$("#multi_results_preview").on("click", 'button', preview_member_search_select);
html_elts.image_medium.on('click', function() {
    if (webcam_is_attached == true) {
        // photo_advice.show();
        photo_studio.show();
    }
});

function ask_for_easy_shift_validation() {
    //alert("operator = " + JSON.stringify(operator))
    msg = "<p>Je suis bien " + operator.name + "<br/> et <br/>je valide mon service 'Comité' </p>";
    openModal(msg, function() {
        try {
            post_form(
                '/members/easy_validate_shift_presence',
                {
                    coop_id: operator.id
                },
                function(err) {
                    if (!err) {
                        alert("1 point volant vient d'être ajouté.");
                        clean_search_for_easy_validate_zone();
                        closeModal();
                    } else {
                        if (typeof (err.responseJSON) != "undefined"
                                        && typeof (err.responseJSON.error) != "undefined") {
                            alert(err.responseJSON.error);
                        } else {
                            console.log(err);
                        }
                    }
                }
            );
        } catch (e) {
            console.log(e);
        }
    }, 'Confirmer');
}
// Display the members from the search result (copied from stock_movements)
function display_possible_members() {
    $('.search_member_results_area').show();
    $('.search_member_results').empty();

    if (members_search_results.length > 0) {
        for (member of members_search_results) {
            let btn_classes = "btn";

            if (operator != null && operator.id == member.id) {
                btn_classes = "btn--success";
            }

            // Display results (possible members) as buttons
            var member_button = '<button class="' + btn_classes + ' btn_member" member_id="'
                          + member.id + '">'
                          + member.barcode_base + ' - ' + member.name
                          + '</button>';

            $('.search_member_results').append(member_button);
            // Set action on click on a member button
            $('.btn_member').on('click', function() {
                for (member of members_search_results) {
                    if (member.id == $(this).attr('member_id')) {
                        operator = member;
                        // Enable validation button when operator is selected
                        ask_for_easy_shift_validation();
                        break;
                    }
                }
                display_possible_members();
            });
        }
    } else {
        $('.search_member_results').html('<p><i>Aucun résultat ! Faites-vous partie d\'un comité ? <br/> Si oui, vérifiez la recherche..</i></p>');
    }
}
$(document).ready(function() {
    var shopping_entry_btn = $('a[data-next="shopping_entry"]');

    shopping_entry_btn.on('click', function() {
        // Always focus on search field
        search_field.focus();

        // Return to homepage after 40 seconds
        timeout_to_homepage();
    });

    // Force barcode-reader to search member
    $(window).keypress(function(e) {
        if (e.which >= 48 && e.which <= 57) {
            chars.push(String.fromCharCode(e.which));
        }

        timeout_to_homepage();

        setTimeout(function() {
            if (chars.length >= 13) {
                var barcode = chars.join("");

                if (!isNaN(barcode)) {
                    chars = [];
                    goto_page(pages.shopping_entry);
                    search_field.val(barcode);
                    last_search_time = null;
                    search_member(true);
                }
            }

        }, 300);
    });

    init_webcam();
    $('#crop_width').change(function() {
        Webcam.reset();
        init_webcam();
    });

    $('#sm_search_member_form').submit(function() {
        if (is_time_to('search_member', 1000)) {
            sm_search_member_button.empty().append(`<i class="fas fa-spinner fa-spin"></i>`);
            let search_str = sm_search_member_input.val();

            $.ajax({
                url: '/members/search/' + search_str + '/' + window.committees_shift_id,
                dataType : 'json',
                success: function(data) {
                    members_search_results = [];
                    for (member of data.res) {
                        if (member.shift_type == 'ftop') {
                            members_search_results.push(member);
                        }
                    }

                    display_possible_members();
                },
                error: function() {
                    err = {
                        msg: "erreur serveur lors de la recherche de membres",
                        ctx: 'easy_validate.search_members'
                    };
                    report_JS_error(err, 'members');

                    $.notify("Erreur lors de la recherche de membre, il faut ré-essayer plus tard...", {
                        globalPosition:"top right",
                        className: "error"
                    });
                },
                complete: function() {
                    sm_search_member_button.empty().append(`Recherche`);
                }
            });
        }
    });

});

Webcam.on('live', function() {
    webcam_is_attached = true;
});
