from outils.common_imports import *
from outils.for_view_imports import *

from .models import Shelf, Shelfs
from inventory.models import CagetteInventory

from datetime import date
from datetime import datetime



def index(request):
    """Main shelf page"""
    shelfs = Shelfs.get_all()
    # TODO : Make the distinction beetween active and inactive products
    for s in shelfs:
        s['shelf_value'] = -1

    context = {'title': 'Rayons',
               'shelfs': json.dumps(shelfs)}
    template = loader.get_template('shelfs/index.html')

    return HttpResponse(template.render(context, request))

def sales(request):
    """Main sales view"""
    shelfs = Shelfs.get_all()
    context = {'title': 'Rayons (Ventes)',
               'shelfs': json.dumps(shelfs),
               'SHELFS_SCRIPT': 'shelfs_sales'}
    template = loader.get_template('shelfs/index.html')
    return HttpResponse(template.render(context, request))


def shelf_view(request, id):
    """Page for shelf inventory"""
    shelf_products = Shelf(id).get_products()

    context = {'title': 'Vue du rayon',
               'shelf_products': json.dumps(shelf_products['data'])}
    template = loader.get_template('shelfs/shelf_view.html')

    return HttpResponse(template.render(context, request))

def shelf_inventory(request, id):
    """Page for shelf inventory"""
    shelf_products = Shelf(id).get_products()

    context = {'title': 'Inventaire du rayon',
               'products': json.dumps(shelf_products['data'])}
    template = loader.get_template('shelfs/shelf_inventory.html')

    return HttpResponse(template.render(context, request))

def shelf_data(request, shelf_id):
    """Get a shelf data"""
    shelf = Shelf(shelf_id).get()

    if 'error' in shelf:
        return JsonResponse(shelf, status=500)
    else:
        return JsonResponse({'res': shelf})

def set_begin_inventory_datetime(request, shelf_id):
    """ Set the ongoing inventory start datetime. Set it to now. """
    res = Shelf(shelf_id).set_begin_inventory_datetime()

    if 'error' in res:
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({'res': res})


def all(request, precision):
    """Get all shelves data"""
    return JsonResponse({'res': Shelfs.get_all(precision)})

def get_shelves_extra_data(request):
    """Get data that need calculation, so long execution time"""
    shelfs = Shelfs.get_all()
    res = []

    for s in shelfs :
        shelf_products = Shelf(s['id']).get_products()['data']

        shelf_value = 0
        for p in shelf_products :
            shelf_value += float(p['qty_available']) * float(p['standard_price'])

        res.append({
            'id': s['id'],
            'shelf_value': round(shelf_value, 2)
        })

    return JsonResponse({'res': res})

def products(request, shelf_id):
    """Get all products from a shelf"""
    res = {}
    try:
        res = Shelf(shelf_id).get_products()
    except Exception as e:
        res['error'] = str(e)
    return JsonResponse({'res': res})

def add_product(request, shelf_id):
    """Add a product to a shelf"""
    res = {}

    params = json.loads(request.body.decode())
    barcodes = [params['barcode']]
    res = Shelf(shelf_id).add_products_by_barcodes(barcodes)

    if 'error' in res or 'msg' in res:
        return JsonResponse({'res': res}, status=500)

    return JsonResponse({'res': res})

def inventory_process_state(request, shelf_id):
    res = {}
    try:
        s = Shelf(shelf_id)
        s_data = s.get()
        res['state'] = s_data['inventory_status']
    except Exception as e:
        res['error'] = str(e)
        coop_logger.error("Inventory process state : %s", str(e))
    if 'error' in res:
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({'res': res})

def change_products_shelfs(request):
    res = {}
    try:
        data = json.loads(request.body.decode())
        res = Shelfs.make_products_shelf_links(data)
    except Exception as e:
        res['error'] = str(e)
        coop_logger.error("change_products_shelfs : %s", str(e))
    if 'error' in res:
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({'res': res})

def do_shelf_inventory(request):
    """Process shelf inventory"""
    """
    If many products are implied, the whole process could last many minutes.
    During this time, user can submit data again.
    This is managed with 'busy' message returned by Shelf.get_full_inventory_data method
    Web server can also return a timeout message during this time.
    This is managed by sending a query to above "get_process_state" (within browser ajax error capture)
    """
    res = {}
    # TODO : manage error strings array instead of one string
    try:
        shelf_data = json.loads(request.body.decode())
        m = Shelf(shelf_data['id'])

        # Set inventory data
        inventory_date = date.today()
        inventory_data = {
            'name': shelf_data['name'] + ' - ' + inventory_date.strftime("%d/%m/%Y"),
            'shelf_id': shelf_data['id'],
            'user_comments': shelf_data['user_comments'],
            'products': shelf_data['list_processed'],
            'status': shelf_data['inventory_status']
        }
        try:
            filename = 'data/inventories_backup/'
            filename += datetime.today().strftime("%Y-%m-%d--%H-%M-%S")
            filename += "__" + str(shelf_data['id']) + '.json'
            with open(filename, 'w') as outfile:
                json.dump(shelf_data, outfile)
        except Exception as serr:
            coop_logger.error("Inventory backup failure : %s", str(serr))

        try:
            if shelf_data['inventory_status'] == '':
                # First step: save first products count in temp file
                res = m.save_tmp_inventory(inventory_data)
            else:
                inventory_data['date'] = inventory_date
                inventory_data['shelf_name'] = shelf_data['name']
                inventory_data['shelf_num'] = shelf_data['sort_order']

                # Get data from step 1
                full_inventory_data = m.get_full_inventory_data(inventory_data)
                if 'error' in full_inventory_data:
                    res['error'] = full_inventory_data['error']

                    if 'busy' in full_inventory_data:
                        res['busy'] = True
                    return JsonResponse(res, status=500)

                # Proceed with inventory
                res['inventory'] = CagetteInventory.update_products_stock(full_inventory_data)
                full_inventory_data['inventory_id'] = res['inventory']['inv_id']
                shelf_data['last_inventory_id'] = res['inventory']['inv_id']

                # Save inventory report
                res['inv_report'] = m.save_inventory_report(full_inventory_data)
                shelf_data['shelf_delta'] = res['inv_report']['shelf_delta']
                shelf_data['shelf_losses'] = res['inv_report']['shelf_losses']

                # Remove temp file from step 1
                m.remove_tmp_inventory()

                try:
                    # Update products with inventory data
                    res['products_data_update'] = m.update_products_with_inventory_data(res['inv_report']['products'])
                except Exception as ee:
                    res['error'] = {'products_data_update': str(ee)}
                    coop_logger.error("products_data_update : %s, %s", res['inv_report']['products'], str(ee))

            try:
                # Update shelf inventory data
                res['shelf'] = m.update_shelf_with_inventory_data(shelf_data)
            except Exception as ee:
                res['error'] = {'shelf': str(ee)}
                coop_logger.error("Shelf inv. data : %s, %s", shelf_data, str(ee))

        except Exception as e:
            # Don't validate if error anywhere in inventory process
            res['error'] = type(e).__name__
            coop_logger.error("Shelf inv.  : %s", str(e))
    except Exception as err_json:
        res['error'] = "Unable to parse received JSON"
        received = "?"
        try:
            received = '"' + request.body.decode() + '"'
        except Exception as err_rb:
            received = str(err_rb)
        coop_logger.error("Unable to parse received JSON : %s, %s", received , err_json)

    if 'error' in res:
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({'res': res})

def get_last_inventory_report(request, shelf_id):
    import base64, os
    res = {}

    try:
        m_sh = Shelf(shelf_id)
        shelf = m_sh.get()

        if shelf['last_inventory_id'] != 0:
            m_inv = CagetteInventory(shelf['last_inventory_id'])
            file = m_inv.get_file()

            response = HttpResponse(base64.b64decode(file['datas']), content_type=file['mimetype'])
            response['Content-Disposition'] = 'attachment; filename="' + file['name'] + '"'

            return response
        else:
            res['error'] = 'Ce rayon n\'a pas encore été inventorié'
            return JsonResponse(res, status=500)
    except Exception as e:
        res['error'] = str(e)
        return JsonResponse(res, status=500)

def shelf_inventory_FAQ(request):
    """Send content of the FAQ"""
    context = {}
    template = loader.get_template('shelfs/shelf_inventory_FAQ.html')

    return HttpResponse(template.render(context, request))
