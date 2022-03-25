var weeks_name = [
    '?',
    'A',
    'B',
    'C',
    'D'
];

var online = true; // forcément vrai au chargement ! (si pas de cache)
var current_coop = null;
var st_url = '/members/get_all_shift_templates/';
var schoice_view = $('#shift_choice > div ');
var shift_templates = [];
var shift_table = $('#shift_choice .main_content table');
var sc_lat = $('#shift_choice .lat_menu');
var st_loc_buttons = $('#shift_choice .lat_menu button');
var week_types = $('#week_types');
var volant = null;





function get_displayed_weeks() {
    displayed_weeks = [];
    week_types.find('.selected_weeks :checked').each(function() {
        displayed_weeks.push($(this).val());
    });

    return displayed_weeks;
}

function get_shift_name(s_data) {
    var shift_name = "Inconnu";

    if (s_data && s_data.week) {
        shift_name = weeks_name[s_data.week];
        if (s_data.type == 2 && typeof manage_ftop != "undefined" && manage_ftop == true && s_data.id != ASSOCIATE_MEMBER_SHIFT) {
            shift_name = 'Volant';
        } else if(s_data.id == ASSOCIATE_MEMBER_SHIFT) {
            shift_name = 'Binôme';
        } else {
            shift_name += s_data.day + ' - ' + s_data.begin;
            shift_name += ' - ' + s_data.place;
        }
    }
    return shift_name;
}



function subscribe_shift(shift_t_id) {
    var s_data = shift_templates[shift_t_id].data;
    var shift_name = get_shift_name(s_data);

    openModal(
        'On inscrit le membre au créneau ' + shift_name,
        function() {
            closeModal();
            current_coop.shift_template = shift_templates[shift_t_id];
            current_coop.timestamp = Date.now();
            current_coop.completed = 'shift';
            /*
            if (!current_coop.barcode_base){
             current_coop.barcode_base = get_next_coop_num() || 'Indéterminé';
            }*/

            //total_registred
            dbc.put(current_coop, function callback(err, result) {
                if (!err) {
                    //console.log('Créneau enregistré !');
                    //current_coop._rev = result.rev;
                    if (context == 'inscription') {
                        update_self_records();
                        new_coop_validation();
                    } else {
                        schoice_view.hide();
                        save_current_coop();
                        display_current_coop_form();
                    }
                    //process_state.find('.s_shift').text('('+shift_name+')')
                } else {
                    console.log(err);
                }
            });

        }
    );

}

function single_shift_click() {
    var clicked = $(this);

    if (! clicked.hasClass('full')) {
        var shift_t_id = clicked.data('id');

        subscribe_shift(shift_t_id);
    }
}

function select_shift_among_compact() {
    var clicked = $(this);
    var day = clicked.closest('td').attr('class');
    var hour = clicked.closest('tr').data('begin');
    var selected = null;
    var worst_score = 1;

    displayed_weeks = get_displayed_weeks();
    var place_cond = sc_lat.find('.highlighted').data('select');

    $.each(shift_templates, function(i, e) {
        if (e.data) {
            var keep_it = false;
            var place = e.data.place;

            if (place_cond == 'both' || place_cond == place) {
                if (e.data.begin == hour && e.data.day == day) {
                    keep_it = true;
                }
            }

            if (keep_it == true && displayed_weeks.indexOf(e.data.week.toString()) > -1) {

                if (e.data.reserved / e.data.max < worst_score) {
                    worst_score = e.data.reserved / e.data.max;
                    selected = i;
                }
            }
        }
    });
    //console.log(worst_score)
    if (selected)
        subscribe_shift(selected);
}


function draw_table(begin_hours, callback) {
    shift_table.find('tbody tr').remove();
    begin_hours.sort();
    var days = [
        "Lun",
        "Mar",
        "Mer",
        "Jeu",
        "Ven",
        "Sam"
    ];

    if (typeof open_on_sunday != "undefined" && open_on_sunday == true) {
        days.push("Dim");
    }
    $.each(begin_hours, function(i, e) {
        var tr = $('<tr>').attr('data-targ', 'magasin')
            .attr('data-begin', e);

        tr.append($('<td>').text(e));
        for (idx in days) {
            tr.append($('<td>').addClass(days[idx]));
        }
        shift_table.append(tr);

    });
    callback();

}

function draw_shift_templates() {
    var existing_shifts = shift_table.find('.shift');

    existing_shifts.off("click", single_shift_click);
    existing_shifts.off("click", select_shift_among_compact);
    existing_shifts.remove();

    var place_cond = sc_lat.find('.highlighted').data('select');
    //warning MAG_NAME should correspond to data.place value of shift_templates objects

    dispo = 0;
    max = 0;


    displayed_weeks = get_displayed_weeks();
    var boxes = {};
    var begin_hours = [];
    //Find out hours to display in table
    //After each operations, begin_hours is an array of "hours"

    $.each(shift_templates, function(i, e) {
        if (e.data) {
            var keep_it = false;
            var place = e.data.place;

            if (e.data.begin <= max_begin_hour && e.data.max > 0 && (place_cond == 'both' || place_cond == place)) {
                keep_it = true;
            }

            if (keep_it == true && displayed_weeks.indexOf(e.data.week.toString()) > -1) {
                var known_begin_hour = false;

                for (idx in begin_hours) {
                    if (e.data.begin == begin_hours[idx]) known_begin_hour = true;
                }
                if (known_begin_hour == false) begin_hours.push(e.data.begin);

            }
        }
    });

    draw_table(begin_hours, function() {
        $.each(shift_templates, function(i, e) {
            if (e.data) {
                var keep_it = false;
                var place = e.data.place;
                // Legacy conditions ('both' was an option when 2 places were used)

                if (place_cond == 'both' || place_cond == place) {
                    keep_it = true;
                }

                if (keep_it == true && displayed_weeks.indexOf(e.data.week.toString()) > -1) {
                    if (type == 1) {
                        //Every shift template is displayed
                        var box = $('<div/>').attr('data-week', e.data.week);

                        box.attr('data-place', place);
                        box.attr('data-id', i);
                        box.attr('title', 'Termine à '+e.data.end);
                        box.text(e.data.reserved + '/' + e.data.max);
                        box.addClass('shift');
                        if (e.data.reserved / e.data.max <= .75) {
                            box.addClass('alert');
                        } else if (e.data.reserved == e.data.max) {
                            box.addClass('full');
                        }

                        var target = shift_table.find('tr[data-begin="'+e.data.begin+'"]').find('td.'+e.data.day);

                        if (target.length > 0) {
                            max += e.data.max;
                            dispo += (e.data.max - e.data.reserved);
                            target.append(box);
                        }
                    }
                    if (type == 2) {
                        //Shift templates are gathered (places and weeks)
                        //a profile is defined (useful for assigning it a color)
                        profile = 'more_than_50pc';
                        if (e.data.reserved / e.data.max <= .25) {
                            profile = 'less_than_25pc';
                        } else if (e.data.reserved / e.data.max <= .5) {
                            profile = 'less_than_50pc';
                        }
                        //Compile data for each box, including profil
                        if (typeof boxes[e.data.day+'_'+e.data.begin] == "undefined") {
                            boxes[e.data.day+'_'+e.data.begin] = {'reserved': e.data.reserved, 'max':e.data.max, 'profil': profile};
                        } else {
                            boxes[e.data.day+'_'+e.data.begin]['reserved'] +=e.data.reserved;
                            boxes[e.data.day+'_'+e.data.begin]['max'] +=e.data.max;
                            var existing_profil = boxes[e.data.day+'_'+e.data.begin]['profil'];

                            if (existing_profil == 'more_than_50pc' && profile != 'more_than_50pc') {
                                boxes[e.data.day+'_'+e.data.begin]['profil'] = profile;
                            }
                            if (existing_profil == 'less_than_50pc' && profile == 'less_than_25pc') {
                                boxes[e.data.day+'_'+e.data.begin]['profil'] = profile;
                            }
                        }

                    }
                }


            }

        });
        if (type == 1) {
            shift_table.find('.shift').on("click", single_shift_click);
        }
        if (type == 2) {
            for (k in boxes) {
                var k_elts = k.split("_");
                var day = k_elts[0];
                var hour = k_elts[1];
                var target = shift_table.find('tr[data-begin="'+hour+'"]').find('td.'+day);

                if (target.length > 0) {
                    max += boxes[k].max;
                    dispo += (boxes[k].max - boxes[k].reserved);
                    var box = $('<div/>').attr('data-type', 'compact');

                    box.addClass('shift');
                    box.addClass('b_'+boxes[k].profil);
                    if (boxes[k].max <=boxes[k].reserved) {
                        box.addClass('full');
                    }
                    box.text(boxes[k].reserved + '/' + boxes[k].max);
                    target.append(box);
                }

            }
            shift_table.find('.shift').on("click", select_shift_among_compact);
        }



        sc_lat.find('.info').html(dispo + ' places disponibles<br />(/'+max+')');

        closeModal();
    });

}


function retrieve_and_draw_shift_tempates() {

    openModal();


    shift_table.find('.shift').remove();
    $.ajax({url : st_url,
        dataType :'json'
    })
        .done(function(rData) {
            shift_templates = rData.creneaux;
            $.each(shift_templates, function(i, e) {

                if (e.data.type == 2 && volant == null) {
                    volant = e.data.id;
                }
            });

            dbc.allDocs({include_docs: true, descending: true}, function(err, resp) {
                if (err) {
                    return console.log(err);
                }
                $.each(resp.rows, function(i, e) {
                    if (e.doc.shift_template && typeof(e.doc.shift_template.data) != "undefined") {
                        try {
                            if (typeof shift_templates[e.doc.shift_template.data.id]!= "undefined")
                                shift_templates[e.doc.shift_template.data.id]['data']['reserved'] += 1;
                        } catch (ec) {
                            console.log(ec);
                        }
                    }

                });
                draw_shift_templates();
            });


        });
}

function filter_weeks() {

    var clicked = $(this);

    var parent_div = clicked.closest('div');
    var w1 = week_types.find('#dw1');
    var w2 = week_types.find('#dw2');
    var w3 = week_types.find('#dw3');
    var w4 = week_types.find('#dw4');

    if (parent_div.hasClass('oddeven_selector')) {
        // Paires ou impaires has been clicked
        if (clicked.is(':checked')) {
            if (clicked.val() == 0) {
                w1.prop('checked', true);
                w3.prop('checked', true);
            } else {
                w2.prop('checked', true);
                w4.prop('checked', true);
            }
        } else {
            if (clicked.val() == 0) {
                w1.prop('checked', false);
                w3.prop('checked', false);
            } else {
                w2.prop('checked', false);
                w4.prop('checked', false);
            }
        }

    }

    //unhilight or hilight Paire / Impaires according weeks selections
    if (w1.is(':checked') && w3.is(':checked')) {
        $('#even_weeks').prop('checked', true);
    }
    if (w2.is(':checked') && w4.is(':checked')) {
        $('#odd_weeks').prop('checked', true);
    }

    if (!w1.is(':checked') || !w3.is(':checked')) {
        $('#even_weeks').prop('checked', false);
    }
    if (!w2.is(':checked') || !w4.is(':checked')) {
        $('#odd_weeks').prop('checked', false);
    }

    draw_shift_templates();
}

function shift_loc_selection() {
    var clicked = $(this);

    st_loc_buttons.removeClass('highlighted');
    clicked.addClass('highlighted');
    if (clicked.data('select') != 'Volant') {
        retrieve_and_draw_shift_tempates();
    } else {
        subscribe_shift(volant);
    }

}

st_loc_buttons.click(shift_loc_selection);

week_types.find('input').change(filter_weeks);
