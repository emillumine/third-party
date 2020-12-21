try {
    let y_sel = $('[name="yyyy"]'),
        m_sel = $('[name="mm"]'),
        j_sel = $('[name="jj"]'),
        birthdate = $('[name="birthdate"]'),
        save_btn = $('#save');

    var make_save_button_active = function() {
        if (! save_btn.hasClass('btn--primary')) {
            save_btn.addClass('btn--primary');
            save_btn.css({'cursor':'pointer'});
        }
    };

    var update_birthdate = function() {
        birthdate.val(y_sel.val() + '-' + m_sel.val() + '-' + j_sel.val());
        make_save_button_active();
    };

    var init_birthdate_selects = function() {
        let [
            y,
            m,
            d
        ] = birthdate.val().split('-');

        var now = new Date();
        var end_year = new Date(now.setYear(now.getFullYear() - 15)).getFullYear();

        for (var i=100; i>0; i--) {
            var opt = $('<option>').val(end_year-i)
                .text(end_year-i);

            if (end_year-i == y) opt.prop('selected', true);
            opt.appendTo(y_sel);
        }
        for (var k=1; k<=12; k++) {
            let mth = k.pad(2);
            let opt = $('<option>').val(mth)
                .text(mth);

            if (m == mth) opt.prop('selected', true);
            opt.appendTo(m_sel);
        }
        for (var l=1; l<=31; l++) {
            let day = l.pad(2);
            let opt = $('<option>').val(day)
                .text(day);

            if (d == day) opt.prop('selected', true);
            opt.appendTo(j_sel);
        }
        y_sel.change(update_birthdate);
        m_sel.change(update_birthdate);
        j_sel.change(update_birthdate);
    };

    var save_data = function() {
        //Transmit only what has been changed
        var changed = {};

        for (attr in original) {
            var current_val = $('[name="' + attr + '"]').val();

            if (attr == 'sex') {
                current_val = $('[name="' + attr + '"]:checked').val();
            }
            if (current_val.trim() != original[attr]) {
                if (! (original[attr] == 'False' && current_val.length ==0))
                    changed[attr] = current_val.trim();
            }
        }
        // console.log(changed)
        if (Object.keys(changed).length > 0) {
            if ('firstname' in changed || 'lastname' in changed) {
                changed['name'] = $('[name="firstname"]').val()
                                  + name_sep
                                  + $('[name="lastname"]').val();
            }
            delete changed['email'];
            post_form(
                '/website/update_info_perso',
                changed,
                function(err, result) {
                    if (typeof result.res.process != "undefined" &&
                        typeof result.res.process.update != "undefined" &&
                        result.res.process.update == true) {
                        save_btn.removeClass('btn--primary');
                        save_btn.css({'cursor':'default'});
                        for (attr in changed) {
                            if (attr != 'name')
                                original[attr] = changed[attr];
                        }
                        alert('Modifications enregistrées !');
                    } else {
                        alert('Une erreur est intervenue pendant l\'enregistrement');
                    }

                }
            );
        } else {
            alert('Aucune modification significative détectée');
        }

    };

    if (typeof original.sex != "undefined") {
        $("#" + original.sex + "_sex").prop('checked', true);
    }

    init_birthdate_selects();
    $('input').keyup(make_save_button_active);

    save_btn.click(function() {
        if ($(this).hasClass('btn--primary') && is_time_to('save_perso_data')) {
            save_data();
        }
    });

} catch (error) {
    err_obj = {msg: error.name + ' : ' + error.message, ctx: 'info_perso'};
    report_JS_error(error, 'website');
}
