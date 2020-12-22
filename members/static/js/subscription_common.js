var coop_page = $('#coop_page');

function show_checks_nb() {
    $('#coop_validation_form').find('[name="checks_nb"]')
        .show();
    $('#coop_validation_form').find('[id="checks_nb_label"]')
        .show();
}

function hide_checks_nb() {
    $('#coop_validation_form').find('[name="checks_nb"]')
        .hide();
    $('#coop_validation_form').find('[name="checks_nb"]')
        .val(0);
    $('#coop_validation_form').find('[id="checks_nb_label"]')
        .hide();
}

function open_shift_choice() {
    schoice_view.show();
    coop_page.hide();
    retrieve_and_draw_shift_tempates();
}

function display_current_coop_form() {
    let form = $('#coop_validation_form'),
        chgt_shift_btn = $('#change_shift_template');
    var ftop_shift = $('#choosen_shift [name="ftop"]'),
        m_barcode = form.find('[name="m_barcode"]'),
        sex = $('#sex');
    let street2_input = form.find('[name="street2"]'),
        phone_input = form.find('[name="phone"]');

    chgt_shift_btn.hide();
    chgt_shift_btn.off('click', open_shift_choice);
    form.find('[name="firstname"]').val(current_coop.firstname);
    form.find('[name="lastname"]').val(current_coop.lastname);

    if (m_barcode.length > 0 && typeof current_coop.m_barcode != "undefined") {
        m_barcode.val(current_coop.m_barcode);
    }
    if (sex.length > 0 && typeof current_coop.sex != "undefined") {
        $('input[name="sex"][value="' + current_coop.sex + '"]').prop('checked', true);
    }
    // form.find('[name="barcode_base"]').val(current_coop.barcode_base);
    form.find('[name="email"]').val(current_coop._id);
    if (current_coop.shift_template &&
      current_coop.shift_template.data.type == 2) {
        $('#choosen_shift input').hide();
        ftop_shift.val('Volant');
        ftop_shift.show();

    } else {
    // Bien laisser dans cet ordre
        $('#choosen_shift input').show();
        ftop_shift.hide();

    }

    form.find('[name="birthdate"]').val(current_coop.birthdate || '');
    form.find('[name="address"]').val(current_coop.address || '');
    form.find('[name="city"]').val(current_coop.city || '');
    form.find('[name="zip"]').val(current_coop.zip || '');
    form.find('[name="country"]').val(current_coop.country || 'France');
    form.find('[name="mobile"]').val(current_coop.mobile || '');
    form.find('[name="shares_nb"]').val(current_coop.shares_nb || '');
    form.find('[name="shares_euros"]').val(current_coop.shares_euros || '');
    form.find('[name="payment_meaning"]').val(current_coop.payment_meaning || '');
    form.find('[name="checks_nb"]').val(current_coop.checks_nb || 0);
    if (street2_input.length > 0) {
        street2_input.val(current_coop.street2 || '');
    }
    if (phone_input.length > 0) {
        phone_input.val(current_coop.phone || '');
    }
    // Checks
    form.find('[name="checks_nb"]').hide();
    form.find('[id="checks_nb_label"]').hide();
    $('#checks').hide();
    var check_details = $('#checks').find('.check_details');

    $(check_details).html('');
    // Display checks number if paid by checks
    if (current_coop.payment_meaning == "ch") {
        show_checks_nb();

        // Display check details if in payment validation step and more than 1 check
        if (current_coop.validation_state == "waiting_validation_employee" && current_coop.checks_nb > 1) {
            $('#checks').show();

            for (var i = 1; i <= current_coop.checks_nb; i++) {
                $(check_details).append('<p>Chèque #' + i +' : <input type="text" name="check_' + i + '" class="b_green check_item" required/> € </p>');
            }
        }
    }

    var show_change_shift = false;

    if (current_coop.shift_template) {
        var st = current_coop.shift_template.data;

        form.find('[name="week"]').val(weeks_name[st.week]);
        form.find('[name="day"]').val(st.day);
        form.find('[name="hour"]').val(st.begin);
        var place = st.place;

        if (place == mag_place_string) {
            place = 'Magasin';
        } else if (place == office_place_string) {
            place = 'Bureau';
        }
        form.find('[name="place"]').val(place);
        if (current_coop.coop_msg) {
            show_change_shift = true;
        }
    } else {
        show_change_shift = true;
    }

    if (show_change_shift == true) {
        chgt_shift_btn.show();
        chgt_shift_btn.on('click', open_shift_choice);
    }

    if (typeof(coop_page) != "undefined") {
        coop_page.show();
    }

}

$('#payment_meaning').change(function() {
    if ($(this).val() == 'ch') {
        show_checks_nb();
    } else {
        hide_checks_nb();
    }
});
