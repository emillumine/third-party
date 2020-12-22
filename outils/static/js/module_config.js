var param_template = $('#templates #param'),
    submit_btn = $('#templates #submit_button'),
    main_content = $('#main_content');

function save_module_settings() {
    var form_data = new FormData(main_content.get(0));
    var data = {};

    for (var pair of form_data.entries()) {
        let val = pair[1],
            key = pair[0];
        let elt = main_content.find('[name="' + key +'"]');

        data[key] = {title: elt.closest('.param').find('label')
            .text(),
        type: elt.get(0).type,
        value: val};

    }
    post_form(
        'settings', {params: JSON.stringify(data)},
        function(err, result) {
            if (!err) {
                var succeeded = false;

                try {
                    if (result.res.save == true) {
                        display_msg_box('Enregistrement réussi !');
                        succeeded = true;
                    }
                } catch (e) {
                    console.log(e);
                }
                if (succeeded == false) display_msg_box('L\'enregistrement a échoué !', 'error');
            } else {
                console.log(err);
            }
        }
    );

}
function get_module_settings() {
    $.ajax('settings')
        .done(function(rData) {
            try {
                if (typeof rData.res.settings != "undefined") {
                    var added_elts = [];

                    for (let key in rData.res.settings) {
                        var param = $(param_template.clone().html());
                        var input = null;
                        let data = rData.res.settings[key];

                        param.find('label').text(data.title)
                            .attr('for', key);
                        if (data.type == 'textarea') {
                            param.find('input').remove();
                            input = param.find('textarea');
                            input.attr('name', key).text(data.value);
                        } else {
                            param.find('textarea').remove();
                            input = param.find('input');
                            input.attr('name', key).attr('value', data.value);
                        }

                        /*
                    console.log(key)
                    console.log(data)
                    console.log(param)
                    */
                        param.appendTo(main_content);
                        added_elts.push(key);
                    }
                    if (added_elts.length > 0) {
                        submit_btn.appendTo(main_content);
                    }
                    submit_btn.click(save_module_settings);
                }
            } catch (e) {
                console.log(e);
            }

        });
}

get_module_settings();