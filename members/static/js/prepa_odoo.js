var to_fill_box = $('#to_fill'),
    with_errors_box = $('#with_errors'),
    coops = {'to_fill': [],
        'with_errors': [],
        'waiting_validation_employee':[],
        'waiting_validation_member':[],
        'done':[]},
    validation_next_steps = {'to_fill': 'waiting_validation_employee',
        'waiting_validation_employee': 'waiting_validation_member',
        'waiting_validation_member': 'done'},

    dashboard = $('#dashboard'),

    coop_validation_form = $('#coop_validation_form'),
    warning_slide = $('#warning_slide'),
    warning_msg = $('#new_warning_form textarea[name="message"]'),
    waiting_validation_employee_div = $('#waiting_validation_employee'),
    waiting_validation_member_div = $('#waiting_validation_member'),
    done_div = $('#done'),
    form_delete = $('#form_delete'),
    problem_delete = $('#problem_delete'),
    vform = $('#coop_validation_form');

sync.on('change', function (info) {
    // handle change
    if (info.direction == 'pull') {
        retrieve_all_coops();
    }
}).on('paused', function (err) {
    // replication paused (e.g. replication up to date, user went offline)
    if (err) {
        online = false;
    }
})
    .on('active', function () {
    // replicate resumed (e.g. new changes replicating, user went back online)
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


function home() {
    coop_page.hide();
    warning_slide.hide();
    dashboard.show();
}

function is_in_coops(mail) {
    var answer = false;

    for (key in coops) {
        $.each(coops[key], function(i, e) {
            if (e._id == mail) {
                answer = true;
            }
        });
    }

    return answer;
}

// Store/update coop data in couchdb
function store_current_coop_data(callback) {
    dbc.put(current_coop, function(err, result) {
        if (!err) {
            current_coop._rev = result.rev;
            if (callback) callback(err);
        } else {
            console.log(err);
            if (err.name == 'conflict') {
                dbc.get(current_coop._id, {'latest': true})
                    .then(function(retrieved_coop) {
                        if (current_coop.errors) {
                            var err_msg = current_coop.errors;

                            if (retrieved_coop.errors && retrieved_coop.errors != err_msg) {
                                err_msg += ' ' + retrieved_coop.errors;
                                current_coop.errors = err_msg;
                            }

                        }
                        current_coop._rev = retrieved_coop._rev;
                        console.log('Enregistrement redemandé');
                        store_current_coop_data(callback);
                    });
            }
        }
    });
}

// Remove old document if id (email) changed before applying changes
function put_current_coop_in_buffer_db(callback) {
    var can_continue = true;

    if (typeof current_coop._old_id != "undefined") {
        dbc.remove(current_coop._old_id, current_coop._rev, function(err, response) {
            if (err) {
                console.log(err); can_continue = false;
            }
        });
        delete current_coop._rev;
        delete current_coop._old_id;
    }
    if (can_continue == true) {
        store_current_coop_data(callback);
    } else {
        alert('Problème de sauvegarde des modifications');
    }
}

function process_new_warning(event) {
    event.preventDefault();
    var msg = warning_msg.val();
    var btn = $(event.target).find('button');

    openModal();
    if (msg.length > 0) {
        current_coop.errors = msg;
        store_current_coop_data(function() {
            retrieve_all_coops();
            closeModal();
            home();
            display_msg_box('Enregistrement signalement problème terminé.', 'success');
        });
    } else {
        closeModal();
        alert('Le message est vide !');
    }
}

// Set current coop to previous validation state
function previous_validation_state() {
    for (var key in validation_next_steps) {
        if (current_coop.validation_state == validation_next_steps[key]) {
            current_coop.validation_state = key;
            store_current_coop_data();
            break;
        }
    }
}

function submit_full_coop_form() {
    let form = $('#coop_validation_form');
    var form_data = new FormData(form.get(0)),
        m_barcode = form.find('[name="m_barcode"]'),
        sex = $('#sex'),
        has_empty_values = false;

    for (var pair of form_data.entries()) {
        let val = pair[1],
            key = pair[0];

        if ($('input[name="' + key +'"]').get(0)
            .hasAttribute('required') && val.length == 0) {
            has_empty_values = true;
        }
    }

    if (has_empty_values == true) {
        closeModal();
        alert('Vous devez remplir tous les champs pour valider.');
        // If form not submitted, set back coop current validation_state
        previous_validation_state();
    } else {
        form_data.set(
            'firstname',
            vform.find('input[name="firstname"]').val()
                .toFormatedFirstName()
        );
        form_data.set(
            'lastname',
            vform.find('input[name="lastname"]').val()
                .toFormatedLastName()
        );
        form_data.set('odoo_id', current_coop.odoo_id);

        form_data.set('shift_template', JSON.stringify(current_coop.shift_template));
        //Fields beeing disabled : force value
        form_data.set('shares_nb', vform.find('input[name="shares_nb"]').val());
        form_data.set('shares_euros', vform.find('input[name="shares_euros"]').val());
        form_data.set('checks_nb', vform.find('input[name="checks_nb"]').val());
        form_data.set('payment_meaning', vform.find('input[name="payment_meaning"]').val());
        if (m_barcode.length > 0) {
            form_data.set('m_barcode', m_barcode.val());
        }
        if (sex.length > 0) {
            form_data.set('sex', $('input[name="sex"]:checked').val());
        }
        post_form(
            '/members/coop_validated_data', form_data,
            function(err, result) {
                if (!err) {
                    setTimeout(after_save, 1500);
                } else {
                    console.log(err);
                }
            }
        );
    }
}

function odoo_create_coop() {
    var current_coop_copy = current_coop;

    current_coop_copy.shift_template = JSON.stringify(current_coop.shift_template);
    $.post({url : '/members/create_from_buffered_data/',
        headers: { "X-CSRFToken": getCookie("csrftoken") },
        data : current_coop_copy,
        dataType :'json'
    })
        .done(function(rData) {
            if (rData.odoo_id && ! isNaN(rData.odoo_id)) {
                after_save();
            } else {
                alert('Erreur pendant l\'enregistrement Odoo');
            }
        })
        .fail(function() {
            after_save(1);
        });
}

// Save the current coop details from form values
// Then do callback function
function save_current_coop(callback) {
    //_id obligatoire !
    let form = coop_validation_form,
        _id = form.find('[name="email"]').val(),
        m_barcode = form.find('[name="m_barcode"]'),
        sex = form.find('[name="sex"]');

    if (current_coop != null && _id.length > 0) {
    //Birthdate verification
        let birthdate = form.find('[name="birthdate"]').val()
            .trim();
        var birthdate_error = false,
            m_barcode_error = false,
            sex_error = false;

        if (/([0-9]{2})\/([0-9]{2})\/([0-9]{4})/.exec(birthdate)) {
            var jj = RegExp.$1,
                mm = RegExp.$2,
                aaaa = RegExp.$3;

            if (jj > 31 || mm > 12 || aaaa < 1900 || aaaa > 2018) {
                birthdate_error = true;
            }
        } else {
            birthdate_error = true;
        }

        let street2_input = form.find('[name="street2"]'),
            phone_input = form.find('[name="phone"]');

        current_coop.firstname = form.find('[name="firstname"]').val()
            .toFormatedFirstName();
        current_coop.lastname = form.find('[name="lastname"]').val()
            .toFormatedLastName();
        if (current_coop._id != _id) {
            current_coop._old_id = current_coop._id;
        }

        current_coop._id = _id;
        current_coop.birthdate = birthdate;
        current_coop.address = form.find('[name="address"]').val();

        if (sex.length > 0) {
            current_coop.sex = $('input[name="sex"]:checked').val();
            if (typeof current_coop.sex == "undefined") sex_error = true;
        }
        if (street2_input.length > 0) {
            current_coop.street2 = street2_input.val();
        }
        current_coop.city = form.find('[name="city"]').val();
        current_coop.zip = form.find('[name="zip"]').val();
        current_coop.country = form.find('[name="country"]').val();
        current_coop.mobile = form.find('[name="mobile"]').val();
        if (phone_input.length > 0) {
            current_coop.phone = phone_input.val();
        }
        current_coop.shares_nb = form.find('[name="shares_nb"]').val();
        current_coop.shares_euros = form.find('[name="shares_euros"]').val();
        current_coop.checks_nb = form.find('[name="checks_nb"]').val();
        current_coop.payment_meaning = form.find('[name="payment_meaning"]').val();
        if (m_barcode.length > 0) {
            current_coop.m_barcode = m_barcode.val();
            if (!isValidEAN13(current_coop.m_barcode)) m_barcode_error = true;
        }
        if ((birthdate_error == true || m_barcode_error == true || sex_error == true) && callback) {
            put_current_coop_in_buffer_db();
            closeModal();
            var msg = '';

            if (birthdate_error == true)
                msg += "La date de naissance ne semble pas correcte (jj/mm/aaaa)\n";
            if (m_barcode_error == true)
                msg += "Le code-barre n'est pas valide\n";
            if (sex_error == true)
                msg += "Une option concernant le sexe doit être cochée\n";
            alert(msg);
        } else {
            // Send coop to next step
            if (callback) current_coop.validation_state = validation_next_steps[current_coop.validation_state];
            //if not were are in the case of problem warning (no validation step change)
            put_current_coop_in_buffer_db(callback);
        }
    }
}

// After save, get coops again and reset page
function after_save(err) {
    closeModal();
    if (!err) {
    // put_current_coop_in_buffer_db(retrieve_all_coops);
        retrieve_all_coops();
        home();
    } else {
        alert('Une erreur est survenue pendant l\'enregistrement');
    }
}

// Validate & store sensitive data from form, check for errors, then do relevant action according to process state
function process_validation_form(event) {
    event.preventDefault();
    //Shares nb and euros are consistent ?
    var shares_nb = parseInt($('[name="shares_nb"]').val(), 10);
    var shares_euros = parseInt($('[name="shares_euros"]').val(), 10);
    var is_valid = true;

    if (!isNaN(shares_nb) && !isNaN(shares_euros)) {
        if (shares_euros != 10*shares_nb) {
            is_valid = false;
            alert('Le nombre de parts et le montant en euros ne correspondent pas !');
        }
    }

    if (current_coop.payment_meaning == "ch" && current_coop.checks_nb < 1) {
        is_valid = false;
        alert('Le nombre de chèques doit être supérieur à 0 !');
    }

    // Save checks details
    var total = 0;

    if (current_coop.validation_state == 'waiting_validation_employee' && current_coop.payment_meaning == "ch" && current_coop.checks_nb > 1) {
        var checks = [];

        for (var i = 1; i <= current_coop.checks_nb; i++) {
            var check_value = parseInt($('[name="check_' + i + '"]').val());

            if (check_value == 0) {
                is_valid = false;
                alert('Un chèque ne peut pas avoir une valeur à 0 !');
            } else {
                checks.push(check_value);
                total += check_value;
            }
        }

        if (total != $('[name="shares_euros"]').val()) {
            if (is_valid) {
                is_valid = false;
                alert('La somme des chèques ne correspond pas au montant de la cotisation !');
            }
        } else {
            current_coop.checks = JSON.stringify(checks);
        }
    }

    if (is_time_to('save_form_in_odoo')) {
        if (is_valid == true) {
            openModal();

            if (current_coop.validation_state == "to_fill") {
                save_current_coop(after_save); // First step, coop info only saved in couchdb
            } else if (current_coop.validation_state == 'waiting_validation_employee') {
                save_current_coop(odoo_create_coop); // Second step, coop is created in odoo
            } else if (current_coop.validation_state == 'waiting_validation_member') {
                save_current_coop(submit_full_coop_form);
            }
        } else {
            alert('Formulaire non valide.');
            closeModal();
        }
    } else {
        closeModal();
    }
}

function process_signaler_click() {
    var coop_msg = '';

    if (current_coop.coop_msg) {
        coop_msg = 'Message coop : ' + current_coop.coop_msg;
    } else {
    //save cuuren_coop with already given data
        save_current_coop();
    }

    dashboard.hide();
    coop_page.hide();
    // Connected user can delete a coop if errors exist
    if (!coop_is_connected() || (typeof (current_coop.errors) == "undefined" && typeof (current_coop.coop_msg) == "undefined")) {
        form_delete.hide();
        problem_delete.hide();
    } else if (coop_is_connected()) {
        if (typeof (current_coop.errors) != "undefined" || typeof (current_coop.coop_msg) != "undefined")
            form_delete.show();
        problem_delete.show();
    }

    warning_slide.find('[name="firstname"]').val(current_coop.firstname);
    warning_slide.find('[name="lastname"]').val(current_coop.lastname);
    //warning_slide.find('[name="barcode_base"]').val(current_coop.barcode_base);
    warning_slide.find('[name="message"]').val(current_coop.errors || '');
    warning_slide.find('p.coop_msg').html(coop_msg);
    if (current_coop.odoo_state && current_coop.odoo_state == 'done') {
        form_delete.show();
    }
    warning_slide.show();
}

// Select the coop being udpated
function set_current_coop(clicked, callback) {
    var id = clicked.id;
    var type = clicked.validation_state;
    var coops_set = null;
    //coop_form is always empty, in order to remove all previous data, which could be associated to another coop.

    coop_validation_form.find(':input').not('[type="radio"]')
        .val('');
    if (type == 'to_fill') {
        coops_set = coops.to_fill;
    } else if (type == 'with_errors') {
        coops_set = coops.with_errors;
    } else if (type == 'waiting_validation_employee') {
        coops_set = coops.waiting_validation_employee;
    } else if (type == 'waiting_validation_member') {
        coops_set = coops.waiting_validation_member;
    } else if (type == 'done') {
        coops_set = coops.done;
    } else {
        coops_set = coops.to_fill;
    }
    if (coops_set != null) {
        if (type != 'done') {
            dashboard.hide();
        }
        for (i in coops_set) {
            if (coops_set[i]._id == id) {
                current_coop = coops_set[i];
                callback();
            }
        }
    }
}

// Archive a member record: delete from temp db
function coop_form_delete() {
    try {
    //Call django method (instead of pouchdb call)
        post_form(
            '/members/remove_data_from_couchdb',
            {email: current_coop._id},
            function(err, result) {
                if (!err) {
                    if (typeof(result.msg) != "undefined") {
                        alert(result.msg);
                    } else if (result.action === null) {
                        display_msg_box('Données supprimées.');
                        current_coop = null;
                        closeModal();
                        home();
                    }
                }
            }
        );
    } catch (e) {
        console.log(e);
    }
}

function coop_problem_delete() {
    delete current_coop.errors;
    delete current_coop.coop_msg;
    store_current_coop_data(function() {
        retrieve_all_coops();
        closeModal();
        home();
    });
}

function open_coop_form(e) {
    try {
        if (e) {
            var clicked = $(this);

            coop_target = {};
            coop_target.id = clicked.data('id');
            coop_target.validation_state = clicked.closest('div.main').attr('id');
        } else {
            return display_current_coop_form();
        }

        set_current_coop(coop_target, function() {
            if (coop_target.validation_state == 'to_fill') {
                display_current_coop_form();
            } else if ((coop_target.validation_state == 'waiting_validation_employee' || coop_target.validation_state == 'waiting_validation_member') && coop_is_connected()) {
                display_current_coop_form();
            } else if (coop_target.validation_state == 'done') {
                ask_for_deletion();
            } else {
                process_signaler_click();
            }
        });
    } catch (err) {
        error = {msg: err.name + ' : ' + err.message, ctx: 'open_coop_form'};
        console.error(error);
        report_JS_error(error, 'prepa-odoo');
    }
}

function ask_for_deletion() {
    var msg = 'Voulez-vous archiver ';

    msg += current_coop.firstname + ' ' + current_coop.lastname + ' ?';
    openModal(msg, coop_form_delete, 'Oui');
}

function ask_for_problem_deletion() {
    var msg = 'Voulez-vous enlever ' + current_coop.firstname + ' ' + current_coop.lastname + ' des coops à problème ?';

    openModal(msg, coop_problem_delete, 'Oui');
}
function add_coop_to_box(box, coop) {
    try {
        var info = coop.firstname + ' ' + coop.lastname;

        if (coop.odoo_state && coop.odoo_state == 'done') {
            info = coop.barcode_base + ' - ' + info;
        }

        info = $('<span/>').text(info);
        var cbox = $('<div/>').addClass('coop')
            .attr('data-id', coop._id)
            .append(info);
        // Only connected user can do these actions

        if ([
            "waiting_validation_employee",
            "waiting_validation_member",
            "done"
        ].indexOf(coop.validation_state) > -1
      && !coop_is_connected()) {
            cbox.addClass('coop_no_select');
        }
        box.append(cbox);
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'add_coop_to_box'};
        console.error(err);
        report_JS_error(err, 'prepa-odoo');
    }
}

//Called after having retrieved all coops
function dispatch_coops_in_boxes() {
    try {
        $('div.coop').off('click', open_coop_form);
        to_fill_box.html('');
        with_errors_box.html('');
        waiting_validation_employee_div.find('.elts').html('');
        waiting_validation_member_div.find('.elts').html('');
        done_div.find('.elts').html('');

        $.each(coops.to_fill, function(i, e) {
            add_coop_to_box(to_fill_box, e);
        });
        $.each(coops.with_errors, function(i, e) {
            add_coop_to_box(with_errors_box, e);
        });
        $.each(coops.waiting_validation_employee, function(i, e) {
            add_coop_to_box(waiting_validation_employee_div.find('.elts'), e);
        });
        $.each(coops.waiting_validation_member, function(i, e) {
            add_coop_to_box(waiting_validation_member_div.find('.elts'), e);
        });
        $.each(coops.done, function(i, e) {
            add_coop_to_box(done_div.find('.elts'), e);
        });

        $('div.coop').on('click', open_coop_form);
        $('div.coop_no_select').off('click', open_coop_form);
    } catch (e) {
        err = {msg: e.name + ' : ' + e.message, ctx: 'dispatch_coops_in_boxes'};
        console.error(err);
        report_JS_error(err, 'prepa-odoo');
    }
}

function handle_legacy_states(rows) {
    $.each(rows, function(i, e) {
        if (typeof (e.doc.validation_state) == "undefined") {
            if (typeof (e.doc.odoo_state) !== "undefined" && e.doc.odoo_state == 'done') {
                rows[i].doc.validation_state = 'done';
            } else if (typeof (e.doc.odoo_id) == "undefined" && typeof (e.doc.birthdate) != "undefined") {
                rows[i].doc.validation_state = 'waiting_validation_employee';
            } else if (typeof (e.doc.odoo_id) !== "undefined") {
                rows[i].doc.validation_state = 'waiting_validation_member';
            } else {
                rows[i].doc.validation_state = 'to_fill';
            }
        }
    });

    return rows;
}

// first function called when loading page
function retrieve_all_coops() {
    try {
        dbc.allDocs({include_docs: true, descending: true}, function(err, resp) {
            if (err) {
                return console.log(err);
            }
            coops = {'to_fill': [], 'with_errors': [], 'waiting_validation_employee':[], 'waiting_validation_member':[], 'done':[]};
            $.each(handle_legacy_states(resp.rows), function(i, e) {
                if (e.doc.firstname) {
                    if (e.doc.errors) {
                        coops.with_errors.push(e.doc);
                    } else if (e.doc.validation_state == "to_fill") {
                        coops.to_fill.push(e.doc);
                    } else if (e.doc.validation_state == "waiting_validation_employee") {
                        coops.waiting_validation_employee.push(e.doc);
                    } else if (e.doc.validation_state == "waiting_validation_member") {
                        coops.waiting_validation_member.push(e.doc);
                    } else if (e.doc.validation_state == "done") {
                        coops.done.push(e.doc);
                    }

                    if (e.doc.coop_msg) {
                        coops.with_errors.push(e.doc);
                    }
                }

            });

            coops['to_fill'].sort(function(a, b) {
                return a.barcode_base - b.barcode_base;
            });
            coops['with_errors'].sort(function(a, b) {
                return a.barcode_base - b.barcode_base;
            });
            coops['waiting_validation_employee'].sort(function(a, b) {
                return a.barcode_base - b.barcode_base;
            });
            coops['waiting_validation_member'].sort(function(a, b) {
                return a.odoo_id - b.odoo_id;
            });
            coops['done'].sort(function(a, b) {
                return b.timestamp - a.timestamp;
            });
            dispatch_coops_in_boxes();
        });
    } catch (err) {
        error = {msg: err.name + ' : ' + err.message, ctx: 'retrieve_all_coops'};
        console.log(error);
        report_JS_error(error, 'prepa-odoo');
    }
}

$(document).ready(function() {
    retrieve_all_coops();

    coop_validation_form.submit(process_validation_form);
    coop_validation_form.find('[name="signaler"]').click(process_signaler_click);
    $('#new_warning_form').submit(process_new_warning);

    $('.next_step button').click(function() {
        var clicked = $(this);

        if (clicked.data('action') == 'coop_form') {
            warning_slide.hide();
            open_coop_form();
        } else if (clicked.data('action') == 'form_delete') {
            ask_for_deletion();
        } else if (clicked.data('action') == 'problem_delete') {
            ask_for_problem_deletion();
        } else {
            current_coop = null;
            home();
        }
    });

});
