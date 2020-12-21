let vform = $('#coop_validation_form'),
    wform = $('#coop_warning_form'),
    m_barcode = vform.find('[name="m_barcode"]'),
    street2 = vform.find('input[name="street2"]'),
    phone = vform.find('input[name="phone"]'),
    sex = $('#sex');

wform.hide();

vform.find('input').attr('required', 'required');
// Setting required to fields doesn't prevent submit with empty fields anymore !!!
// TODO : Find out why
if (street2.length > 0) street2.get(0).removeAttribute('required');
if (phone.length > 0) phone.get(0).removeAttribute('required');

vform.find('[name="shares_nb"]').attr('disabled', 'disabled');
vform.find('[name="shares_euros"]').attr('disabled', 'disabled');
vform.find('[name="checks_nb"]').attr('disabled', 'disabled');
vform.find('[name="country"]').attr('disabled', 'disabled');
vform.find('[name="email"]').attr('disabled', 'disabled');
if (m_barcode.length > 0) {
    m_barcode.attr('disabled', 'disabled');
}

function show_warning_form() {
    vform.hide();
    wform.show();
}

function show_coop_form() {
    wform.hide();
    vform.show();
}





function process_form_submission(event) {
    event.preventDefault();
    var clicked = $(this),
        fname = clicked.attr('name');

    if (fname == 'valider') {
        var form_data = new FormData(vform.get(0)),
            has_empty_values = false;

        if (sex.length > 0) {
        //value attrribute is emptied when form is loaded !!
        //so, we have to retrive sex value using unusual way
            form_data.set(
                'sex',
                $('input[name="sex"]:checked').attr('id')
                    .replace('_sex', '')
            );
        }

        for (var pair of form_data.entries()) {
            let val = pair[1],
                key = pair[0];

            if ($('input[name="' + key +'"]').get(0)
                .hasAttribute('required') && val.length == 0) {
                has_empty_values = true;
            }
        }


        if (has_empty_values == true) {
            alert('Vous devez remplir tous les champs pour valider.');
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
            form_data.set('shares_euros', vform.find('input[name="shares_euros"]').val());
            form_data.set('email', current_coop._id);
            form_data.set('shares_nb', current_coop.shares_nb);
            form_data.set('checks_nb', current_coop.checks_nb);
            form_data.set('country', current_coop.country);
            if (m_barcode.length > 0) {
                form_data.set('m_barcode', current_coop.m_barcode);
            }
            openModal();
            post_form(
                '/members/coop_validated_data', form_data,
                function(err, result) {
                    closeModal();

                    if (!err) {
                        var msg = "Vous êtes maintenant enregistré ! ";

                        msg += "<a href='" + em_url + "'>Cliquez ici</a> ";
                        msg += "pour découvrir l'espace membre";
                        $('p.intro').remove();
                        vform.remove();
                        display_msg_box(msg);

                    }

                }
            );
        }


    } else if (fname =='warning') {
        var msg = $('textarea[name="message"]').val();
        var data = {'odoo_id': current_coop.odoo_id,
            'msg': msg, '_rev': current_coop._rev, '_id': current_coop._id};

        openModal();
        post_form(
            '/members/coop_warning_msg', data,
            function(err, result) {
                closeModal();
                if (!err) {
                    $('#main_content').remove();
                    display_msg_box('Message enregistré ! Le bureau des membres est averti.');
                }

            }
        );
    }
}

try {
    current_coop = coop;
    display_current_coop_form();
    var w_msg = current_coop.coop_msg || '';

    wform.find('textarea').val(w_msg);
} catch (e) {
    console.log(e);
}

$('button').click(process_form_submission);
$('a[name="signaler"]').click(show_warning_form);
$('a[name="retour"]').click(show_coop_form);
