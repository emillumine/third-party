from django.contrib import admin
from outils.common_imports import *
from outils.for_view_imports import *

from .models import Shelf, Shelfs
from members.models import CagetteUser
from inventory.models import CagetteInventory

@never_cache
def index(request):
    template = loader.get_template('shelfs/admin.html')
    context = {'title': 'Gestion des rayons',
                'ADMINS': settings.ADMIN_IDS}
    response = HttpResponse(template.render(context, request))
    return response

def create(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            result = Shelf().create(request.POST)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"
    return JsonResponse({'res': result})

def update(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            result = Shelf().update(request.POST)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"
    return JsonResponse({'res': result})

def delete(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            result = Shelf().delete(request.POST)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"
    return JsonResponse({'res': result})

def add_products(request):
    import json
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            id = int(request.POST.get('shelf_id'))
            barcodes = json.loads(request.POST.get('bc'))
            m = Shelf(id)
            result = m.add_products_by_barcodes(barcodes)

            # Update shelf last product added date 
            result["update_last_product_added_date"] = m.update_last_product_added_date()
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"
    return JsonResponse({'res': result})
