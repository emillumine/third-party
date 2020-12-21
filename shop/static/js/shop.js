var main_content = $('#main-content'),
    shop_section = $('section.shop'),
    orders_section = $('section.orders'),
    main_waiting_zone = $('#main-waiting-zone'),
    loading_img = $('#rotating_loader').clone()
        .removeAttr('id')
        .addClass('rotating_loader'),
    product_template = $('#templates .product'),
    cart_elt_template = $('#templates .cart-elt'),
    categ_menu_template = $('#templates .category-menu'),
    alim_categ = $('#alim_categ'),
    non_alim_categ = $('#non_alim_categ'),
    cart = $('#cart'),
    cart_total = $('.cart-total'),
    valid_wrapper = $('#valid-wrapper'),
    valid_cart = $('#valid-cart'),
    skw = $('#search-input'),
    bday_sel = $('select[name="bday"]'),
    bday_change_sel = $('select[name="bday-change"]'),
    current_order_bdate = $('#current_order_bdate'),
    my_orders_wrap = $('#my-orders-sumup'),
    cart_destroy_msg = $('#templates .destroy-cart-msg'),
    modify_best_date_msg = $('#templates .modify-best-date-msg'),
    current_action = null,
    slots_pack_nb = $('[name="bhour"] option').length - 1,
    dragSrcEl = null,
    forbidden_slots = [],
    closing_dates = [],
    right_column = $('#right-column'),
    visit_mode = false,
    timer = null;


/** --- UTILS --- **/
//$('.time-given-for-validation')

// Sort products div according to selected sort type
function sort_product_divs(divs_to_sort, sort_type) {
    var sorted_products = divs_to_sort.sort(function (a, b) {
        switch (sort_type) {
        case 'name_asc':
            return ($(a).find(".name")
                .text() > $(b).find(".name")
                .text()) ? 1 : -1;
        case 'name_desc':
            return ($(a).find(".name")
                .text() < $(b).find(".name")
                .text()) ? 1 : -1;
        case 'price_unit_asc':
            return parseFloat($(a).find("span.price")
                .text()) > parseFloat($(b).find("span.price")
                .text()) ? 1 : -1;
        case 'price_unit_desc':
            return parseFloat($(a).find("span.price")
                .text()) < parseFloat($(b).find("span.price")
                .text()) ? 1 : -1;
        case 'price_uom_asc':
        // For products by unit : get uom price
        // For products by kg : get unit price (which is price of kg, we need to do this because some of them don't have a uom price)
            var a_price_uom = $(a).find("span.uom_price")
                .text() == 'Unité(s)' ? parseFloat($(a).find("span.uom_price")
                    .text()) : parseFloat($(a).find("span.price")
                    .text());
            var b_price_uom = $(b).find("span.uom_price")
                .text() == 'Unité(s)' ? parseFloat($(b).find("span.uom_price")
                    .text()) : parseFloat($(b).find("span.price")
                    .text());

            return a_price_uom > b_price_uom ? 1 : -1;
        case 'price_uom_desc':
            var a_price_uom = $(a).find("span.uom_price")
                .text() == 'Unité(s)' ? parseFloat($(a).find("span.uom_price")
                    .text()) : parseFloat($(a).find("span.price")
                    .text());
            var b_price_uom = $(b).find("span.uom_price")
                .text() == 'Unité(s)' ? parseFloat($(b).find("span.uom_price")
                    .text()) : parseFloat($(b).find("span.price")
                    .text());

            return a_price_uom < b_price_uom ? 1 : -1;
        default:
            return $(a).find(".name")
                .text() > $(b).find(".name")
                .text();
        }
    });

    return sorted_products;
}

function djLogError(e) {
    try {
        $.post('/shop/log_error', {error: JSON.stringify(e)});
    } catch (e) {

    }
}

var french_date_and_time = function(dstring) {
    var formatted = dstring.trim().replace(/-/g, "/"); // replace for Safari
    //expected = YYYY-MM-DD HH:MM[:00]

    try {
        const options = {weekday: 'short', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'};

        dt = new Date(formatted);
        formatted = dt.toLocaleString('fr-FR', options);
    } catch (e) {
        //no matter
    }

    return formatted;
};
/* ----------- */

var adjustCartHeight = function() {
    var max_height = window.innerHeight - 250 - 50;

    $('#cart-wrapper').css({'max-height': max_height + 'px'});
};

var adjustSizes = function() {
    adjustCartHeight();
};

var resetProgressBar = function() {
    $('#header_step_one').removeClass('step_one_active');
    $('#header_step_two').removeClass('step_two_active');
    $('#header_step_three').removeClass('step_three_active');
};

function handleDragStart(e) {
    // Target (this) element is the source node.
    dragSrcEl = this;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);

    this.classList.add('dragElem');
}
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Necessary. Allows us to drop.
    }
    this.classList.add('over');

    e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.

    return false;
}

function handleDragLeave(e) {
    this.classList.remove('over'); // this / e.target is previous target element.
}

function handleDrop(e) {
    // this/e.target is current target element.
    if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting.
    }
    var receiver = $(this);

    if (receiver.prop('draggable') == true) {
    // Don't do anything if dropping the same column we're dragging.
        if (dragSrcEl != this) {
            var droped = $(e.dataTransfer.getData('text/html'));
            var nb = parseInt(receiver.find('td.nb').text(), 10) + parseInt(droped.find('td.nb').text(), 10);
            var amount = parseFloat(receiver.find('td.amount').text()) + parseFloat(droped.find('td.amount').text());

            receiver.find('td.nb').text(nb);
            receiver.find('td.amount').text(amount.toFixed(2));
            receiver.attr('data-addid', droped.data('id'));
            this.parentNode.removeChild(dragSrcEl);
            sendFusionCartProposition(receiver.data('id'), droped.data('id'), receiver.find('.bdate').text());
        }
        this.classList.remove('over');
    } else {
        console.log('Pas le droit');
    }



    return false;
}

function handleDragEnd(e) {
    // this/e.target is the source node.
    this.classList.remove('over');

}

function addDnDHandlers(elem) {
    elem.addEventListener('dragstart', handleDragStart, false);
    elem.addEventListener('dragover', handleDragOver, false);
    elem.addEventListener('dragleave', handleDragLeave, false);
    elem.addEventListener('drop', handleDrop, false);
    elem.addEventListener('dragend', handleDragEnd, false);

}

var releaseTimeSlotOfCurrentOrder = function() {
    var c_id = order._id;

    try {
        post_form(
            '/shop/delete_cart',
            {cart_id: c_id},
            function(err, result) {
                storeOrderForMigration();
                displayMsg("Le temps pour valider le panier s'est écoulé; le créneau a été libéré.<br/>Le contenu du panier a été sauvegardé, et vous devez maintenant réinitialiser une commande.");
                reset_home();
            }
        );
    } catch (error) {
        djLogError({ctx: "release timeslot", msg:error});
    }
};
var countdown_timer = function() {
    try {
        if (typeof order.timer_end_date != "undefined") {
            const difference = +new Date(order.timer_end_date) - +new Date();

            let remaining = "Temps écoulé";

            if (difference > 0) {
                const parts = {
                    h: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    mn: Math.floor((difference / 1000 / 60) % 60),
                    s: Math.floor((difference / 1000) % 60)
                };

                remaining = Object.keys(parts)
                    .map(part => {
                        val = parts[part];
                        if ((part == 'mn' || part == 's') && val < 10) val = '0' + val;

                        return `${val} ${part}`;
                    })
                    .join(" ");

            } else {
                releaseTimeSlotOfCurrentOrder();
            }
            document.getElementById("countdown").innerHTML = remaining;
        } else {
            //order has been stored for migration or has been stored before countdown implementation
            if (typeof order.best_date != "undefined") {
                const difference = +new Date(order.best_date.replace(/-/g, "/")) - +new Date();

                if (difference/1000/3600 < 24) releaseTimeSlotOfCurrentOrder();
            }
        }
    } catch (error) {
        djLogError({ctx: "countdown timer", msg:error});
    }
};

var launch_countdown_timer = function() {
    countdown_timer();
    if (timer) clearTimeout(timer);
    timer = setInterval(countdown_timer, 1000);
};

var getMaxTimeBeforeValidation = function() {
    var max_time = 1;

    try {
        const selected_day = $('.overlay-content [name="bday"]').val()
            .replace(/-/g, "/"); // replace for Safari
        const selected_hour = $('.overlay-content [name="bhour"]').val();

        if (selected_hour.length > 0) {
            const difference = +new Date(selected_day + ' ' + selected_hour) - +new Date(); // unit = ms
            const h_before_pickup = difference/1000/3600;
            const delta = h_before_pickup - min_delay;

            if (delta >= (hours_for_validation - 0.5)) {
                max_time = hours_for_validation;
            } else if (delta > 0.3) {
                max_time = delta;
            } else {
                max_time = 0.3;
            }
        } else {
            max_time = -1;
        }

    } catch (error) {
        djLogError({ctx: "get maxtime bf valid", msg:error});
    }

    return max_time;
};

var adaptTimeGivenForValidationMsg = function() {
    var max_time_before_validation = getMaxTimeBeforeValidation();

    if (!isNaN(max_time_before_validation) && max_time_before_validation > -1) {
        const h = Math.floor(max_time_before_validation % 24);
        var mn = Math.floor((max_time_before_validation - h) * 60);

        if (mn < 10) mn = '0' + mn;

        $('.overlay-content .time-given-for-validation').text(h + ' h '+ mn + ' mn');
        $('.overlay-content .tv-msg').show();
    } else {
        $('.overlay-content .tv-msg').hide();
    }
};

/** return javascript setted dates for time computation **/
var getStartTimeAndEndTimeForShortDay = function(short_day) {
    var periods = [];

    try {
        for (i in opening[short_day]) {
            var [
                sh,
                sm
            ] = opening[short_day][i]['start'].split(':');
            var [
                eh,
                em
            ] = opening[short_day][i]['end'].split(':');
            var s = new Date();
            var e = new Date();

            s.setHours(sh);
            s.setMinutes(sm);
            e.setHours(eh);
            e.setMinutes(em);
            periods.push({start:s, end: e});
        }
    } catch (error) {
        djLogError({ctx: "getStartTimeAndEndTimeForShortDay", msg:error});
    }

    return periods;
};
var getSlotsNumberForShorDay = function(short_day) {
    var slots_pack_nb = 0;

    try {
        var periods = getStartTimeAndEndTimeForShortDay(short_day);

        for (i in periods) {
            slots_pack_nb += (periods[i].end - periods[i].start)/1000/60/slot_size;
        }
    } catch (error) {
        djLogError({ctx: "getSlotsNumberForShorDay", msg:error});
    }

    return slots_pack_nb;
};

var generateHourOptions = function() {
    var selected_day = $('.overlay-content [name^="bday"]').val();
    var hours_sel = $('.overlay-content [name^="bhour"]');
    var options = [{val: '', text: '---> Heure'}];
    var short_day = new Intl.DateTimeFormat('fr-FR', {weekday: 'short'}).format(new Date(selected_day));
    var periods = getStartTimeAndEndTimeForShortDay(short_day);

    hours_sel.find('option').remove();

    for (i in periods) {
        var start = periods[i].start;
        var end = periods[i].start;
        var d = periods[i].start;
        var nb_slots = (periods[i].end - periods[i].start)/1000/60/slot_size;

        for (var j=0; j < nb_slots; j++) {
            if (j > 0) d = new Date(d.setMinutes(d.getMinutes() + slot_size));
            var h = d.getHours();
            var m = d.getMinutes();

            if (h < 10) h = '0' + h;
            if (m < 10) m = '0' + m;
            var hm = h + ':' + m;
            var slot = (selected_day + ' ' + hm).replace(/-/g, "/"); // replace for Safari
            var addit = true;
            const difference = (+new Date(slot) - +new Date())/1000/3600;

            if (difference < 0 || (difference > 0 && min_delay > 0 && difference < min_delay)) {
                addit = false;
            }
            forbidden_slots.forEach(function(s) {
                if (slot == s.replace(/-/g, "/")) addit = false;
            });
            if (addit == true) options.push({val: hm, text: hm});
        }

    }
    $.each(options, function(i, e) {
        hours_sel.append($('<option>').val(e.val)
            .text(e.text));
    });
};
var filterHourOptions = function() {
    var selected_day = $('.overlay-content [name^="bday"]').val();

    if (typeof opening != "undefined" && (typeof opening_start_date == "undefined" || new Date(selected_day) >= opening_start_date)) {
        generateHourOptions();
    } else { // for compatibility
        $('.overlay-content [name^="bhour"]').html($('#cart_creation_form [name^="bhour"]').html());
        var options = $('.overlay-content [name^="bhour"] option');

        options.each(function(i, o) {
            try {
                $(o).show();
                if ($(o).val().length > 1) {
                    var slot = (selected_day + ' ' + $(o).val()).replace(/-/g, "/"); // replace for Safari
                    const difference = +new Date(slot) - +new Date();

                    if (difference/1000/3600 < min_delay) {
                        $(o).hide();
                    } else {
                        forbidden_slots.forEach(function(s) {
                            if (slot == s.replace(/-/g, "/")) $(o).hide();
                        });
                    }
                    $(o).prop('selected', false);
                } else {
                    $(o).prop('selected', true); // if day has been changed
                }
            } catch (error) {
                djLogError({ctx: "filter hours options", msg:error});
            }
        });
    }
    $('.overlay-content .tv-msg').hide();

};

var is_possible_day = function(date, short_day) {
    var answer = true;

    var dsfn = 0; // day slots forbidden number

    $.each(forbidden_slots, function(i, e) {
        var dh = e.split(' ');

        if (dh.length == 2 && dh[0] == date) dsfn += 1;
    });
    if (typeof opening != "undefined") {

        if (typeof opening[short_day] != "undefined") {
            // compute slots_pack_nb value
            slots_pack_nb = getSlotsNumberForShorDay(short_day);


        } else {
            answer = false;
        }
    }
    if (dsfn == slots_pack_nb) answer = false;

    return answer;
};

var fillBDayOptions = function(select) {
    select.find('option').remove();
    select.append($('<option>').attr("value", "")
        .text("---> Jour"));
    date_options = {weekday:'long', day: 'numeric', month: 'long'};
    var opening_days = [
        'mar.',
        'mer.',
        'jeu.',
        'ven.',
        'sam.'
    ]; // default for previous code compat.

    if (typeof opening != "undefined") {
        opening_days = Object.keys(opening);
    }
    var start = new Date();
    var d = new Date();

    for (var i=0; i<10; i++) {
        if (i > 0) d = new Date(d.setDate(d.getDate() + 1));

        if (!closing_dates.includes(d.toISOString().slice(0, 10))) {
            short_day = new Intl.DateTimeFormat('fr-FR', {weekday: 'short'}).format(d);
            if (opening_days.indexOf(short_day) > -1) {
                var date_text = d.toLocaleDateString('fr-FR', date_options);
                var date = d.toISOString().slice(0, 10);
                // Adding it only if slots are left

                if (is_possible_day(date, short_day))
                    select.append($('<option>').attr("value", date)
                        .text(date_text));
            }
        }
    }
};


var getStoredOrder = function() {
    var stored = null;

    try {
        stored = JSON.parse(localStorage.getItem('currentOrder'));
    } catch (e) {
        //WARNING : In this case, make sure the user haven't got any order initialized
        //TODO : make a request to retrieve it
        alert("Votre navigateur ne permet pas de mémoriser durablement les paniers (localStorage)");
    }

    return stored;
};

var getStoredOrderForMigration = function() {
    var stored = null;

    try {
        stored = JSON.parse(localStorage.getItem('saved_order'));
    } catch (e) {
        djLogError({ctx: "get stored for mig", msg:e});
    }

    return stored;
};
var storeOrderForMigration = function() {
    try {
        var to_save = order;

        delete to_save._id;
        delete to_save._rev;
        delete to_save.timer_end_date;
        delete to_save.best_date;
        localStorage.setItem("saved_order", JSON.stringify(to_save));
        order = to_save;
        storeOrder();
    } catch (e) {
        djLogError({ctx: "store for mig", msg:e});
    }
};
var storeOrder = function() {
    try {
        localStorage.setItem("currentOrder", JSON.stringify(order));
    } catch (e) {
        djLogError({ctx: "store order", msg:e});
    }
};

var getStoredCatElts = function() {
    var stored = null;

    try {
        stored = JSON.parse(localStorage.getItem('catElts'));
    } catch (e) {
        //no matter
    }

    return stored;
};

var storeCatElts = function() {
    try {
        localStorage.setItem("catElts", JSON.stringify(category_elts));
    } catch (e) {
        djLogError({ctx: "store cat elts", msg:e});
    }
};
var putLoadingImgOn = function(target) {
    target.append(loading_img);
};
var removeLoadingImg = function() {
    $('.rotating_loader').remove();
};

var putAlimCategData = function() {
    [
        'epicerie',
        'liquide',
        'produits_frais',
        'surgeles'
    ].forEach(function(k) {
        var div = categ_menu_template.clone().attr('data-id', categories[k].id);

        div.find('.dropbtn').text(categories[k].label);
        alim_categ.append(div);
    });
};

var putNonAlimCategData = function() {
    [
        'bazar',
        'droguerie',
        'parfumerie'
    ].forEach(function(k) {
        var div = categ_menu_template.clone().attr('data-id', categories[k].id);

        div.find('.dropbtn').text(categories[k].label);
        non_alim_categ.append(div);
    });
};

var pass2step2 = function() {
    try {
        if (order.products.length > 0 && order.state == "init") {
            // a cart in process has been stored, render it
            renderStoredCart();
        }
    } catch (e) {
        djLogError({ctx: "pass2step2", msg:e});
    }
    main_waiting_zone.hide();
    $('h1').show();
    var recup = order.best_date || 'non défini';

    current_order_bdate.html("Récupération : <strong>" + french_date_and_time(recup) + "</strong>");
    if (visit_mode == true) {
        $('.product .choice').hide();
        right_column.hide();
        $('.arrow-block').css('visibility', 'hidden');

    } else {
        $('.product .choice').show();
        right_column.show();
        $('.arrow-block').css('visibility', 'visible');

    }
    orders_section.hide();
    main_content.show();
    shop_section.show();

    $('#header_step_one').addClass('step_one_active');
};

var updateCartTotal = function(products_nb, total) {

    if (products_nb == 0) {
        valid_wrapper.hide();
        cart.find('.msg').show();
        cart_total.find('span').text('');
    } else {
        cart_total.find('span').text('Total : ' + total.toFixed(2) + ' € TTC');
    }
};

var addProductToOrder = function(pdt, max_qty, callback) {
    answer = {product: pdt};

    // Insert or update pdt data
    var p_index = null;

    $.each(order.products, function(i, e) {
        if (e.id == pdt.id) p_index = i;
    });
    if (p_index !== null) {
        var p = order.products[p_index];
        var qty = p.qty + pdt.qty;

        if (pdt.unit != "U") {
            qty = parseFloat(p.qty) + parseFloat(pdt.qty);
        }
        var total = parseFloat(p.total) + parseFloat(pdt.total);

        if (qty > max_qty) {
            answer.warning = "max_qty";
        }
        order.products[p_index].qty = qty;
        order.products[p_index].total = parseFloat(total).toFixed(2);
        answer.product = order.products[p_index];
        answer.refresh = true;
    } else {
        order.products.push(pdt);
    }

    order.total += parseFloat(pdt.total);
    updateCartTotal(order.products.length, order.total);
    storeOrder();
    callback(answer);
};

var removeProductFromCart = function() {
    var cart_elt = $(this).closest('.cart-elt');
    var pid = cart_elt.data('pid');
    //console.log('On va supprimer le produit ' + pid)
    var p_index = null;

    $.each(order.products, function(i, e) {
        if (e.id == pid) {
            p_index = i;
            order.total -= parseFloat(e.total);
        }
    });
    if (p_index !== null) {
        order.products.splice(p_index, 1);
        updateCartTotal(order.products.length, order.total);
        cart_elt.remove();
        storeOrder();
    }
};
var renderProductInCart = function(elt_div, pdt) {
    elt_div.find('.name').text(pdt.name);
    elt_div.find('.qty').text(pdt.qty);
    elt_div.find('.price').text(pdt.price);
    elt_div.find('.total').text(pdt.total);
    cart.prepend(elt_div);
    elt_div.find('img').click(removeProductFromCart);
};

var addProductToCart = function() {
    var p_div = $(this).closest('.product');
    var qty = p_div.find('input[name="qty"]').val();
    var available_qty = parseFloat(p_div.find('.available_qty').text());

    cart.find('.msg').hide();
    valid_cart.show();
    valid_wrapper.show();
    try {
        if (order.state == "init") {

            if (qty > 0) {
                var msg = "";
                var too_much = "Vous avez pris plus de produit que le stock indicatif.\nVous n'aurez peut-être pas toute la quantité.";

                if (parseFloat(qty) > available_qty) {
                    msg = too_much;
                }
                var u = p_div.find('.unit').text()
                    .substring(0, 1);

                if (u == "U") {
                    qty = parseInt(qty, 10);
                } else {
                    qty = parseFloat(qty).toFixed(3);
                }

                var pdt = {id: p_div.data('pid'),
                    name: p_div.find('.name').text(),
                    qty : qty,
                    price : parseFloat(p_div.find('span.price').text()).toFixed(2),
                    unit: u
                };

                pdt.total = pdt.qty * pdt.price;
                pdt.total = parseFloat(pdt.total).toFixed(2);

                addProductToOrder(pdt, available_qty, function(answer) {
                    // console.log('réponse')
                    // console.log(answer)
                    if (typeof answer.error === "undefined") {
                        var cart_elt_div = null;

                        if (answer.refresh) {
                            cart_elt_div = cart.find('[data-pid="'+pdt.id+'"]');
                        } else {
                            cart_elt_div = cart_elt_template.clone().attr('data-pid', pdt.id);
                        }
                        if (cart_elt_div && cart_elt_div.length > 0) {
                            renderProductInCart(cart_elt_div, answer.product);
                        } else {
                            djLogError("Problème insertion de l'article dans le panier");
                        }
                    }
                    if (typeof answer.warning !== "undefined") {
                        if (answer.warning == "max_qty")
                            msg = too_much;
                    }
                });

                if (msg.length > 0) {
                    alert(msg);
                }
            }
        } else if (order.state == "validating") {
            alert("Le panier est en cours d'envoi. Impossible d'ajouter un article.");
        }
    } catch (e) {
        djLogError({ctx: "add product to cart", msg:e});
    }

};

var isChoosenSlotValid = function(slot) {
    var answer = true;
    var cause = '';

    forbidden_slots.forEach(function(e) {
        if (slot == e) {
            answer = false; cause = 'full';
        }
    });
    //Does it respect min delay ?
    var now = new Date();
    var min_date = new Date();
    var slot_date = new Date(slot.replace(/-/g, "/")); // replace for Safari

    min_date = new Date(min_date.setHours(now.getHours() + min_delay));
    if (slot_date - min_date < 0) {
        answer = false; cause = 'delay';
    }

    return {res: answer, reason: cause};
};

var showForbiddenSlots = function() {
    if (forbidden_slots.length > 0) {
        var fb_slots = $('.mconfirm .forbidden-slots');
        var ul = fb_slots.find('ul');

        ul.empty();
        forbidden_slots.forEach(function(e) {
            var li = $('<li>').text(e);

            ul.append(li);
        });
        fb_slots.show();
    }

};
var closeForbiddenList = function() {
    var fb_slots = $('.mconfirm .forbidden-slots');

    fb_slots.hide();
};


var initCart = function () {
    current_action = 'init_cart';
    var bd = $('.mconfirm select[name="bday"]').val();
    var bh = $('.mconfirm select[name="bhour"]').val();
    var no_accept_msg = $('.mconfirm .no-accept-reason');
    var allowed_slot = isChoosenSlotValid(bd + ' '+ bh);

    no_accept_msg.hide();

    if (allowed_slot.res == false || bd.length == 0 || bh.length == 0) {
        var day_zone = $('.mconfirm span.ask-day');
        var delay_msg = $('.mconfirm span.delay24h');

        day_zone.css({'border': 'none', 'background-color': 'white'});
        delay_msg.css({'background-color': 'white', 'padding': '0'});

        if (allowed_slot.res == false && allowed_slot.reason == 'full') showForbiddenSlots();
        if (allowed_slot.reason == 'delay') delay_msg.css({'padding': '2px', 'background-color': 'black'});

        no_accept_msg.show();
        setTimeout(function() {
            modal.css("width", "100%"); //modal div is closed after callback has been triggered
            if (allowed_slot == true && (bd.length == 0 || bh.length == 0))
                day_zone.css({'border':'1px solid red', 'background-color':'#fcbbf4'});
        }, 500);


    } else {
        if (is_time_to('init_cart', 15000)) { // prevent double click or browser hic up bug
            order.state = 'init';
            order.best_date = bd + " " + bh;

            make_user_wait('Enregistrement des informations de réservation...');
            post_form(
                '/shop/cart_init', {order: JSON.stringify(order)},
                function(err, result) {
                    if (!err) {
                        main_content.show();
                        if (typeof result.res.cart != "undefined" && result.res.cart.length == 2) {
                            var storedOrderFM = getStoredOrderForMigration();

                            if (storedOrderFM) {
                                order.products = storedOrderFM.products;
                                order.total = storedOrderFM.total;
                                localStorage.removeItem('saved_order');
                            }
                            order._id = result.res.cart[0];
                            if (hours_for_validation > 0) {
                                var limit = new Date();
                                const time_to_add = getMaxTimeBeforeValidation();
                                const h_to_add = Math.floor(time_to_add % 24);
                                const mn_to_add = Math.floor((time_to_add - h_to_add) * 60);

                                limit.setHours(limit.getHours() + h_to_add);
                                limit.setMinutes(limit.getMinutes() + mn_to_add);
                                order.timer_end_date = limit;
                                launch_countdown_timer();
                            }

                            storeOrder();
                            pass2step2();


                        } else {
                            order.state = 'error_on_submit';
                            message = "Problème d'enregistrement";
                            if (typeof result.res.ts_respect != "undefined") {
                                if (result.res.ts_respect == false)
                                    message += "\nLe créneau horaire choisi n'est pas correct.";
                            } else {
                                message += "\nSi cela persiste, merci de nous contacter.";
                            }
                            alert(message);
                            djLogError({ctx: "cart init ajax response 1", msg:result});

                        }
                    } else {
                        djLogError({ctx: "cart init ajax response 2", msg:err});
                    }
                }
            );
        }
    }
};



var validCart = function() {

    valid_cart.hide();
    valid_wrapper.append(loading_img);
    $('#header_step_two').addClass('step_two_active');
    order.state = 'validating';
    order.accept_substitution = $('.mconfirm input[name="accept_substitution"]').prop('checked');
    order.comment = $('textarea[name="cart_comment"]').val();
    post_form(
        '/shop/cart', {order: JSON.stringify(order)},
        function(err, result) {
            //console.log(result)
            if (!err) {
                try {
                    if (typeof result.res.cart != "undefined" && result.res.cart != null) {
                        if (typeof result.res.cart._rev != "undefined") {
                            clearCart();
                            $('#header_step_three').addClass('step_three_active');
                            reset_home();
                            main_waiting_zone.find('h2').text('Merci pour votre commande !');
                            main_waiting_zone.find('li.survey').css('display', 'block');
                            display_msg_box("Un email vient d'être envoyé avec des informations supplémentaires et le récapitulatif (il peut être dans les spams).");
                        } else {
                            result.browser_error = "Pas de ._rev pour la commande !";
                            djLogError({ctx: "Valid cart 1", msg:result});
                        }
                    } else {
                        storeOrderForMigration();
                        var msg = "Le pré-enregistrement de la commande, avec la date, n'a pas pu être retrouvé.\n";

                        msg += "Les produits du panier ont été sauvegardés.\n";
                        alert(msg);
                        reset_home();
                        djLogError({ctx: "Valid cart 2", msg:result});
                    }
                    valid_wrapper.find('.rotating_loader').remove();
                } catch (e) {
                    djLogError({ctx: "Valid cart 3", msg:result, msg2:e});
                }
            } else {
                djLogError({ctx: "Valid cart 4", msg:err});
            }
        }
    );
};

var clearCart = function() {
    order = {products: [], total: 0.00};
    storeOrder();
    cart.find('.cart-elt').remove();
    updateCartTotal(0, 0);
    valid_wrapper.find('.rotating_loader').remove();
};

var renderStoredCart = function() {
    cart.find('.cart-elt').remove();
    cart.find('.msg').hide();
    valid_wrapper.show();
    $.each(order.products, function(i, e) {
        var cart_elt_div = cart_elt_template.clone().attr('data-pid', e.id);

        renderProductInCart(cart_elt_div, e);

    });
    if (order.products.length > 0) valid_cart.show();
    updateCartTotal(order.products.length, order.total);
};


var appendProductsToGrid = function (grid, pdts, sort = true) {
    var product_divs = [];

    $.each(pdts, function (i, pdt) {
        var p_div = product_template.clone().attr('data-pid', pdt.id);
        var qty = p_div.find('input[name="qty"]');

        p_div.find('.name').text(pdt.name);
        if (pdt.image_small != false)
            p_div.find('img').attr('src', 'data:image/jpeg;base64,' + pdt.image_small);
        //p_div.find('img').remove()
        p_div.find('span.price').text(pdt.list_price);
        p_div.find('.unit').text(pdt.uom_id[1]);
        if (pdt.price_weight_net != "") {
            p_div.find('span.uom_price').text(pdt.price_weight_net + ' €');
        } else if (pdt.price_volume != "") {
            p_div.find('span.uom_price').text(pdt.price_volume + ' €');
        } else if (pdt.price_weight_net == "" && pdt.price_volume == "" && pdt.uom_id[0] == 1) {
            p_div.find('span.uom_price').text('non renseigné');
        }
        if (pdt.uom_id[0] == 1) {
            p_div.find('div.uom_price').show();
        }
        p_div.find('.available_qty').text(pdt.qty_available);
        p_div.find('.incoming_qty').text(pdt.incoming_qty);

        if (pdt.uom_id[1].indexOf('U') == 0) {
            qty.attr('oninput', "this.value=this.value.replace(/[^0-9]/g,'');");
        } else {
            qty.attr('min', 0).attr('step', 0.1);
        }
        qty.val(1);

        product_divs.push(p_div);
    });

    if (product_divs.length > 0) {
        if (sort) {
        // Sort by selected sort type and display
            var sort_type = grid.parent().find('select.products_sort option:selected')
                .val();
            var sorted_products = sort_product_divs(product_divs, sort_type);

            grid.html(sorted_products);
        } else {
            grid.html(product_divs);
        }

        grid.parent().find('div.products_sort_container')
            .show();
    }
};

var loadAllAvailableBoughtProducts = function() {
    var msg_cont = $('#content1_msg');

    putLoadingImgOn(content1);
    msg_cont.html($('#loading_bought_products_msg').html());
    try {
        $.ajax({
            url :'/shop/get_all_available_bought_products',
            dataType: 'json'
        })
            .done(function(rData) {
                removeLoadingImg();

                //console.log(rData)
                if (rData.res && rData.res.data && rData.res.data.pdts && rData.res.data.pdts.length > 0) {
                    msg_cont.remove();
                    var grid = content1.find('section');

                    appendProductsToGrid(grid, rData.res.data.pdts, false);
                } else {
                    msg_cont.html('Aucun produit trouvé');
                }
            });

    } catch (e) {
        alert('Impossible de récupérer les produits que vous avez déjà achetés');
    }
};

var appendChildrenCatToMenu = function (catdiv, children) {
    // console.log(children)
    var ul = catdiv.find('ul');

    $.each(children, function(i, e) {
        if (excluded_cat.indexOf(e.id) < 0) {
            var li = $('<li>').addClass("nav-item");
            var span = $('<span>').attr('data-id', e.id)
                .text(e.name);

            li.append(span);
            ul.append(li);
        }

    });
};

var getCategChildren = function() {
    var clicked = $(this);
    var cat_id = clicked.data('id');
    var li_nb = clicked.find('li').length;

    if (typeof category_elts[cat_id] == "undefined") {
        try {
            $.ajax({
                //url :'/shop/get_categ_products',
                url : '/shop/get_cat_children',
                data: {id: cat_id},
                dataType: 'json'
            })
                .done(function(rData) {
                    if (typeof rData.res.data != "undefined" && rData.res.data.length > 0) {
                        category_elts[cat_id] = rData.res.data;
                        storeCatElts();
                        appendChildrenCatToMenu(clicked, category_elts[cat_id]);
                    }
                });

        } catch (e) {
            //alert('Impossible de récupérer les catégories')
        }
    } else if (li_nb == 0) {
        appendChildrenCatToMenu(clicked, category_elts[cat_id]);
    }
};

var getCategProducts = function() {
    var clicked = $(this);
    var cat_id = clicked.data('id');
    var tab = clicked.closest('li.tab');
    var msg_cont = tab.find('.msg');
    var content = tab.find('.content');
    var grid = content.find('section');
    var msg = $('#loading_categ_products_msg').clone()
        .removeAttr('id');

    grid.empty();
    putLoadingImgOn(content);
    var menu_ul = tab.find('ul');

    menu_ul.hide(); /** needed to make visitor known retrival is in process **/
    msg.find('span').text(clicked.text());
    msg_cont.html(msg);
    try {
        $.ajax({
            url :'/shop/get_categ_products',
            data: {id: cat_id},
            dataType: 'json'
        })
            .done(function(rData) {
                if (typeof rData.res.data != "undefined" && typeof rData.res.data.pdts != "undefined") {
                    //console.log(rData)
                    appendProductsToGrid(grid, rData.res.data.pdts);
                } else {
                    // ? what to do
                }
                removeLoadingImg();
                msg_cont.empty();
                menu_ul.removeAttr('style'); /** Needed to enable dropdown menu again **/
            });

    } catch (e) {
        alert('Impossible de récupérer les articles de cette catégorie');
    }
};

var initPromotionTabs = function() {
    if (promoted_pdts.length > 0) {
        $('.tab.promote').css('display', 'block');
        appendProductsToGrid($('#tab-content0').find('section'), promoted_pdts);
        $('input[name="tabs"]').removeAttr('checked');
        $('#tab0').prop('checked', true);
    }
    if (discounted_pdts.length > 0) {
        $('.tab.discount').css('display', 'block');
        appendProductsToGrid($('#tab-content-1').find('section'), discounted_pdts);
    }
};

var search_product = function() {
    var kw = skw.val().trim();

    if (kw.length > 0) {
        if (is_time_to('search_product', 1000)) { // prevent double click or browser hic up bug
            var grid = content4.find('section');
            var msg_cont = content4.find('.msg');

            grid.empty();
            putLoadingImgOn(content4);
            msg_cont.show();
            try {
                $.ajax({
                    url :'/shop/search_product',
                    data: {kw: kw},
                    dataType: 'json'
                })
                    .done(function(rData) {
                        if (typeof rData.res.data != "undefined" && typeof rData.res.data.pdts != "undefined") {
                            //console.log(rData)
                            appendProductsToGrid(grid, rData.res.data.pdts);
                        } else {
                            // ? what to do
                        }
                        removeLoadingImg();
                        msg_cont.hide();
                    });

            } catch (e) {
                alert('Impossible de récupérer les articles de cette catégorie');
            }
        }
    }

    return false; //prevent page reload
};

var displaySentOrders = function() {
    var waiting_msg = orders_section.find('.waiting_msg');

    $('.arrow-block').css('visibility', 'hidden');
    $('h1').hide();

    shop_section.hide();

    main_content.show();
    orders_section.show();
    make_user_wait('Recherche de commandes envoyées....');
    my_orders_wrap.hide();
    var no_action_available_msg = orders_section.find('.no-action-available-msg');

    no_action_available_msg.hide();
    var tbody = orders_section.find('tbody');

    tbody.empty();
    try {
        $.ajax({
            url :'/shop/my_orders',
            dataType: 'json'
        })
            .done(function(rData) {
                if (typeof rData.res.error != "undefined") {
                    if (rData.res.error == "Authentification non valide") {
                        window.location.href = '/';
                    } else {
                        alert("Impossible de récupérer les données.");
                        djLogError({ctx: "get orders", msg:rData});
                    }
                } else if (typeof rData.res.data.orders != "undefined") {
                    if (rData.res.data.orders.length > 0) {
                        var eye = '<i class="fas fa-eye fl"></i>';
                        var delete_icon = '<i class="fas fa-trash fr"></i>';
                        var edit = '<i class="fas fa-edit"></i>';
                        var show_no_action_available_msg = false;

                        $.each(rData.res.data.orders, function(i, o) {
                            var bdate_content = "<span>" + o.best_date + "</span>";

                            if (o.state == "init" || o.state == "validating") bdate_content += " " + edit;
                            var actions_content = "";

                            if (o.state != "validating") show_no_action_available_msg = true;
                            if (o.submitted_time) ctime = parseInt(o.submitted_time*1000, 10);
                            else ctime = parseInt(o.init_time*1000, 10);

                            var date = format_date_to_sortable_string(new Date(ctime));
                            var tr = $('<tr>').attr('data-id', o._id)
                                .attr('data-rev', o._rev);

                            if (o.state == "validating" || o.state == "init") {
                                actions_content = delete_icon;
                                tr.prop('draggable', true);
                            }
                            var td1 = $('<td>').addClass('date create')
                                .text(date);
                            var td2 = $('<td>').addClass('date bdate')
                                .html(bdate_content);
                            var td3 = $('<td>').addClass('nb')
                                .text(o.products.length);
                            var td4 = $('<td>').addClass('amount')
                                .text(parseFloat(o.total).toFixed(2));
                            //var td5 = $('<td>').addClass('actions').html(eye + ' ' + delete_icon)
                            var td5 = $('<td>').addClass('actions')
                                .html(actions_content);

                            tr.append(td1);
                            tr.append(td2);
                            tr.append(td3);
                            tr.append(td4);
                            tr.append(td5);
                            tbody.append(tr);
                            addDnDHandlers(tr.get(0));
                        });
                        if (show_no_action_available_msg == true) no_action_available_msg.show();

                        my_orders_wrap.show();
                    } else {
                        waiting_msg.show();
                        waiting_msg.html('<h3 style="text-align:center;">Aucune commande en cours.</h3>');
                    }
                    main_waiting_zone.hide();
                }
            });

    } catch (e) {
        alert('Impossible de récupérer les commandes en cours');
    }
};

/** Couchdb stored cart action **/
//change date methods will be useless when cart modifications will be possible since cart process validation is already done
var validBDayChange = function(cart_id) {
    var bd = $('.mconfirm select[name="bday-change"]').val();
    var bh = $('.mconfirm select[name="bhour-change"]').val();
    var allowed_slot = isChoosenSlotValid(bd + ' '+ bh);

    if (allowed_slot.res == false || bd.length == 0 || bh.length == 0) {
        var day_zone = $('.mconfirm span.ask-day');
        var delay_msg = $('.mconfirm span.delay24h');

        day_zone.css({'border': 'none', 'background-color': 'white'});
        delay_msg.css({'background-color': 'white', 'padding': '0'});

        if (allowed_slot.res == false && allowed_slot.reason == 'full') showForbiddenSlots();
        if (allowed_slot.reason == 'delay') delay_msg.css({'padding': '2px', 'background-color': 'black'});
        setTimeout(function() {
            modal.css("width", "100%"); //modal div is closed after callback has been triggered
            if (allowed_slot == true && (bd.length == 0 || bh.length == 0))
                day_zone.css({'border':'1px solid red', 'background-color':'#fcbbf4'});
        }, 500);


    } else {
        if (is_time_to('change_date', 15000)) { // prevent double click or browser hic up bug
            var waiting_msg = $('<p>').append(loading_img);

            waiting_msg.append("<br/>Traitement de la demande de changement de date en cours....");
            setTimeout(function() {
                displayMsg(waiting_msg);
            }, 200); // delay needed because of closeModal called by confirm click
            post_form(
                '/shop/cart/' + cart_id + '/change_date',
                {new_date: bd + " " + bh},
                function(err, result) {
                    if (typeof result.res.changed != "undefined" && typeof result.res.changed[0] != "undefined" && result.res.changed[0].length == 3) {
                        alert("Nouvelle date enregistrée !");
                        displaySentOrders();
                    } else {

                        message = "Problème d'enregistrement";
                        if (typeof result.res.ts_respect != "undefined") {
                            if (result.res.ts_respect == false)
                                message += "\nLe créneau horaire choisi n'est pas correct.";
                        } else {
                            message += "\nSi cela persiste, merci de nous contacter.";
                        }
                        alert(message);
                    }
                    closeModal();
                }
            );
        }
    }
};
var changeBestDate = function() {
    var clicked = $(this);
    var clicked_tr = clicked.closest('tr'),
        id = clicked_tr.data('id'),
        msg = modify_best_date_msg;

    msg.find('.current-bdate').text(clicked_tr.find('.bdate span').text());
    //copy hours from cart validation and slots constraints div to this msg content
    var cart_vform = $('#cart_creation_form');

    msg.find('select[name="bhour-change"]').html(cart_vform.find('select[name="bhour"]').html());
    msg.find('.slots-constraints').html(cart_vform.find('.slots-constraints').html());
    fillBDayOptions(bday_change_sel);

    updateUnavailableSlots(function() {
        openModal(msg.html(), function() {
            validBDayChange(id);
        }, 'Enregistrer');
    });


};

var destroySentCart = function() {
    var clicked = $(this);
    var clicked_tr = clicked.closest('tr'),
        id = clicked_tr.data('id'),
        msg = cart_destroy_msg.clone();

    msg.find('.date').text(clicked_tr.find('.create').text());
    msg.find('.bdate').text(clicked_tr.find('.bdate span').text());
    openModal(
        msg.html(),
        function() {
        // Confirm button callback
            var waiting_msg = $('<p>').append(loading_img);

            waiting_msg.append("<br/>Traitement de la demande de suppression en cours....");
            setTimeout(function() {
                displayMsg(waiting_msg);
            }, 200); // delay needed because of closeModal called by confirm click
            post_form(
                '/shop/delete_cart',
                {cart_id: id},
                function(err, result) {
                    if (!err) {
                        if (typeof result.res !== "undefined" && typeof result.res.del_action !== "undefined") {
                            clicked_tr.remove();
                            // remove from browser stored data if it was the current one
                            if (order._id == id) clearCart();
                            alert("Commande détruite");
                        } else {
                            djLogError({ctx: "destroy", msg: result});
                        }

                    } else {
                        djLogError({ctx: "destroy", msg:err});
                    }
                    closeModal();
                }
            );
        },
        'Détruire'
    );

};

var sendFusionCartProposition = function(main_id, addid, date) {
    openModal(
        'Enregistrer la fusion des 2 commandes<br/>Récupération le '+ french_date_and_time(date),
        function() {
            var waiting_msg = $('<p>').append(loading_img);

            waiting_msg.append("<br/>Traitement de la demande de fusion en cours....");
            setTimeout(function() {
                displayMsg(waiting_msg);
            }, 200); // delay needed because of closeModal called by confirm click
            post_form(
                '/shop/fusion_carts',
                {id: main_id, add_id: addid},
                function(err, result) {
                    if (!err) {
                        try {
                            if (typeof result.res !== "undefined" && typeof result.res.del_action !== "undefined") {
                                alert("Commandes fusionnées");

                            } else {
                                djLogError({ctx: "fusion", msg: result});
                            }
                        } catch (e1) {
                            djLogError({ctx: "fusion", msg: e1});
                        }

                    } else {
                        djLogError({ctx: "fusion", msg:err});
                    }
                    closeModal();
                }
            );
        },
        'Envoyer',
        true,
        true,
        displaySentOrders // callback if canceled

    );
};

// Get full slots and closing dates
var updateUnavailableSlots = function(callback) {
    try {
        $.ajax({
            url :'/shop/full_slots',
            dataType: 'json'
        })
            .done(function(rData) {
                forbidden_slots = [];
                if (typeof rData.res.full_slots != "undefined" && rData.res.full_slots.length > 0) {
                    forbidden_slots = rData.res.full_slots;
                }

                closing_dates = [];
                if (typeof rData.res.closing_dates != "undefined" && rData.res.closing_dates.length > 0) {
                    closing_dates = rData.res.closing_dates;
                }

                callback();
            });

    } catch (e) {
        djLogError({ctx: "update unavailable slots", msg:e});
    }
};

var launch_init_form = function() {
    make_user_wait('Préparation du formulaire...');
    current_action = 'init_form';
    updateUnavailableSlots(function() {
        fillBDayOptions(bday_sel);
        openModal($('#cart_creation_form').html(), initCart, 'Commencer la commande');
    });
};

var ask_user_for_action = function(msg) {
    main_waiting_zone.show();
    main_waiting_zone.find('.msg').html(msg);
    main_waiting_zone.find('.loader').hide();
};

var make_user_wait = function(msg) {
    main_waiting_zone.show();
    main_waiting_zone.find('.msg').html(msg);
    main_waiting_zone.find('.loader').show();
};

var init_shop = function() {
    if (typeof order._id == "undefined") {
        if (order.products.length > 0) {
            storeOrderForMigration();
        }
        ask_user_for_action($('#templates .after-login-msg').html());

    } else {
        launch_countdown_timer();
        pass2step2();
    }


};

var reset_home = function() {
    window.scrollTo(0, 0);
    $('.arrow-block').css('visibility', 'visible');
    main_content.hide();
    main_waiting_zone.show();
    orders_section.hide();
    orders_section.find('tbody').empty();
    init_shop();
};

var justVisit = function() {
    visit_mode = true;
    pass2step2();
};

var order = getStoredOrder() || {products: [], total: 0.00};
var content1 = $('#tab-content1');
var content4 = $('#tab-content4');
var category_elts = getStoredCatElts() || {};

/** init first render **/
adjustCartHeight();
putAlimCategData();
putNonAlimCategData();
initPromotionTabs();
init_shop();

//cart_validation_form
valid_cart.click(function() {
    if (is_time_to('valid_cart', 1000)) { // prevent double click or browser hic up bug
        openModal($('#cart_validation_form').html(), validCart, 'Valider la commande');
        $('.mconfirm .pickup_date span').text(french_date_and_time(order.best_date));
    }
});


$('#get_my_bought_products').click(loadAllAvailableBoughtProducts);
$(document).on('change', '[name^="bday"]', filterHourOptions);
$(document).on('change', '[name="bhour"]', adaptTimeGivenForValidationMsg);
$(document).on('click', '#alim_categ > div, #non_alim_categ > div', getCategChildren);
$(document).on('click', '#alim_categ ul li span, #non_alim_categ ul li span', getCategProducts);
$(document).on('click', '.product button', addProductToCart);
$(document).on('click', '.forbidden-slots .fs-close', closeForbiddenList);
$(document).on('click', 'td.date .fa-edit', changeBestDate);
$(document).on('click', 'td.actions .fa-trash', destroySentCart);

$(document).on(
    'click', '.new-order',
    function() {
        visit_mode = false;
        if (typeof order._id == "undefined") {
            reset_home();
            clearCart();
            resetProgressBar();
            main_content.hide();
            launch_init_form();
        } else {
            djLogError({msg: "Une commande est déjà en cours", order:order});
            pass2step2();
        }
    }
);

$(document).on('click', '.my-orders', displaySentOrders);
$(document).on('click', '.visit', justVisit);

$('#deconnect').click(function() {
    $.ajax("/website/deconnect").done(function() {
        window.location.reload();
    });
});

$('#go_to_top').click(function() {
    window.scrollTo(0, 0);
});
$('.back-to-home').click(reset_home);

/* Listener on product sorting selector */
$("select.products_sort").change(function () {
    var clicked = $(this);
    var tab = clicked.closest('li.tab');
    var content = tab.find('.content');
    var grid = content.find('section');
    var products = grid.find('div.product');

    var sort_type = clicked.children("option:selected").val();
    var sorted_products = sort_product_divs(products, sort_type);

    grid.html(sorted_products);
});

window.onresize = adjustSizes;
$(document).on("closemodal", function() {
    if (current_action == "init_form") reset_home();

});