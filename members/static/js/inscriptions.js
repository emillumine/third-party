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
    selected_associate=null,
    associated_old_choice= null,

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
            retrieve_and_draw_shift_tempates({without_modal: true, shift_listener: true});

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
    .on('denied', function () {
    // a document failed to replicate (e.g. due to permissions)
    })
    .on('complete', function () {
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
    var st = get_shift_name(current_coop.shift_template.data);

    coop_registration_details.find('.shift_template').text(st);
    process_state.html(current_coop.firstname + ' ' +current_coop.lastname);
    coop_registration_details.find("#parentName").text("");
    coop_registration_details.find("#parent").attr("hidden", true);

    if (current_coop.parent_name !== undefined) {
        coop_registration_details.find("#parentName").text(current_coop.parent_name);
        coop_registration_details.find("#parent").removeAttr("hidden");
    }

    if (current_coop.shift_template.data && current_coop.shift_template.data.id != ASSOCIATE_MEMBER_SHIFT) {
        get_next_shift(current_coop.shift_template.data.id, function(data) {
            if (data != null) {
                coop_registration_details.find('#next_shift_registration_detail').show();
                coop_registration_details.find('.next_shift').text(data.date_begin);
            }
            coop_registration_details.show();
        });
    } else {
        coop_registration_details.find('#next_shift_registration_detail').hide();
        coop_registration_details.show();
    }
}

function reset_sex_radios() {
    sex.find('input').each(function(i, e) {
        $(e).prop('checked', false);
    });
}

function create_new_coop() {
    selected_associate= null;
    $('#associate_area').hide();
    $('.chosen_associate').html("");
    $('.chosen_associate_area').hide();
    $('.member_choice').removeClass('choice_active');
    $(".remove_binome_icon").on("click", hide_chosen_associate);
    $('input[name="binome"]').prop('checked',false);
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

            dbc.remove(current_email, coop._rev, function(err) {

                if (err) {
                    return console.log(err);
                }

                return null;

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
    if (associated_old_choice == 'existing_member_choice') {
        if (selected_associate!=null) {
            coop.is_associated_people = true;
            coop.parent_id=selected_associate.id;
            coop.parent_name=selected_associate.barcode_base + ' - '+ selected_associate.name;
            coop.shift_template = shift_templates[ASSOCIATE_MEMBER_SHIFT];
        }
    } else if (associated_old_choice == 'new_member_choice' && $('#new_member_input').val()!='') {
        coop.is_associated_people = true;
        coop.parent_name=$('#new_member_input').val();
        delete coop.parent_id;
        coop.shift_template = shift_templates[ASSOCIATE_MEMBER_SHIFT];
    } else {
        delete coop.is_associated_people;
        delete coop.parent_id;
        delete coop.parent_name;
    }
    selected_associate=null;
    $('#new_member_input').val('');
    $('#associate_area').hide();
    $('.chosen_associate_area').hide();
    $('.chosen_associate').html("");
    associated_old_choice= null;

    if (m_barcode.length > 0) coop.m_barcode = bc;
    if (sex.length > 0) coop.sex = msex;
    coop.validation_state = "to_fill";
    dbc.put(coop, function callback(err, result) {
        if (!err) {
            coop._rev = result.rev;
            current_coop = coop;
            if (typeof coop.shift_template != "undefined" && coop.shift_template.data.id != ASSOCIATE_MEMBER_SHIFT) {
                openModal(
                    'Voulez-vous modifier le créneau choisi ?', swipe_to_shift_choice, 'oui',
                    false, true, show_coop_list
                );
            } else if (coop.is_associated_people && typeof coop.shift_template != "undefined" && coop.shift_template.data.id == ASSOCIATE_MEMBER_SHIFT) {
                ncoop_view.hide();
                new_coop_validation();
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
        msex = '', // sex may not be present
        associated_area_actived = $('#associate_area'); // need to ckeck if type of association is choosen
        active_asso_area = $('#associate_area .choice_active'); // need to ckeck if associated data are available
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

    if (associated_area_actived.show()) {
        // If user choose yes for binome, a type of association must be selected 
        let associated_data_selected = false;

        if (
            ($(active_asso_area[0]).attr('id') === "new_member_choice")
            ||
            ($(active_asso_area[0]).attr('id') === "existing_member_choice")
        ) {
            associated_data_selected = true;
        }
        if (associated_data_selected === false) errors.push("Un des deux choix doit être sélectionné");

    }

    if (active_asso_area.length > 0) {
        // If user click as if a "binôme" is beeing created, data about parent member must exist
        let associated_data_ok = false;

        if (
            ($(active_asso_area[0]).attr('id') === "new_member_choice" && $('#new_member_input').val()
                .trim().length > 0)
            ||
            ($(active_asso_area[0]).attr('id') === "existing_member_choice" && $('#existing_member_choice_action .chosen_associate div.member').length > 0)
        ) {
            associated_data_ok = true;
        } else if ($(active_asso_area[0]).attr('id') === "") {
            associated_data_ok = false;
            errors.push("Un des deux choix doit être sélectionné");
        }
        if (associated_data_ok === false) errors.push("Le membre 'titulaire' du binôme n'est pas défini");
    }

    $.ajax({url : '/members/exists/' + email,
        dataType :'json'
    })
        .done(function(rData) {
            if (typeof(rData.answer) == 'boolean' && rData.answer == true) {
                errors.push("Il y a déjà un enregistrement Odoo avec cette adresse mail !");
            }
            if (selected_associate!=null) {
                $.ajax({url : '/members/is_associated/' + selected_associate.id,
                    dataType :'json'
                }).done(function(rData) {
                    if (typeof(rData.answer) == 'boolean' && rData.answer == true) {
                        errors.push("Ce membre a déjà un binôme majeur");
                    }
                    if (errors.length == 0) {
                        _really_save_new_coop(
                            email, fname, lname,
                            subs_cap.val(), payment_meaning.val(), ch_qty.val(), bc, msex
                        );

                    } else {
                        alert(errors.join("\n"));
                    }
                });

            } else {
                if (errors.length == 0) {
                    _really_save_new_coop(
                        email, fname, lname,
                        subs_cap.val(), payment_meaning.val(), ch_qty.val(), bc, msex
                    );

                } else {
                    alert(errors.join("\n"));
                }
            }
        });
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
    if (current_coop.is_associated_people) {
        $('.member_choice').removeClass('choice_active');
        $('#associate_area').show();
        if (current_coop.parent_id) {
            $('#existing_member_choice_action').show();
            $('#new_member_choice_action').hide();
            $('#existing_member_choice').addClass('choice_active');
            var member_button = '<div>' + current_coop.parent_name + '</div>';

            $('.chosen_associate').html(member_button);
            $('.chosen_associate_area').show();
            associated_old_choice = 'existing_member_choice';



        } else {
            $('#new_member_choice_action').show();
            $('#existing_member_choice_action').hide();
            $('#new_member_choice').addClass('choice_active');
            $('#new_member_input').val(current_coop.parent_name);
            $('.chosen_associate').html('');
            $('.chosen_associate_area').hide();
            associated_old_choice = 'new_member_choice';
        }
    }
    subs_cap.val(current_coop.shares_euros);
    if (m_barcode.length > 0) m_barcode.val(current_coop.m_barcode);
    if (sex.length > 0) {
        reset_sex_radios();
        $('#' + current_coop.sex + '_sex').prop('checked', true);
    }
    ncoop_view.show();
}

function hide_chosen_associate() {
    selected_associate=null;
    $(".chosen_associate_area").hide();
    $('.chosen_associate').html("");
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

    return null;
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

function keep_in_process_work() {
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

$('#no_binome').click(function() {
    $('#associate_area').hide();
    $('#new_member_input').val('');
    $('#associate_area .choice_active').removeClass("choice_active");
    associated_old_choice = null;
    if (current_coop !=null) {
        delete current_coop.parent_name;
        delete current_coop.parent_id;
        delete current_coop.is_associated_people;
        delete current_coop.shift_template;
    }
});

$('#add_binome').click(function() {
    $('#associate_area').show();
    $('.member_choice').removeClass('choice_active');
    $('#existing_member_choice_action').hide();
    $('#new_member_choice_action').hide();
    associated_old_choice = null;

});

$('.member_choice').on('click', function() {

    if (associated_old_choice !=null && associated_old_choice!=$(this).attr('id')) {
        $('#'+$(this).attr('id')+'_action').show();
        $('#'+associated_old_choice+'_action').hide();
        $('#'+associated_old_choice).removeClass('choice_active');
    } else if (associated_old_choice ==null) {
        $('#'+$(this).attr('id')+'_action').show();

    }
    associated_old_choice=$(this).attr('id');
    $(this).addClass('choice_active');

});

$('#shift_calendar').click(show_shift_calendar);
$('#search_member_input').keypress((event) => {
    if (event.keyCode==13) {
        event.preventDefault();
        searchMembersForAssociate();
    }
});

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

/**
 * Display the members from the search result
 */
function display_possible_members() {
    $('.search_member_results_area').show();
    $('.search_member_results').empty();
    $('.btn_possible_member').off();

    $('.chosen_associate').html("");
    $('.chosen_associate_area').hide();

    let no_result = true;

    if (members_search_results.length > 0) {
        for (member of members_search_results) {
            $(".search_results_text").show();
            no_result = false;

            // Display results (possible members) as buttons
            var member_button = '<button class="btn--success btn_possible_member" member_id="'
                + member.id + '">'
                + member.barcode_base + ' - ' + member.name
                + '</button>';

            $('.search_member_results').append(member_button);
        }

        // Set action on member button click
        $('.btn_possible_member').on('click', function() {
            for (member of members_search_results) {
                if (member.id == $(this).attr('member_id')) {
                    selected_associate = member;

                    var member_button = '<div  member_id="' + member.id + '" class="member">' + member.barcode_base + ' - ' + member.name + '</div>';

                    $('.chosen_associate').html(member_button);
                    $('.chosen_associate_area').show();

                    $('.search_member_results').empty();
                    $('.search_member_results_area').hide();
                    $('#search_member_input').val('');
                    break;
                }
            }
        });
    }

    if (no_result === true) {
        $(".search_results_text").hide();
        $('.search_member_results').html(`<p>
            <i>Aucun résultat ! Vérifiez votre recherche, ou si le.la membre n'est pas déjà dans le tableau...</i>
        </p>`);
    }
}


/**
 * Search for members to associate a new member with an old one.
 */
function searchMembersForAssociate() {
    let search_str = $('#search_member_input').val();

    if (search_str) {
        $.ajax({
            url: '/members/search/' + search_str+ "?search_type=members",
            dataType : 'json',
            success: function(data) {
                members_search_results = [];

                for (member of data.res) {
                    if (member.is_member || member.is_associated_people) {
                        members_search_results.push(member);
                    }
                }

                display_possible_members();
            },
            error: function() {
                err = {
                    msg: "erreur serveur lors de la recherche de membres",
                    ctx: 'search_member_form.search_members'
                };
                report_JS_error(err, 'members.admin');

                $.notify("Erreur lors de la recherche de membre, il faut ré-essayer plus tard...", {
                    globalPosition:"top right",
                    className: "error"
                });
            }
        });
    } else {
        members_search_results = [];
        display_possible_members();
    }
}


$(document).ready(function() {
    retrieve_and_draw_shift_tempates();
    // Set action to search for the member
    $('#search_member_button').on('click', function() {
        searchMembersForAssociate();
    });

    if (committees_shift_id !== "None") {
        $("#shift_choice button[data-select='Volant']").text("Comités");
    }
});
