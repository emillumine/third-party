from django.shortcuts import render
from django.http import HttpResponse
from django.http import JsonResponse
from django.template import loader
from django.views.decorators.csrf import csrf_exempt
from members.models import CagetteUser
from .models import CagetteInventory
from outils.common_imports import *
import json

def home(request):
    """Page de selection de la commande suivant un fournisseurs"""
    context = {'title': 'Inventaires',
               'TOOLS_SERVER': settings.TOOLS_SERVER,
               'couchdb_server': settings.COUCHDB['url'],
               'db': settings.COUCHDB['dbs']['inventory']}
    template = loader.get_template('inventory/index.html')

    return HttpResponse(template.render(context, request))

def custom_lists(request):
    """Affichage des listes de produits à inventorier"""
    lists = CagetteInventory.get_custom_lists()

    context = {'title': 'Listes de produits à inventorier',
               'lists' : json.dumps(lists),
              }
    template = loader.get_template('inventory/custom_lists.html')

    return HttpResponse(template.render(context, request))

def delete_custom_list(request):
    """Custom list file will be removed."""
    try:
        res = CagetteInventory.remove_custom_inv_file(request.POST.get('id'))
        return JsonResponse({'success': True})
    except Exception as e:
        coop_looger.error("delete_custom_list : %s", str(e))
        return JsonResponse({'error': str(e)}, status=500)

def custom_list_inventory(request, id):
    """Inventaire d'une liste de produits"""
    products = CagetteInventory.get_custom_list_products(id)

    if 'error' in products:
        products['data'] = []

    context = {'title': 'Inventaire',
               'products' : json.dumps(products['data']),
              }

    # Reuse shelf inventory template: same process
    template = loader.get_template('shelfs/shelf_inventory.html')

    return HttpResponse(template.render(context, request))

def get_custom_list_data(request):
    id = request.GET.get('id', '')

    try:
        lists = CagetteInventory.get_custom_lists(id)
        return JsonResponse({'res': lists[0]})
    except Exception as e:
        return JsonResponse(id, status=500)

def inventory_process_state(request, list_id):
    res = {}

    try:
        res['state'] = CagetteInventory.get_custom_list_inv_status(list_id)
    except Exception as e:
        # Exception raised: no file found ; inventory is done
        res['state'] = 'done'

    return JsonResponse({'res': res})

def do_custom_list_inventory(request):
    res = {}
    data = json.loads(request.body.decode())

    inventory_data = {
        'id': data['id'],
        'name': 'Inventaire personnalisé du '+ data['datetime_created'],
        'user_comments': data['user_comments'],
        'products': data['list_processed']
    }

    try:
        if data['inventory_status'] == '' :
            # First step: update inventory file
            res = CagetteInventory.update_custom_inv_file(inventory_data)
        else:
            # Get data from step 1
            full_inventory_data = CagetteInventory.get_full_inventory_data(inventory_data)

            # Proceed with inventory
            res['inventory'] = CagetteInventory.update_products_stock(full_inventory_data)

            # remove file
            CagetteInventory.remove_custom_inv_file(inventory_data['id'])
    except Exception as e:
        res['error'] = {'inventory' : str(e)}
        coop_logger.error("Enregistrement inv. personnalisé : %s", str(e))

    if 'error' in res:
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({'res': res})

@csrf_exempt
def generate_inventory_list(request):
    """Responding to Odoo ajax call (no csrf)."""
    res = {}
    default_partners_id = []
    try:
        lines = json.loads(request.POST.get('lines'))
        ltype = request.POST.get('type')
    except Exception as e:
        try:
            # POST.get() returns None when request from django
            data = json.loads(request.body.decode())
            lines = data["lines"]
            ltype = data["type"]
            if "partners_id" in data:
                default_partners_id = data["partners_id"]
        except Exception as ee:
            res['error'] = str(ee)
            coop_looger.error("generate_inventory_list : %s", str(e))
            return JsonResponse(res, status=500)
        
    try:
        res = CagetteInventory.create_custom_inv_file(lines, ltype, default_partners_id)
    except Exception as e:
        res['error'] = str(e)
        coop_looger.error("generate_inventory_list : %s", str(e))
    if 'error' in res:
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({'res': res})

def get_credentials(request):
    """Receiving user mail + password, returns id, rights and auth token"""
    return JsonResponse(CagetteUser.get_credentials(request))

def get_product_categories(request):
    return JsonResponse(CagetteInventory.get_product_categories(), safe=False)

def create_inventory(request):
    res = {}
    if CagetteUser.are_credentials_ok(request):
        import json
        cats = json.loads(request.POST.get('cats'))
        res['products'] = CagetteInventory.get_products_from_cats(cats)
    else:
        res['msg'] = 'Forbidden'
    return JsonResponse(res)

def update_odoo_stock(request):
    res = {}
    if CagetteUser.are_credentials_ok(request):
        try:
            doc_id = request.POST.get('doc_id')
            res['action'] = CagetteInventory.update_stock_with_inventory_data(doc_id)
        except Exception as e:
            res['msg'] = str(e)
    else:
        res['msg'] = 'Forbidden'
    return JsonResponse(res)

def raz_archived_stock(request):
    res = {}
    if CagetteUser.are_credentials_ok(request):
        try:
            res['action'] = CagetteInventory.raz_archived_stock()
        except Exception as e:
            res['msg'] = str(e)
    else:
        res['msg'] = 'Forbidden'
    return JsonResponse(res)

def raz_negative_stock(request):
    res = {}
    if CagetteUser.are_credentials_ok(request):
        try:
            res['action'] = CagetteInventory.raz_negative_stock()
        except Exception as e:
            res['msg'] = str(e)
    else:
        res['msg'] = 'Forbidden'
    return JsonResponse(res)
def raz_not_saleable(request):
    res = {}
    if CagetteUser.are_credentials_ok(request):
        try:
            res['action'] = CagetteInventory.raz_not_saleable_stock()
        except Exception as e:
            res['msg'] = str(e)
    else:
        res['msg'] = 'Forbidden'
    return JsonResponse(res)

def cancel_buggy_pos_sales_waiting_transfer(request):
    res = {}

    try:
        res['action'] = CagetteInventory.cancel_buggy_pos_sales_waiting_transfer()
    except Exception as e:
        res['msg'] = str(e)

    return JsonResponse(res)

def process_pos_sales_waiting_transfer(request):
    # TODO : priority is to stop what's making error !!
    return JsonResponse(res)
