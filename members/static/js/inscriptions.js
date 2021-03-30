var fingerprint = new Fingerprint({canvas: true}).get(); //Pour associer données au PC utilisé pendant la réunion d'accueil

var latest_odoo_coop_bb = null,
    total_registred = null,

    ncoop_view = $('#new_coop'),
    coop_create = $('#coop_create'),
    next_coop = $('#next_coop'),
    coop_list_btn = $('#coop_list_btn'),
    coop_list_view = $('#coop_list_view'),

    coop_registration_details = $('#coop_registration_details'),

    payment_meaning = $('#payment_meaning'),
    ch_qty = $('#ch_qty'),
    process_state = $('#process_state'),
    subs_cap = $('#subs_cap'),
    m_barcode = $('#m_barcode'),
    sex = $('#sex'),

    self_records = [],

    choose_shift_msg = "Il est nécessaire de choisir un créneau (ABCD ou Volant) avant de pouvoir faire quoique ce soit d'autre.\nUne personne qui souhaite être rattachée au compte d'un autre membre dans le cadre d'un binôme doit choisir le créneau volant.";


sync.on('change', function (info) {
    // handle change
    need_reload = false;
    var displayed_shift_lat_menu = (sc_lat.css('display') == 'block' && sc_lat.find('.highlighted').length > 0);
    var selected_weeks = week_types.find('.selected_weeks .highlighted').length;

    if (displayed_shift_lat_menu && selected_weeks > 0) {
        $.each(info.change.docs, function(i, e) {
            if (e.shift_template) {
                need_reload = true;
            }
        });
        if (need_reload == true) {
        //On recharge depuis Odoo et on traite les enregistrements depuis CouchDB
            retrieve_and_draw_shift_tempates('without_modal');

        }
    }

}).on('paused', function (err) {
    // replication paused (e.g. replication up to date, user went offline)
    if (err) {
        online = false;
    }


})
    .on('active', function () {
    // replicate resumed (e.g. new changes replicating, user went back online)
        update_completed_count();
        online = true;
    })
    .on('denied', function (err) {
    // a document failed to replicate (e.g. due to permissions)
    })
    .on('complete', function (info) {
    // handle complete
    })
    .on('error', function (err) {
    // handle error
        console.log('erreur sync');
        console.log(err);
    });


function get_next_shift(st_id, callback) {

    $.ajax({url : '/members/shift_template/next_shift/'+st_id,
        dataType :'json'
    })
        .done(function(rData) {
            if (callback)
                callback(rData.shift);
        })
        .fail(function() {
            if (callback)
                callback(null);
        });
}

function new_coop_validation() {
    coop_list_view.hide();
    schoice_view.hide();
    ncoop_view.hide();
    var barcode_base = current_coop.barcode_base;
    var st = get_shift_name(current_coop.shift_template.data);
    //coop_registration_details.find('.numbox').text('N° '+ barcode_base);

    coop_registration_details.find('.shift_template').text(st);
    process_state.html(current_coop.firstname + ' ' +current_coop.lastname);
    get_next_shift(current_coop.shift_template.data.id, function(data) {
        if (data != null)
            coop_registration_details.find('.next_shift').text(data.date_begin);
        coop_registration_details.show();
    });

}

function reset_sex_radios() {
    sex.find('input').each(function(i, e) {
        $(e).prop('checked', false);
    });
}

function create_new_coop() {
    local_in_process = getLocalInProcess();
    if (getLocalInProcess().length > 0) {
        empty_waiting_local_processes();
    } else {
        if (current_coop == null || typeof(current_coop.shift_template) != "undefined") {
            current_coop = null;
            ncoop_view.find('.title').text('NOUVEAU MEMBRE');
            coop_create.find('input').not('[type="radio"]')
                .val('');
            coop_list_view.hide();
            schoice_view.hide();
            coop_registration_details.hide();
            process_state.html('');
            payment_meaning.val('');
            ch_qty.val('');
            ch_qty.hide();
            if (m_barcode.length > 0) m_barcode.val('');
            if (sex.length > 0) reset_sex_radios();
            ncoop_view.show();
        } else {
            alert(choose_shift_msg);
        }
    }

}
function swipe_to_shift_choice() {
    ncoop_view.hide();
    process_state.html('Inscription <strong>' + current_coop._id + '</strong> <span class="s_shift"></span');
    retrieve_and_draw_shift_tempates();
    schoice_view.show();
}
function _really_save_new_coop(email, fname, lname, cap, pm, cn, bc, msex) {

    var coop = current_coop || {};

    if (typeof(coop._id) !== "undefined") {
        current_email = coop._id;
        if (email != current_email) {
            //delete current_coop after copying revelant data

            dbc.remove(current_email, coop._rev, function(err, response) {

                if (err) {
                    return console.log(err);
                }
                //console.log(response);

            });
            delete coop._rev;
        }
    }

    coop._id = email;
    coop.firstname = fname;
    coop.lastname = lname;
    coop.shares_euros = cap;
    coop.shares_nb = parseInt(cap/10, 10);
    coop.payment_meaning = pm;
    coop.checks_nb = cn;
    coop.fingerprint = fingerprint;
    if (m_barcode.length > 0) coop.m_barcode = bc;
    if (sex.length > 0) coop.sex = msex;
    coop.validation_state = "to_fill";
    dbc.put(coop, function callback(err, result) {
        if (!err) {
            coop._rev = result.rev;
            current_coop = coop;
            if (typeof coop.shift_template != "undefined") {
                openModal(
                    'Voulez-vous modifier le créneau choisi ?', swipe_to_shift_choice, 'oui',
                    false, true, show_coop_list
                );
            } else {
                swipe_to_shift_choice();
            }
            update_self_records();
        } else {
            alert('Cet email est déjà enregistré !');
            console.log(err);
        }
    });
}

function store_new_coop(event) {
    event.preventDefault();
    var errors = [],
        bc = '', // barcode may not be present
        msex = ''; // sex may not be present
    // 1- Un coop avec le meme mail ne doit pas exister dans odoo (dans base intermediaire, le cas est géré par l'erreur à l'enregistrement)
    let email = $('input[name="email"]').val()
            .trim(),
        fname = $('input[name="firstname"]').val()
            .toFormatedFirstName(),
        lname = $('input[name="lastname"]').val()
            .toFormatedLastName();

    if (m_barcode.length > 0) {
        bc = m_barcode.val();
        if (!isValidEAN13(bc)) errors.push("Le code-barre ne semble pas être un EAN13 valide.");
    }
    if (sex.length > 0) {
        msex = $('input[name="sex"]:checked').val();
    }

    if (payment_meaning.val() == 'ch') {
        if (ch_qty.val() <1) {
            errors.push("Le nombre de chèque est obligatoire.");
        } else if (ch_qty.val() > max_chq_nb) {
            errors.push("Le nombre de chèque est trop grand.");
        }
    }

    $.ajax({url : '/members/exists/' + email,
        dataType :'json'
    })
        .done(function(rData) {
            if (typeof(rData.answer) == 'boolean' && rData.answer == true) {
                errors.push("Il y a déjà un enregistrement Odoo avec cette adresse mail !");
            }
        });

    if (errors.length == 0) {
        _really_save_new_coop(
            email, fname, lname,
            subs_cap.val(), payment_meaning.val(), ch_qty.val(), bc, msex
        );

    } else {
        alert(errors.join("\n"));
    }

}



function set_current_coop_by_id(id) {
    coop = null;
    $.each(self_records, function(i, e) {
        if (e._id == id) {
            current_coop = coop = e;
        }
    });

    return coop;
}

function modify_current_coop() {
    c_shift = '';
    if (current_coop.shift_template) {
        c_shift = get_shift_name(current_coop.shift_template.data);
        c_shift = '(' + c_shift + ')';
    }
    process_state.html('Modification <strong>' + current_coop._id + '</strong> <span class="s_shift">'+c_shift+'</span');
    coop_list_view.hide();
    ncoop_view.find('.title').text('MODIFICATION DU MEMBRE');
    ncoop_view.find('input[name="lastname"]').val(current_coop.lastname);
    ncoop_view.find('input[name="firstname"]').val(current_coop.firstname);
    ncoop_view.find('input[name="email"]').val(current_coop._id);
    payment_meaning.find('option').removeAttr('selected');
    payment_meaning.find('option[value="'+current_coop.payment_meaning+'"]').attr('selected', 'selected');
    if (current_coop.checks_nb.length > 0) {
        ch_qty.val(current_coop.checks_nb);
        ch_qty.show();
    } else {
        ch_qty.hide();
    }
    subs_cap.val(current_coop.shares_euros);
    if (m_barcode.length > 0) m_barcode.val(current_coop.m_barcode);
    if (sex.length > 0) {
        reset_sex_radios();
        $('#' + current_coop.sex + '_sex').prop('checked', true);
    }
    ncoop_view.show();
}
function modify_coop_by_btn_triggered() {
    var clicked = $(this);
    var coop_id = clicked.find('div').data('id');

    if (set_current_coop_by_id(coop_id) != null) {
        modify_current_coop();
    }
}

function modify_c_shift() {
    var clicked = $(this);
    var coop_id = clicked.closest('tr').find('td.coop div')
        .data('id');

    if (set_current_coop_by_id(coop_id) != null) {
        ncoop_view.hide();
        coop_list_view.hide();
        c_shift = clicked.text();
        if (c_shift.length > 0) {
            c_shift = '(' + c_shift + ')';
        }
        process_state.html('Modification <strong>' + coop_id + '</strong> <span class="s_shift">'+c_shift+'</span');
        retrieve_and_draw_shift_tempates();
        sc_lat.find('button[data-select="both"]').addClass('highlighted');
        schoice_view.show();
    }
}

function show_coop_list() {
    if (current_coop == null || typeof (current_coop.shift_template) != "undefined") {
        ncoop_view.hide();
        schoice_view.hide();
        coop_registration_details.hide();
        coop_list_view.show();
        var table = coop_list_view.find('table');
        //evitons les fuites de mémoire potentielles

        table.find('td.coop').off('click', modify_coop_by_btn_triggered);
        table.find('td.c_shift').off('click', modify_c_shift);
        table.find('tbody tr').remove();
        $.each(self_records, function(i, e) {
            var tr = $('<tr/>');
            var coop = $('<div/>').attr('data-id', e._id)
                .html(e.firstname + ' ' + e.lastname + ' - '+e._id);
            var s_t = '';

            if (e.shift_template) {
                var s_data = e.shift_template.data;

                s_t = get_shift_name(s_data);
            }
            var shift = $('<div/>').html(s_t);

            tr.append($('<td/>').addClass('coop')
                .append(coop));
            tr.append($('<td/>').addClass('c_shift')
                .append(shift));
            table.append(tr);
        });
        table.find('td.coop').on('click', modify_coop_by_btn_triggered);
        table.find('td.c_shift').on('click', modify_c_shift);
    } else {
        alert(choose_shift_msg);
    }

}

function update_completed_count() {
    dbc.query(
        'index/by_completed',
        {key:'shift'},
        function(err, result) {
            if (!err) {
                //console.log(result);
                total_registred = result.rows.length;

            }
        }
    );
}

function update_self_records() {
    dbc.query(
        'index/by_fp',
        {key:fingerprint, include_docs : true},
        function(err, result) {
            if (!err) {
                self_records = [];
                $.each(result.rows, function(i, e) {
                    var odoo_state = e.doc.odoo_state || 'void';

                    if (odoo_state != 'done')
                        self_records.push(e.doc);
                });
                if (self_records.length > 0) {
                    coop_list_btn.show();
                }

            }
        }
    );
}

function get_next_coop_num() {
    var next_num = null;

    if (online == true) {
        odoo_num = get_latest_odoo_coop_bb();
        if (total_registred) {
            next_num = odoo_num + total_registred +1;
        } else {
            next_num = odoo_num + 1;
        }
    }

    return next_num;

}

function get_latest_odoo_coop_bb() {
    if (latest_odoo_coop_bb == null) {
        $.ajax({url : '/members/latest_coop_id/',
            dataType :'json'
        })
            .done(function(rData) {
                latest_odoo_coop_bb = rData.latest_coop_id;

            });
    } else {
        return latest_odoo_coop_bb;

    }
}

function generate_email() {
    var fname = $('input[name="firstname"]').val()
        .toFormatedFirstName();
    var lname = $('input[name="lastname"]').val()
        .toFormatedFirstName();

    if (fname.length > 0 && lname.length > 0) {
        var d = new Date();
        var num_part = (d.getYear() -100).toString() + (d.getMonth()+1).toString() + d.getDate().toString();

        // toFormatedFirstName replaces spaces by - (needed for email)
        var email = 'coop-' + fname + '.' + lname + num_part + '@' + email_domain;
        //get out accents

        email = email.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
            .replace(/ +/g, '-');
        $('input[name="email"]').val(email.toLowerCase());
    } else {
        alert('Le prénom et le nom doivent être renseignés pour générer le mail');
    }

}

function show_shift_calendar() {
    if (current_coop == null || typeof (current_coop.shift_template) != "undefined") {
        //Seulement pour information, pas de coop associé
        current_coop = null;
        coop_list_view.hide();
        ncoop_view.hide();
        retrieve_and_draw_shift_tempates();
        schoice_view.show();
    }
}

function getLocalInProcess() {
    var local_in_process = localStorage.getItem("in_process") || '[]';


    return JSON.parse(local_in_process);
}

function setLocalInProcess(lip) {
    localStorage.setItem("in_process", JSON.stringify(lip));
}

function keep_in_process_work(event) {
    //If data registration is in process, save it in localStorage
    if (current_coop != null && typeof (current_coop.shift_template) == "undefined") {
        local_in_process = getLocalInProcess();
        // Dont push it again if already stored
        var found = false;

        $.each(local_in_process, function(i, e) {
            if (current_coop._id == e._id)
                found = true;
        });
        if (found == false) {
            local_in_process.push(current_coop);
            setLocalInProcess(local_in_process);
        }

    }
}

function empty_waiting_local_processes() {
    local_in_process = getLocalInProcess();
    if (local_in_process.length > 0) {
        current_coop = local_in_process.pop();
        swipe_to_shift_choice();
        setLocalInProcess(local_in_process);
    }
}

$('#create_new_coop').click(create_new_coop);
next_coop.click(create_new_coop);
coop_list_btn.click(show_coop_list);
$('#coop_create').submit(store_new_coop);
$('#generate_email').click(generate_email);
$('#odoo_user_connect').click();


$('#shift_calendar').click(show_shift_calendar);

//get_latest_odoo_coop_bb();
update_self_records();
update_completed_count();

payment_meaning.change(function() {
    if ($(this).val() == 'ch') {
        ch_qty.show();
    } else {
        ch_qty.hide();
        ch_qty.val('');
    }
});

window.addEventListener("beforeunload", keep_in_process_work);

empty_waiting_local_processes();
