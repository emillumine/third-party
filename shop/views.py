from outils.common_imports import *
from outils.for_view_imports import *


from members.models import CagetteMember
from shop.models import CagetteShop


@never_cache
def index(request):
    template = loader.get_template('shop/index.html')
    credentials = CagetteMember.get_credentials(request)
    shop_settings = CagetteShop.get_shop_settings()
    context = {'title': 'Commande / Réservation',
               'COMPANY_NAME': settings.COMPANY_NAME,
               'SHOP_CATEGORIES': settings.SHOP_CATEGORIES,
               'EXCLUDE_SHOP_CATEGORIES': settings.EXCLUDE_SHOP_CATEGORIES,
               'MIN_DELAY_FOR_SLOT': settings.MIN_DELAY_FOR_SLOT,
               'HOURS_FOR_VALIDATION': settings.HOURS_FOR_VALIDATION_SHOP}
    if 'capital_message' in shop_settings:
        context['capital_message'] = shop_settings['capital_message']
    allowed_states = ["up_to_date", "alert", "delay"]
    #  Uncomment if 'coop_state' in credentials .... etc
    #  to prevent other states people to use the shop
    allowed = True
    if ('failure' in credentials):
        #  Visitor has not been identified
        template = loader.get_template('website/connect.html')
        context['msg'] = ''
        if 'msg' in credentials:
            context['msg'] = credentials['msg']
        context['password_placeholder'] = 'Mot de passe'
        context['password_notice'] = "Par défaut, la date de naissance (jjmmaaaa)"
        context['with_shop_header'] = True

        try:
            context['header_img'] = settings.SHOP_HEADER_IMG
        except:
            context['header_img'] = '/static/img/header.jpg'
    else:
        if hasattr(settings, 'SHOP_OPENING'):
            context['SHOP_OPENING'] = settings.SHOP_OPENING
        if hasattr(settings, 'SHOP_SLOT_SIZE'):
            context['SHOP_SLOT_SIZE'] = settings.SHOP_SLOT_SIZE
        if hasattr(settings, 'SHOP_OPENING_START_DATE'):
            context['SHOP_OPENING_START_DATE'] = settings.SHOP_OPENING_START_DATE
        if hasattr(settings, 'SHOP_CAN_BUY'):
            context['SHOP_CAN_BUY'] = settings.SHOP_CAN_BUY

        d_p_pdts = CagetteShop.get_promoted_and_discounted_products()
        context['discounted_pdts'] = d_p_pdts['discounted']
        context['promoted_pdts'] = d_p_pdts['promoted']
        context['survey_link'] = ''

        if hasattr(settings, 'SHOP_EXTRA_MENUS'):
            context['extra_menus'] = settings.SHOP_EXTRA_MENUS
        if hasattr(settings, 'SHOP_SURVEY_LINK'):
            context['survey_link'] = settings.SHOP_SURVEY_LINK

        context['SHOW_SUBSTITUTION_OPTION'] = True
        if hasattr(settings, 'SHOW_SUBSTITUTION_OPTION'):
            if settings.SHOW_SUBSTITUTION_OPTION is False:
                del context['SHOW_SUBSTITUTION_OPTION']
        if hasattr(settings, 'CART_VALIDATION_BOTTOM_MSG'):
            context['CART_VALIDATION_BOTTOM_MSG'] = settings.CART_VALIDATION_BOTTOM_MSG

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
        ts_respect = CagetteShop.isCartRespectingTimeSlotContraints(cart)
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
                result['cart'] = CagetteShop.registrerCart(cart, request.COOKIES['id'])
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