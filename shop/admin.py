from django.contrib import admin
from outils.common_imports import *
from outils.for_view_imports import *

from members.models import CagetteUser
from shop.models import CagetteShop
from outils.common import CouchDB


def index(request):
    template = loader.get_template('shop/admin.html')
    context = {'title': 'Gestion des commandes en ligne',
               'max_per_slot': CagetteShop.getMaxCartPerSlot(),
               'slot_size': CagetteShop.getSlotSize(),
               'couchdb_server': settings.COUCHDB['url'],
               'db': settings.COUCHDB['dbs']['shop']}

    response = HttpResponse(template.render(context, request))
    return response

def drafts(request):
    template = loader.get_template('shop/drafts.html')
    context = {'title': 'Commandes en création',
               'max_per_slot': CagetteShop.getMaxCartPerSlot(),
               'slot_size': CagetteShop.getSlotSize(),
               'couchdb_server': settings.COUCHDB['url'],
               'db': settings.COUCHDB['dbs']['shop']}

    response = HttpResponse(template.render(context, request))
    return response

def print_cart(request):
    from django.http import FileResponse
    from .pdf_gen import create_cart_pdf


    msg = 'No pdf generated'

    try:
        c_db = CouchDB(arg_db='shop')
        cart = c_db.getDocById(request.GET['id'])

        # return JsonResponse({"cart": cart}, safe=False)
        pdts_data = CagetteShop.get_cart_products_data(cart)
        if 'error' in pdts_data:
            pdts_data = None
        else:
            cart = CagetteShop.orderCartProducts(cart, pdts_data)
        pdf = create_cart_pdf(cart)
        return FileResponse(pdf, as_attachment=True, filename='commande.pdf')
    except Exception as e:
        msg = str(e)

    return JsonResponse({"msg": msg}, safe=False)

def delete_cart(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            result = CagetteShop.deleteCartFromCDB(request.POST.get('cart_id'))
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"
    return JsonResponse({"res": result}, safe=False)

def batch_delete_carts(request):
    result = []
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            carts_id = request.POST.getlist('carts_id[]')
            for c_i in carts_id:
                result.append(CagetteShop.deleteCartFromCDB(c_i))
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"
    return JsonResponse({"res": result}, safe=False)

def get_shop_settings(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            result['shop_settings'] = CagetteShop.get_shop_settings()
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"

    return JsonResponse({"res": result}, safe=False)

def add_shop_closing_date(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        closing_date = request.POST.get('closing_date')
        try:
            result = CagetteShop.add_shop_closing_date(closing_date)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"

    return JsonResponse({"res": result}, safe=False)

def remove_shop_closing_date(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        closing_date = request.POST.get('closing_date')
        try:
            result = CagetteShop.remove_shop_closing_date(closing_date)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"

    return JsonResponse({"res": result}, safe=False)

def save_max_orders_ps(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        nb = request.POST.get('nb')
        try:
            nb = int(nb)
            result = CagetteShop.save_max_orders_ps(nb)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"

    return JsonResponse({"res": result}, safe=False)

def save_capital_message(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        text = request.POST.get('text')
        try:
            result = CagetteShop.save_capital_message(text)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"

    return JsonResponse({"res": result}, safe=False)