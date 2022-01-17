var param_template = $('#templates #param'),
    submit_btn = $('#templates .submit_button'),
    main_content = $('#main_content'),
    msettings = [];

function save_module_settings() {
    var form_elts = $('.input-container'),
        data = {};

    form_elts.each(function(i, elt){
        console.log(elt)
        const label = $(elt).closest('.param').find('label'),
            key = label.attr('for');

        if (key.length > 0 && key != 'iname') {
            let value = "";
            data[key] = msettings[key];

            if ($(elt).hasClass('ql-container')) {

                value = $(elt).find('.ql-editor').html().replace('<p><br></p>','')
            } else {

                value = $(elt).find('input').val();
            }
            data[key].value = value;
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
function get_sorted_keys(obj) {
    var keys = Object.keys(obj);
    return keys.sort(function(a,b){return obj[a].sort_order-obj[b].sort_order});
}
function get_module_settings() {
    $.ajax('settings')
        .done(function(rData) {
            try {
                if (typeof rData.res.settings != "undefined") {
                    msettings = rData.res.settings;
                    var added_elts = [],
                        quill_containers = [];

                    get_sorted_keys(msettings).forEach(function(key){
                        var param = $(param_template.clone().html());
                        // param html include textarea and input : one of them will be removed
                        var input = null;
                        let data = msettings[key];
                            
                        // Fill the label content
                        param.find('label').text(data.title)
                                           .attr('for', key)
                        if (data.type == 'textarea') {
                            param.find('input').remove();
                            // create an accordean button with label content as "text"
                            let accordeon_btn = $('<button>').attr('type', 'button')
                                                             .addClass('accordion')
                                                             .html(param.find('label').remove())
                            param.prepend(accordeon_btn);
                            input = param.find('textarea');
                            input.attr('name', key).text(data.value);
                            // create a div wrapper and put textarea in it
                            let content_div = $('<div>').attr('id', 'quill-' + key)
                                                        .css('height', '375px')
                                                        .html(input.remove())
                            param.find('.input-container').addClass('panel')
                                                          .addClass('ql-container')
                                                          .append(content_div);


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
                            if (typeof data.class != "undefined") input.addClass(data.class);
                        }

                        /*
                    console.log(key)
                    console.log(data)
                    console.log(param)
                    */
                        param.appendTo(main_content);
                       
                        
                        added_elts.push(key);
                    })
                    if (added_elts.length > 0) {
                        submit_btn.prependTo(main_content);
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

