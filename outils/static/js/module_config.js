var param_template = $('#templates #param'),
    submit_btn = $('#templates #submit_button'),
    main_content = $('#main_content');

function save_module_settings() {
    var form_elts = $('.input-container'),
        data = {};

    form_elts.each(function(i, elt){
        const label = $(elt).closest('.param').find('label'),
            key = label.attr('for'),
            title = label.text();
        if (key.length > 0 && key != 'iname') {
            let value = "",
                type = "";
            
            if ($(elt).hasClass('ql-container')) {
                type = 'textarea';
                value = $(elt).find('.ql-editor').html().replace('<p><br></p>','')
            } else {
                type = 'input';
                value = $(elt).find('input').val();
            }
            data[key] = {
                           title: title,
                           type: type,
                           value: value
                        };
        }
        
        
    });
    
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
function quillify(params) {
    let quill = new Quill(params.id, {
                          modules: {
                            toolbar: [
                              [{ header: [1, 2, false] }],
                              ['bold', 'italic', 'underline'],
                              [{ 'size': ['small', false, 'large', 'huge'] }],
                              [{ 'color': [] }, { 'background': [] }],
                            ]
                          },
                          placeholder: '',
                          theme: 'snow'
                        });
    quill.root.innerHTML = params.content;

}
function get_module_settings() {
    $.ajax('settings')
        .done(function(rData) {
            try {
                if (typeof rData.res.settings != "undefined") {
                    var added_elts = [],
                        quill_containers = [];

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
                            input.closest('div').attr('id', 'quill-' + key)
                                                .css('height', '375px')

                            quill_containers.push(
                                                    {
                                                     id: '#quill-' + key, 
                                                     content: data.value
                                                    }
                                                 )
                            
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
                    quill_containers.forEach(function(params){
                        quillify(params);
                    });
                    // setTimeout(function() {
                            
                    // }, 5000);
                }
            } catch (e) {
                console.log(e);
            }

        });
}

get_module_settings();