if (coop_is_connected()) {

    $(document).ready(function() {
    // global var et const
        let search_input = $('[name="search_string"]'),
            search_res = $('#search_results'),
            list = $('#list .content'),
            working_area = $('#working_area'),
            env_template = $('#templates [data-type="envelops"]');

        // PouchDB sync actions listeners
        sync.on('change', function (info) {
            // handle change



        }).on('paused', function (err) {
        // replication paused (e.g. replication up to date, user went offline)
            if (err) {
                online = false;
            }


        })
            .on('active', function () {
            // replicate resumed (e.g. new changes replicating, user went back online)
            //update_completed_count();
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
        var get_member_according_click = function(clicked_elt) {
            var member = null;
            let list_elt = list.find('[data-id="' + clicked_elt.attr('data-id') + '"]');

            if (list_elt.length > 0) {
                try {
                    member = JSON.parse(list_elt.attr('data-jss'));
                } catch (e) {
                    console.log(e);
                }

            }

            return member;
        };
        var update_member_data = function(data, callback) {
            dbc.put(data, function(err, result) {
                if (!err) {
                    if (callback) callback(result.rev);
                } else {
                    console.log(err);
                    if (err.name == 'conflict') {
                        if (callback) callback(false);
                        alert('Données en conflit avec autre version');
                    }
                }
            });
        };
        var page_cleaning = function() {
        //make sure all listners to be kicked off
            $('.del').off('click');
            $('.cb').off('click');
            $('.cbb').off('click');
            $('.genenv').off('click');
            $('.sres').off('click');
            working_area.hide();
            list.empty();
            search_res.empty();
            retrieve_all_members();
            search_input.val('');
        };

        var del_member_from_list = function() {
            let clicked = $(this);

            if (is_time_to('del', 1000)) {
                openModal(
                    "L'opération est irréversible, êtes-vous sûr de vouloir le supprimer ?",
                    function() {
                        try {
                        //Call django method (instead of pouchdb call)
                            post_form(
                                '/members/remove_member_from_mess_list',
                                {id: clicked.attr('data-id')},
                                function(err, result) {
                                    if (!err) {
                                        if (typeof(result.msg) != "undefined") {
                                            alert(result.msg);
                                        } else if (result.action === null) {
                                            display_msg_box('Données supprimées.');
                                            closeModal();
                                            page_cleaning();
                                        }
                                    }
                                }
                            );
                        } catch (e) {
                            console.log(e);
                        }
                    },
                    'oui'
                );

            }
        };

        var adapt_env_form_according_type = function() {
            let changed = $(this),
                checked = changed.prop('checked'),
                value = changed.val(),
                target_cont = $('.mconfirm').find('.content');

            if (checked == true && value == 'ch') {
                target_cont.show();
            } else {
                target_cont.hide();
            }
        };

        var adapt_env_form_according_checks_nb = function() {
            let changed = $(this),
                nb = changed.val(),
                target_cont = $('.mconfirm').find('.content_details');

            target_cont.empty();
            for (var i=0; i<nb; i++) {
                var p = $('<p>').text('#' + (i+1)+' ');

                $('<input>').attr('name', 'checks[]')
                    .attr('type', 'numeric')
                    .appendTo(p);
                p.appendTo(target_cont);
            }
        };
        var generate_envelops = function() {
            let clicked = $(this),
                mdata = get_member_according_click(clicked);

            if (mdata != null && is_time_to('generate_envelops')) {
                var form_tempate = env_template.clone();
                //Doesnt work ! (despite all is well defined....)

                form_tempate.find('[name="shares_euros"]').val(mdata.doc.data.amount_subscription);
                openModal(
                    form_tempate.html(),
                    function() {
                        //TODO form data coherence
                        let form = $('.mconfirm form');

                        form.find('[name="partner_id"]').val(mdata.doc.data.id);
                        form.find('[name="partner_name"]').val(mdata.doc.data.name);
                        post_form(
                            '/members/create_envelops', new FormData(form.get(0)),
                            function(err, rData) {
                                //{"result": [[true, "ch_1598556858.58975", "3-02ad21f3d8169a8e947cba3ae1b3dbec"]]}
                                if (!err) {
                                    if (typeof rData.result != "undefined") {
                                        if (rData.result.length > 0) {
                                            let res = rData.result;

                                            try {
                                                if (res[0][0] == true) {
                                                    clicked.text('Enveloppe(s) générée(s)').removeClass('btn--primary');
                                                    clicked.off("click");
                                                    mdata.doc.data.envelops = true;
                                                    update_member_data(mdata.doc, function(new_rev) {
                                                        if (new_rev) {
                                                            mdata.doc._rev = new_rev;
                                                            list.find('[data-id="' + clicked.attr('data-id') + '"]')
                                                                .attr('data-jss', JSON.stringify(mdata));
                                                        }

                                                    });
                                                    closeModal();
                                                }
                                            } catch (e1) {
                                                alert(JSON.stringify(e1));
                                            }
                                        }

                                    } else {
                                        alert(JSON.stringify(rData));
                                    }

                                } else {
                                    alert(JSON.stringify(err));
                                }

                            }
                        );

                    },
                    'Enregistrer'
                );
                //but works here (see above)
                $('.mconfirm').find('[name="shares_euros"]')
                    .val(mdata.doc.data.amount_subscription);
            }
        };

        var generate_base_and_barcode = function() {
            let clicked = $(this);

            if (is_time_to('generate_base_barcode')) {
                $.ajax('/members/generate_base_and_barcode/'+ clicked.attr('data-oid'))
                    .done(function(rData) {
                        if (typeof rData.done != "undefined" && rData.done == true) {
                            clicked.text('Numéro et Code-barre générés').removeClass('btn--primary');
                            clicked.off("click");
                            let mdata = get_member_according_click(clicked);

                            if (mdata != null) {
                                mdata.doc.data.barcode_base = 1;
                                mdata.doc.data.barcode = true;
                                update_member_data(mdata.doc, function(new_rev) {
                                    if (new_rev) {
                                        mdata.doc._rev = new_rev;
                                        list.find('[data-id="' + clicked.attr('data-id') + '"]')
                                            .attr('data-jss', JSON.stringify(mdata));
                                    }

                                });
                            }
                        }
                    });
            }
        };
        var generate_barcode = function() {
            let clicked = $(this);

            if (is_time_to('generate_barcode')) {
                $.ajax('/members/generate_barcode/'+ clicked.attr('data-oid'))
                    .done(function(rData) {
                        if (typeof rData.done != "undefined" && rData.done == true) {
                            clicked.text('Code-barre généré').removeClass('btn--primary');
                            clicked.off("click");
                            let mdata = get_member_according_click(clicked);

                            if (mdata != null) {
                                mdata.doc.data.barcode = true;
                                update_member_data(mdata.doc, function(new_rev) {
                                    if (new_rev) {
                                        mdata.doc._rev = new_rev;
                                        list.find('[data-id="' + clicked.attr('data-id') + '"]')
                                            .attr('data-jss', JSON.stringify(mdata));
                                    }

                                });
                            }
                        }
                    });
            }
        };

        var display_possible_actions = function() {
            let clicked = $(this),
                data = JSON.parse(clicked.attr('data-jss')),
                wc = working_area.find('.content');

            $('.del').off('click');
            $('.cb').off('click');
            $('.cbb').off('click');
            $('.genenv').off('click');
            wc.empty();
            $('<p>').html("<strong>" + data.doc.data.name + "</strong> (" + data.doc.data.email + ")")
                .appendTo(wc);
            $('<p>').text("Enregistrement Odoo : " + data.doc.data.create_date)
                .appendTo(wc);
            if (data.doc.data.active_tmpl_reg_line_count == 0) {
                $('<p>').text("Il n'y a pas de créneau enregistré.")
                    .appendTo(wc);
            }

            if (data.doc.data.envelops == false) {
                if (data.doc.data.total_partner_owned_share > 0) {
                    $('<p>').html("<strong>" + data.doc.data.amount_subscription+ "</strong> € de souscription")
                        .appendTo(wc);
                    $('<p>').text("Il n'y a pas d'enveloppe à ce nom.")
                        .appendTo(wc);
                    $('<button>').attr('data-oid', data.doc.data.id)
                        .attr('data-id', data.id)
                        .addClass('btn btn--primary genenv')
                        .text('Générer les enveloppes')
                        .appendTo(wc);
                } else {
                    $('<p>').text("Il n'y a pas de capital souscrit")
                        .appendTo(wc);
                }

            }

            if (data.doc.data.barcode_base == false) {
                $('<button>').attr('data-oid', data.doc.data.id)
                    .attr('data-id', data.id)
                    .addClass('btn btn--primary cbb')
                    .text('Générer le numéro de coop.')
                    .appendTo(wc);
            }
            if (data.doc.data.barcode == false && data.doc.data.barcode_base != false) {
                $('<button>').attr('data-oid', data.doc.data.id)
                    .attr('data-id', data.id)
                    .addClass('btn btn--primary cb')
                    .text('Générer le code-barre')
                    .appendTo(wc);
            }
            $('<button>').attr('data-id', data.id)
                .addClass('btn btn--danger del')
                .text('Supprimer de la liste')
                .appendTo(wc);
            /*
       $('<p>').text(JSON.stringify(data.doc.data))
          .appendTo(wc)
        */
            $('.del').click(del_member_from_list);
            $('.cb').click(generate_barcode);
            $('.cbb').click(generate_base_and_barcode);
            $('.genenv').click(generate_envelops);
            working_area.show();
        };
        var add_res_to_list = function(jss) {
            console.log(jss);
            let data = JSON.parse(jss),
                dsha1 = sha1(jss),
                member = {_id: dsha1, data: data, hash: dsha1 };

            dbc.put(member, function callback(err, result) {
                if (!err) {
                    closeModal();
                    page_cleaning();
                } else {
                    console.log(err);
                }
            });
        };

        var ask_for_add_to_list = function() {
            let clicked = $(this),
                msg = 'On ajoute ' + clicked.text() + ' à la liste ?';

            openModal(
                msg,
                function() {
                    add_res_to_list(clicked.attr('data-jss'));
                },
                'oui'
            );
        };
        var display_found_members_for_selection = function (members) {
            $.each(members, function(i, e) {
                try {
                    var item = $('<div>').attr('data-jss', JSON.stringify(e))
                        .addClass('sres')
                        .text(e.name + ' (' + e.email + ')');

                    item.appendTo(search_res);

                } catch (err) {
                    console.log(err);
                }
            });
            $('.sres').click(ask_for_add_to_list);
        };
        var raw_search_member = function() {
            if (is_time_to('search')) {
                let needle = search_input.val().trim();

                if (needle.length > 0) {
                    $.ajax('/members/raw_search?needle='+needle)
                        .done(function(rData) {
                            $('.sres').off('click');
                            search_res.empty();
                            if (typeof rData.members != "undefined" && rData.members.length > 0) {
                                display_found_members_for_selection(rData.members);
                            }
                        });
                }
            }

        };

        async function retrieve_all_members() {
            let response = await fetch('/members/problematic_members');
            let problematic_members = await response.json();

            dbc.allDocs({include_docs: true, descending: true}, function(err, resp) {
                if (err) {
                    return console.log(err);
                }
                $.each(resp.rows, function(i, e) {
                    var item = $('<div>').attr('data-jss', JSON.stringify(e))
                        .attr('data-id', e.id)
                        .addClass('known')
                        .addClass('item')
                        .text(e.doc.data.name + ' (' + e.doc.data.email +')');

                    item.appendTo(list);

                });
                $('.item').click(display_possible_actions);

                // dispatch_coops_in_boxes();
            });

            console.log(problematic_members);
        }
        retrieve_all_members();
        $('button.search').click(raw_search_member);
        $(document).on('change', '[name="payment_meaning"]', adapt_env_form_according_type);
        $(document).on('change', '[name="checks_nb"]', adapt_env_form_according_checks_nb);

    });
}
