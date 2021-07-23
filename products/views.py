# coding: utf-8
"""Products main page."""
from outils.common_imports import *
from outils.for_view_imports import *

from products.models import CagetteProduct
from products.models import CagetteProducts
from inventory.models import CagetteInventory
from shelfs.models import Shelfs

from outils.forms import GenericExportMonthForm
import os.path
import csv
from shutil import copyfile
from openpyxl import Workbook
from openpyxl.writer.excel import save_virtual_workbook
from datetime import date


def home(request):
    """Page de selection de produits pour récupérer des informations"""
    context = {
        'title': 'Produits'
    }
    template = loader.get_template('products/index.html')

    return HttpResponse(template.render(context, request))

def get_simple_list(request):
    res = {}
    try:
        res = CagetteProducts.get_simple_list()
    except Exception as e:
        coop_logger.error("Get products simple list : %s", str(e))
        res['error'] = str(e)
    if ('error' in res):
        return JsonResponse(res, status=500)
    else:
        return JsonResponse(res, safe=False)


def get_product_for_order_helper(request):
    res = {}
    try:
        data = json.loads(request.body.decode())
        pids = data['pids']
        stats_from = data['stats_from']
        res = CagetteProducts.get_products_for_order_helper(None, pids, stats_from)
    except Exception as e:
        coop_logger.error("get_product_for_help_order_line : %s", str(e))
        res['error'] = str(e)
    if ('error' in res):
        return JsonResponse(res, status=500)
    else:
        return JsonResponse(res, safe=False)

def get_product_data(request):
    barcode = request.GET['barcode']
    res = CagetteProduct.get_product_from_barcode(barcode)

    if not res:
        return JsonResponse({"product": res}, status=404)

    p = res[0]
    if p['shelf_id'] is not False:
        shelfs_sortorder = Shelfs.get_shelfs_sortorder([p['shelf_id'][0]])

        try:
            p['shelf_sortorder'] = shelfs_sortorder[0]['sort_order']
        except Exception as e:
            p['shelf_sortorder'] = 'X'
    else:
        p['shelf_sortorder'] = 'X'

    return JsonResponse({"product": p})

def get_products_stdprices(request):
    ids = json.loads(request.body.decode())
    res = CagetteProduct.get_products_stdprices(ids)

    if ('error' in res):
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({"res": res})


def update_product_stock(request):
    res = {}
    product_data = json.loads(request.body.decode())

    p = {
        'id': product_data['id'],
        'uom_id': product_data['uom_id'],
        'qty': product_data['qty']
    }

    inventory_data = {
        'name': product_data['name'] + ' - ' + date.today().strftime("%d/%m/%Y"),
        'products': [p]
    }

    res['inventory'] = CagetteInventory.update_stock_with_shelf_inventory_data(inventory_data)

    return JsonResponse({"res": res})

def update_product_purchase_ok(request):
    res = {}
    data = json.loads(request.body.decode())

    res = CagetteProduct.update_product_purchase_ok(data["product_tmpl_id"], data["purchase_ok"])

    if ('error' in res):
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({"res": res})

def labels_appli_csv(request, params):
    """Generate files to put in DAV directory to be retrieved by scales app."""
    withCandidate = False
    res = {}
    try:
        if (params == '/wc'):
            withCandidate = True
        with_pos_categories = getattr(settings, 'EXPORT_POS_CAT_FOR_SCALES', False)
        products = CagetteProducts.get_products_for_label_appli(withCandidate)
        if with_pos_categories is True:
            pos_categories = CagetteProducts.get_pos_categories()
        else:
            pos_categories = []

        rows = []
        for p in products:
            if (p['sale_ok'] is True):
                if ('uom_id' in p):
                    uom = p['uom_id'][1]
                else:
                    uom = 'undefined'
                barcode = p['barcode']
                if (isinstance(barcode, bool)):
                    barcode = ''
                if not (barcode.isnumeric()):
                    barcode = ''
                p_row = [p['id'], p['display_name'], barcode,
                         p['list_price'],
                         p['categ'],
                         uom,
                         p['image'].replace("\n", "")]
                if with_pos_categories is True:
                    if p['pos_categ_id']:
                        p_row.append(p['pos_categ_id'][0])
                    else:
                        p_row.append('')
                rows.append(p_row)

        header = ['id', 'nom', 'code-barre', 'prix',
                  'categorie', 'unite', 'image'
                  # 'en vente', 'sale_ok'
                  ]
        if with_pos_categories is True and len(pos_categories) > 0:
            header.append('id_categorie_pos')
            with open(settings.DAV_PATH + '/pos_categories.json', 'w') as outfile:
                json.dump(pos_categories, outfile)

        os_file = settings.DAV_PATH + '/flv.csv'
        file_copies = []

        nb = int(getattr(settings, 'FLV_CSV_NB', 1))

        for i in range(1, nb + 1):
            file_copies.append(settings.DAV_PATH + '/flv_' + str(i) + '.csv')

        if os.path.exists(os_file):
            os.remove(os_file)
        file = open(os_file, 'w')
        writer_file = csv.writer(file, delimiter=';', quoting=csv.QUOTE_ALL)

        writer_file.writerow(header)
        for row in rows:
            writer_file.writerow(row)
        file.close()
        for c in file_copies:
            copyfile(os_file, c)


    except Exception as e:
        res['error'] = str(e)
    return JsonResponse({'res': res})


def label_print(request, templ_id, price=None, ltype='shelf', nb=None):
    """Generate label formatted file for printing."""
    """
    Examples http://127.0.0.1:34001/products/label_print/6627/0.51/product/5
             http://127.0.0.1:34001/products/label_print/6627
    """

    directory = '/labels/'
    if ltype == 'product':
        directory = '/product_labels/'

    res = CagetteProduct.generate_label_for_printing(templ_id, directory, price, nb)

    return JsonResponse({'res': res})

def destocking(request):
	"""Page de selection de la commande suivant un fournisseurs"""
	context = {'title': 'Repas/pertes'}
	template = loader.get_template('products/destocking.html')
	return HttpResponse(template.render(context, request))

def get_all_available_products(request):
	return JsonResponse(CagetteProducts.get_all_available(), safe=False)

def get_all_barcodes(request):
    """Return all stored products barcodes."""
    import time
    start = int(round(time.time() * 1000))
    res = {}
    try:
        res['list'] = CagetteProducts.get_all_barcodes()
        res['keys'] = {
            'name': 0,
            'sale_ok': 1,
            'purchase_ok': 2,
            'available_in_pos': 3,
            'id': 4,
            'standard_price': 5,
            'list_price': 6,
            'uom_id': 7
        }
        rules = CagetteProducts.get_barcode_rules()

        res['patterns'] = rules['patterns']
        res['aliases'] = rules['aliases']
        res['time'] = int(round(time.time() * 1000)) - start
    except Exception as e:
        coop_logger.error("products_barcodes : %s", str(e))
        res['error'] = str(e)
    return JsonResponse({'res': res})

def barcodes_check(request):
    bc_errors = CagetteProducts.find_bc_errors()
    wb = Workbook()
    ws1 = wb.create_sheet("Anomalies code-barres", 0)
    ws1.append(['Produits', 'code-barres', 'type d\'erreur'])
    for key, pdts in bc_errors.items():
        for p in pdts:
            ws1.append([p['display_name'], p['barcode'], key])
    wb_name = 'anomalie_code_barres.xlsx'
    response = HttpResponse(content=save_virtual_workbook(wb), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename=' + wb_name
    return response

def shelf_labels(request):
    result = {'done': False}
    try:
        products =  json.loads(request.POST.get('products'))
        directory = '/labels/'
        for p in products:
            templ_id = p['product_tmpl_id']
            price = nb = ''
            if 'price' in p:
                price = p['price']
            res = CagetteProduct.generate_label_for_printing(templ_id, directory, price, nb)
    except Exception as e:
        coop_logger.error("shelf_labels : %s", str(e))
        result['error'] = str(e)
    return JsonResponse(result)

def sales(request):
    if request.method == 'GET':
        template = loader.get_template('outils/data_export.html')
        context = {'form': GenericExportMonthForm(),
                   'title': 'Export ventes'}
        response = HttpResponse(template.render(context, request))
    else:
        res = CagetteProducts.get_sales(request)
        # return JsonResponse(res, safe=False)
        context = {'res': res,
                   'title': 'Ventes du mois ' + res['month']}
        template = loader.get_template('products/sales.html')
        response = HttpResponse(template.render(context, request))
    return response
