from outils.common_imports import *
from outils.for_view_imports import *


from members.models import CagetteMember
from shop.models import CagetteShop

@never_cache
def shop_index(request):
    return index(request, mode='shop')

@never_cache
def delivery_index(request):
    return index(request, mode='delivery')

def _get_index_context(credentials, shop_settings, mode):
    context = {'title': 'Commande / Réservation',
               'mode': mode,
               'COMPANY_NAME': settings.COMPANY_NAME,
               'header_img': getattr(settings, 'SHOP_HEADER_IMG', '/static/img/header.jpg')
               }
    if 'capital_message' in shop_settings:
        context['capital_message'] = shop_settings['capital_message']

    if ('failure' in credentials):
        context['msg'] = ''
        if 'msg' in credentials:
            context['msg'] = credentials['msg']
        context['password_placeholder'] = 'Mot de passe'
        context['password_notice'] = "Par défaut, la date de naissance (jjmmaaaa)"
        context['with_shop_header'] = True
    else:
        if mode == 'shop' and hasattr(settings, 'SHOP_CAN_BUY'):
            context['SHOP_CAN_BUY'] = settings.SHOP_CAN_BUY
            context['DELIVERY_CAN_BUY'] = False
        if mode == 'delivery' and hasattr(settings, 'DELIVERY_CAN_BUY'):
            context['SHOP_CAN_BUY'] = False
            context['DELIVERY_CAN_BUY'] = settings.DELIVERY_CAN_BUY

        context['SHOP_CATEGORIES'] = getattr(settings, 'SHOP_CATEGORIES', [])
        context['EXCLUDE_SHOP_CATEGORIES'] = getattr(settings, 'EXCLUDE_SHOP_CATEGORIES', [])
        context['MIN_DELAY_FOR_SLOT'] = getattr(settings, 'MIN_DELAY_FOR_SLOT', 30)
        context['HOURS_FOR_VALIDATION'] = getattr(settings, 'HOURS_FOR_VALIDATION_SHOP', 2)
        context['SHOP_OPENING'] = getattr(settings, 'SHOP_OPENING', {})
        context['SHOP_SLOT_SIZE'] = getattr(settings, 'SHOP_SLOT_SIZE', 15)
        context['SHOP_OPENING_START_DATE'] = getattr(settings, 'SHOP_OPENING_START_DATE', None)
        context['survey_link'] = getattr(settings, 'SHOP_SURVEY_LINK', '')
        context['extra_menus'] = getattr(settings, 'SHOP_EXTRA_MENUS', None)
        context['SHOW_SUBSTITUTION_OPTION'] = getattr(settings, 'SHOW_SUBSTITUTION_OPTION', False)
        context['CART_VALIDATION_BOTTOM_MSG'] = getattr(settings, 'CART_VALIDATION_BOTTOM_MSG', "")
        context['SHOP_BOTTOM_VALIDATION_MSG'] = getattr(settings, 'SHOP_BOTTOM_VALIDATION_MSG',\
                "Si vous arrivez avec un retard de plus d'une heure, la commande pourrait ne plus être disponible.")

        stock_warning = getattr(settings, 'SHOP_STOCK_WARNING', True)
        if stock_warning is True:
            context['SHOP_STOCK_WARNING'] = 'true'
        else:
            context['SHOP_STOCK_WARNING'] = 'false'

    return context


def index(request, mode="shop"):
    template = loader.get_template('shop/index.html')
    credentials = CagetteMember.get_credentials(request)
    shop_settings = CagetteShop.get_shop_settings()

    allowed_states = ["up_to_date", "alert", "delay"]
    #  Uncomment if 'coop_state' in credentials .... etc
    #  to prevent other states people to use the shop
    allowed = True

    context = _get_index_context(credentials, shop_settings, mode)

    if ('failure' in credentials):
        #  Visitor has not been identified
        template = loader.get_template('website/connect.html')
    else:
        d_p_pdts = CagetteShop.get_promoted_and_discounted_products()
        context['discounted_pdts'] = d_p_pdts['discounted']
        context['promoted_pdts'] = d_p_pdts['promoted']
        cat_nb_pdts = CagetteShop.get_categories_nb_of_products()
        if 'error' in cat_nb_pdts:
            context['cat_nb_pdts'] = None
        else:
            context['cat_nb_pdts'] = cat_nb_pdts

    # if 'coop_state' in credentials and not (credentials['coop_state'] in allowed_states):
    #     allowed = False
    #     template = loader.get_template('shop/forbidden.html')
    response = HttpResponse(template.render(context, request))

    if ((allowed is True) and 'token' in credentials and 'auth_token' in credentials):
        response.set_cookie('id', credentials['id'])
        response.set_cookie('token', credentials['token'])
        response.set_cookie('auth_token', credentials['auth_token'])
        response.set_cookie('deconnect_option', 'true')
    return response

def get_all_available_bought_products(request):
    result = {}
    credentials = CagetteMember.get_credentials(request)
    if 'success' in credentials:
        try:
            result['data'] = CagetteShop.get_all_available_bought_products_by_member(request.COOKIES['id'])
        except:
            result['error'] = 'Erreur pendant la récupération de la liste de produits'
    else:
        result['error'] = 'Authentification non valide'
    return JsonResponse({'res': result})

def get_cat_children(request):
    result = {}
    try:
        result['data'] = CagetteShop.get_cat_children(request.GET.get('id'))
    except:
        result['error'] = 'Erreur pendant la récupération de la liste de catégories'
    return JsonResponse({'res': result})

def get_categ_products(request):
    result = {}
    credentials = CagetteMember.get_credentials(request)
    if 'success' in credentials:
        try:
            result['data'] = CagetteShop.get_category_products(request.GET.get('id'))
        except:
            result['error'] = 'Erreur pendant la récupération de la liste de produits'
    else:
        result['error'] = 'Authentification non valide'
    return JsonResponse({'res': result})


def search_product(request):
    result = {}
    credentials = CagetteMember.get_credentials(request)
    if 'success' in credentials:
        try:
            kw = request.GET['kw']
            result['data'] = CagetteShop.get_products_matching(kw)
        except:
            result['error'] = 'Erreur pendant la récupération de la liste de produits'
    else:
        result['error'] = 'Authentification non valide'
    return JsonResponse({'res': result})

def cart_init(request):
    """A cart initialization is beeing submitted by a coop"""
    import json
    result = {}

    try:
        # first of all, verifiying cart is respecting time slots constraints
        cart = json.loads(request.POST.get('order'))
        # Verify for shop only, not for delivery
        ts_respect = CagetteShop.isCartRespectingTimeSlotContraints(cart) if cart['type'] == 'shop' else True
        if (ts_respect is False):
            result['ts_respect'] = False
            result['error'] = 'Forbidden timeslot'
            return JsonResponse({'res': result})
        credentials = CagetteMember.get_credentials(request)
        if 'success' in credentials:
            try:
                result['cart'] = CagetteShop.registrerCartInitialization(cart, request.COOKIES['id'])
            except Exception as e:
                result['error'] = str(e)
        else:
            result['error'] = 'Authentification non valide'
    except Exception as e:
        result['error'] = str(e)


    return JsonResponse({'res': result})

def cart(request):
    """A cart is beeing submitted by a coop"""
    import json
    result = {}

    try:
        # first of all, verifiying cart is respecting time slots constraints
        # still beeing done, in case user changed the date in browser memory
        cart = json.loads(request.POST.get('order'))
        # ts_respect = CagetteShop.isCartRespectingTimeSlotContraints(cart)
        # if (ts_respect is False):
        #     result['ts_respect'] = False
        #     result['error'] = 'Forbidden timeslot'
        #     return JsonResponse({'res': result})
        credentials = CagetteMember.get_credentials(request)
        if 'success' in credentials:
            try:
                mode = "shop"
                if 'type' in cart:
                     mode = cart['type']
                result['cart'] = CagetteShop.registrerCart(cart, request.COOKIES['id'], mode)
            except Exception as e:
                result['error'] = str(e)
        else:
            result['error'] = 'Authentification non valide'
    except Exception as e:
        result['error'] = str(e)


    return JsonResponse({'res': result})

def full_slots(request):
    """Returns full futur slots and dates when shop is closed."""
    result = {}
    #  Not critical, no matter connected or not
    try:
        result['full_slots'] = CagetteShop.get_full_slots()
        result['full_slots'].sort()

        shop_settings = CagetteShop.get_shop_settings()
        if 'closing_dates' in shop_settings:
            result['closing_dates'] = shop_settings['closing_dates']

    except Exception as e:
        result['error'] = str(e)
    return JsonResponse({'res': result})

def my_orders(request):
    result = {}
    credentials = CagetteMember.get_credentials(request)
    if 'success' in credentials:
        try:
            result['data'] = CagetteShop.get_orders_by_partner_id(request.COOKIES['id'])
        except:
            result['error'] = 'Erreur pendant la récupération de la liste des commandes'
    else:
        result['error'] = 'Authentification non valide'
    return JsonResponse({'res': result})

def change_cart_date(request, cart_id):
    """Couchdb delivery date entry will be changed."""

    """Only for connected people
    ensure that cart is connected member one is done in CagetteShop method
    """
    result = {}
    try:
        ts_respect = CagetteShop.isCartRespectingTimeSlotContraints({'best_date': request.POST.get('new_date')})
        if (ts_respect is False):
            result['ts_respect'] = False
            result['error'] = 'Forbidden timeslot'
            return JsonResponse({'res': result})
        credentials = CagetteMember.get_credentials(request)
        if 'success' in credentials:
            try:
                result = CagetteShop.change_best_date(cart_id, request)
            except:
                result['error'] = 'Erreur pendant le changement de date'
        else:
            result['error'] = 'Authentification non valide'
    except Exception as e:
        result['error'] = str(e)

    return JsonResponse({'res': result})

def delete_cart(request):
    """Couchdb entry will be deleted."""

    """Only for connected people
    ensure that cart is connected member one is done in CagetteShop method
    """
    result = {}
    credentials = CagetteMember.get_credentials(request)
    if 'success' in credentials:
        try:
            result = CagetteShop.destroy_connected_user_cart(request)
        except:
            result['error'] = 'Erreur pendant la destruction de la commande'
    else:
        result['error'] = 'Authentification non valide'
    return JsonResponse({'res': result})

def fusion_carts(request):
    """Couchdb entries will be gathered."""

    """Only for connected people
    ensure that cart is connected member one is done in CagetteShop method
    """
    result = {}
    credentials = CagetteMember.get_credentials(request)
    if 'success' in credentials:
        try:
            result = CagetteShop.fusion_carts(request)
        except:
            result['error'] = 'Erreur pendant la fusion des commandes'
    else:
        result['error'] = 'Authentification non valide'
    return JsonResponse({'res': result})

def planning(request):
    template = loader.get_template('shop/planning.html')
    context = {'title': 'Planning Commande / Réservation',
               'COMPANY_NAME': settings.COMPANY_NAME,
               'slots': CagetteShop.get_slots()}
    return HttpResponse(template.render(context, request))

@csrf_exempt
def log_browser_error(request):
    try:
        from pytz import timezone
        paris_tz = pytz.timezone('Europe/Paris')
        file = open('shop/errors.log', 'a')

        line = [str(datetime.datetime.now(tz=paris_tz)),
                request.META.get('HTTP_USER_AGENT', ''),
                request.POST.get('error')]
        file.write("\t".join(line) + "\n")
        file.close()
    except Exception as e:
        coop_logger.warning("Shop, log_browser_error : %s", str(e))

    return HttpResponse('ok')

def remove_unused_orders(request):
    """Unsed orders (in init state) will be deleted."""
    """called from a cron job"""
    res = {}
    try:
        res['deleted'] = CagetteShop.remove_unused_orders()
    except Exception as e:
        res['error'] = str(e)
    return JsonResponse(res)
