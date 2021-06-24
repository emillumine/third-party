from django.db import models

from outils.common import OdooAPI
from outils.common import CouchDB
from outils.common_imports import *
from decimal import *
import os
from datetime import datetime

import logging

coop_logger = logging.getLogger("coop.framework")

# Prefix for cutom list to inventory files
custom_list_file_path = 'temp/custom_inventory_lists/'

def build_tree_from_categories(elts, parent_id = False):
    branch = []
    for e in elts:
        to_compare = e['parent_id']
        if not type(to_compare) == bool:
            to_compare = to_compare[0]
        if to_compare == parent_id:
            children = build_tree_from_categories(elts, e['id'])
            if len(children) > 0:
                e['children'] = children
            branch.append(e)

    return branch

class CagetteInventory(models.Model):

    def __init__(self, id):
	    """Init with odoo id."""
	    self.id = int(id)
	    self.o_api = OdooAPI()

    @staticmethod
    def get_custom_lists(id=None):
        lists = []
        # r=root, d=directories, f = files
        for r, d, f in os.walk(custom_list_file_path):
            for file in f:
                # name of file is timestamp of creation
                if file.endswith('.json'):
                    filename = file[:-5]

                # if id is set, only get this list
                if id is None  or id is not None and id == filename:
                    file_data = {}
                    with open(os.path.join(r, file)) as json_file:
                        file_data = json.load(json_file)

                    date_time = datetime.fromtimestamp(int(filename))
                    d = date_time.strftime("%d/%m/%Y, %H:%M")

                    file_data['id'] = int(filename)
                    file_data['datetime_created'] = d
                    file_data['p_nb'] = len(file_data['products'])

                    lists.append(file_data)

        return lists

    @staticmethod
    def get_custom_list_products(list_id):
        res = {}
        file_data = {}
        with open(custom_list_file_path + list_id + '.json') as json_file:
            file_data = json.load(json_file)

        p_ids = file_data['products']

        try:
            c = [['id', 'in', p_ids]]
            f = [
                'barcode',
                'name',
                'uom_id',
                'qty_available',
                'standard_price',
                'shelf_id'
            ]
            #todo get shelf sortorder ?
            api = OdooAPI()
            pdts = api.search_read('product.product', c, f)
            for p in pdts:
                for k, v in p.items():
                    if v is False:
                        p[k] = ''

                # Get shelf sortorder
                if p['shelf_id'] is not False:
                    c = [['id', '=', p['shelf_id'][0]]]
                    f = ['id', 'sort_order']
                    res_sortorder = api.search_read('product.shelfs', c, f)

                    if res_sortorder:
                        p['shelf_sortorder'] = res_sortorder[0]['sort_order']

            res['data'] = pdts
        except Exception as e:
            res['error'] = "Erreur lors de la récupération des produits (" + str(e) + ")"

        return res

    @staticmethod
    def get_custom_list_inv_status(list_id):
        file_data = {}
        with open(custom_list_file_path + list_id + '.json') as json_file:
            file_data = json.load(json_file)

        return file_data['inventory_status']

    @staticmethod
    def create_custom_inv_file(line_ids, line_type, default_partners_id=[]):
        res = {}

        try:
            # Create directory if doesn't exist
            os.mkdir(custom_list_file_path)
        except OSError:
            pass

        try:
            # need to retrieve product_ids from order_line_ids
            api = OdooAPI()
            ids = []
            order = ['', '']
            user = ''
            partners = []
            if len(default_partners_id) > 0:
                f = ['name']
                c = [['id', 'in', default_partners_id]]
                partners_name = api.search_read('res.partner', c, f)
                for p in partners_name:
                    partners.append(p['name'])

            if line_type == 'product_templates':
                fields = ['id']
                cond = [['product_tmpl_id', 'in', line_ids]]
                model = 'product.product'

                user="api"
            else:
                fields = ['create_uid', 'product_id', 'partner_id']
                cond = [['id', 'in', line_ids]]
                if (line_type == 'cpo'):
                    model = 'computed.purchase.order.line'
                    fields += ['computed_purchase_order_id']
                else:
                    model = 'purchase.order.line'
                    fields += ['order_id']
            lines = api.search_read(model, cond, fields)
            if len(lines) == len(line_ids):
                for l in lines:
                    if line_type == 'product_templates':
                        ids.append(l['id'])
                    else:
                        ids.append(l['product_id'][0])
                        user = l['create_uid'][1]
                        if (line_type == 'cpo'):
                            order = l['computed_purchase_order_id']
                        else:
                            order = l['order_id']
                            partners.append(l['partner_id'][1])
                if (line_type == 'cpo'):
                    # partner_id isn't defined
                    f = ['partner_id']
                    c = [['id', '=', int(order[0])]]
                    cpo = api.search_read('computed.purchase.order', c, f)
                    if len(cpo) > 0:
                        partners.append(cpo[0]['partner_id'][1])
            file_data = {
                'order': order[1],
                'user': user,
                'partners': partners,
                'inventory_status': '',
                'products': ids
            }

            # Create inventory file, name is timestamp of creation
            timestamp = int(time.time())
            filename = custom_list_file_path + str(timestamp) + '.json'
            with open(filename, 'w+') as outfile:
                json.dump(file_data, outfile)

            res['file_saved'] = True
        except Exception as e:
            res['error'] = str(e)
            coop_logger.error("create_custon_inv_file : %s", str(e))
        return res

    def update_custom_inv_file(inventory_data):
        res = {}
        try:
            filename = custom_list_file_path + str(inventory_data['id']) + '.json'
            with open(filename) as json_file:
                file_data = json.load(json_file)

            file_data['products_count_s1'] = inventory_data['products']
            file_data['user_comments_s1'] = inventory_data['user_comments']
            file_data['inventory_status'] = 'step1_done'

            with open(filename, 'w') as outfile:
                json.dump(file_data, outfile)

            res['file_saved'] = True
        except Exception as e:
            res['error'] = str(e)

        return res

    def remove_custom_inv_file(id):
        filename = custom_list_file_path + str(id) + '.json'
        os.remove(filename)

        return True

    def get_full_inventory_data(inventory_data):
        filename = custom_list_file_path + str(inventory_data['id']) + '.json'
        with open(filename) as json_file:
            file_data = json.load(json_file)

        # Concatenate qties from both steps
        for p in inventory_data['products']:
            for p2 in file_data['products_count_s1']:
                if p['id'] == p2['id']:
                    qty = float(p['qty']) + float(p2['qty'])
                    p['qty'] = qty

                    break

        if 'user_comments_s1' in file_data:
            inventory_data['user_comments_step1'] = file_data['user_comments_s1']
        return inventory_data

    @staticmethod
    def get_product_categories():
        api = OdooAPI()
        tree = []

        try:
            fields = ['parent_id', 'name']
            res = api.search_read('product.category', [], fields)
            tree = build_tree_from_categories(res)
        except:
            pass
        return tree
    @staticmethod
    def get_products_quantities(cat_ids=[]):
        api = OdooAPI()
        fields = ['name', 'categ_id', 'barcode', 'uom_id',
                  'product_variant_count', 'product_tmpl_id']
        cond = [['active', '=', True], ['sale_ok', '=', True]]
        if len(cat_ids) > 0:
            cond.append(['categ_id', 'in', cat_ids])
        products = api.search_read('product.product', cond, fields, 10000)
        pids = []
        categories = {}
        barcodes = {}
        pInfos = {}
        lines = {}
        for p in products:
            pids.append(int(p['id']))
            if not (p['barcode'] is False):
                barcode = p['barcode']
            else:
                barcode = ' '
            pInfos[p['id']] = {'barcode': barcode,
                               'product_variant_count': p['product_variant_count'],
                               'product_tmpl_id': p['product_tmpl_id'][0],
                               'category': p['categ_id'][0],
                               'uom_id': p['uom_id'][0]}

        fields = ['product_id', 'qty', 'inventory_value']
        c = [['location_id.id', '=', settings.STOCK_LOC_ID],
             ['product_id', 'in', pids]]

        res = api.search_read('stock.quant', c, fields, 250000)

        for row in res:
            pid = row['product_id'][0]
            if pid in pids:
                value = round(row['inventory_value'], 2)
                line = {'id': row['product_id'][0],
                        'name': row['product_id'][1],
                        'categ_id': pInfos[pid]['category'],
                        'barcode': pInfos[pid]['barcode'],
                        'product_variant_count': pInfos[pid]['product_variant_count'],
                        'product_tmpl_id': pInfos[pid]['product_tmpl_id'],
                        'uom_id': pInfos[pid]['uom_id'],
                        'qty': row['qty'],
                        'value': value}
                if not (str(pid) in lines):
                    lines[str(pid)] = line
                else:
                    lines[str(pid)]['qty'] += line['qty']
                    lines[str(pid)]['value'] += line['value']

        return lines

    @staticmethod
    def get_products_from_cats(cats):
        lines = []
        cat_ids = []
        for c in cats:
            try:
                elts = c.split('cat_')
                cat_ids.append(int(elts[1]))
            except:
                pass
        if len(cat_ids) > 0:
            lines = CagetteInventory.get_products_quantities(cat_ids)
        return lines

    @staticmethod
    def update_stock_with_inventory_data(doc_id):
        # 6 minutes for 659 products !!!
        # 5 minutes et demi pour 2552 (ce n'est pas proportionnel)
        # duplicate key value violates unique constraint "stock_breaking_pkey"
        # DETAIL:  Key (id)=(556) already exists.\
        # CONTEXT:  SQL statement "INSERT INTO  stock_breaking (create_date, state_breaking, product_id, qty) VALUES ( now(), 1 , NEW.product_id, NEW.qty)"
        # pgSQL function follow_breaking()
        # ==> désactiver le trigger pendant l'opération
        # ALTER TABLE stock_quant DISABLE TRIGGER t_follow_breaking;
        # puis
        # ALTER TABLE stock_quant ENABLE TRIGGER t_follow_breaking;
        TWOPLACES = Decimal(10) ** -2
        c_db = CouchDB(arg_db='inventory')
        doc = c_db.getDocById(doc_id)
        api = OdooAPI()
        missed = []
        unchanged = []
        done = []
        fields = {'company_id': 1, 'name': doc['name'],
                  'location_id': settings.STOCK_LOC_ID}
        inv = api.create('stock.inventory', fields)
        if not (inv is None):
            for p in doc['products']:
                qty = Decimal(p['qty']).quantize(TWOPLACES)
                if 'shelf_qty' in p:
                    shelf_qty = stock_qty = 0
                    if len(p['shelf_qty']) > 0:
                        shelf_qty = Decimal(p['shelf_qty']).quantize(TWOPLACES)
                    if len(p['stock_qty']) > 0:
                        stock_qty = Decimal(p['stock_qty']).quantize(TWOPLACES)

                    if shelf_qty + stock_qty != qty:
                        qty = shelf_qty + stock_qty
                if qty < 0:
                    qty = 0
                try:
                    fields = {'product_id': p['id'],
                              'inventory_id': inv,
                              'product_qty': str(qty),
                              'product_uom_id': p['uom_id'],
                              'location_id': settings.STOCK_LOC_ID}
                    li = api.create('stock.inventory.line', fields)
                    done.append({'product': p, 'id': li})
                except Exception as e:
                        missed.append({'product': p, 'msg': str(e)})

            if len(missed) == 0:
                api.execute('stock.inventory', 'action_done', [inv])
                done.append('Closed inventory')

        return {'missed': missed, 'unchanged': unchanged, 'done': done}

    @staticmethod
    def update_stock_with_shelf_inventory_data(inventory_data):
        """Updates Odoo stock after a shelf inventory"""

        TWOPLACES = Decimal(10) ** -2
        api = OdooAPI()
        missed = []
        unchanged = []
        done = []
        errors = []
        fields = {'company_id': 1, 'name': inventory_data['name'],
                  'location_id': settings.STOCK_LOC_ID}
        try:
            inv = api.create('stock.inventory', fields)
            if not (inv is None):
                for p in inventory_data['products']:
                    qty = Decimal(p['qty']).quantize(TWOPLACES)

                    # If inventory from shelf and stock are separated
                    if 'shelf_qty' in p:
                        shelf_qty = stock_qty = 0
                        if len(p['shelf_qty']) > 0:
                            shelf_qty = Decimal(p['shelf_qty']).quantize(TWOPLACES)
                        if len(p['stock_qty']) > 0:
                            stock_qty = Decimal(p['stock_qty']).quantize(TWOPLACES)

                        if shelf_qty + stock_qty != qty:
                            qty = shelf_qty + stock_qty

                    if qty < 0:
                        qty = 0
                    try:
                        fields = {'product_id': p['id'],
                                  'inventory_id': inv,
                                  'product_qty': str(qty),
                                  'product_uom_id': p['uom_id'][0],
                                  'location_id': settings.STOCK_LOC_ID}
                        #  coop_logger.info("Fields %s", fields)
                        li = api.create('stock.inventory.line', fields)
                        done.append({'id': li})
                    except Exception as e:
                        missed.append({'product': p, 'msg': str(e)})

                # Set inventory as 'done' even if some products missed
                api.execute('stock.inventory', 'action_done', [inv])
                done.append('Closed inventory')
        except Exception as e:
            coop_logger.error(str(e))
            errors.append(str(e))

        return {'errors': errors,
                'missed': missed,
                'unchanged': unchanged,
                'done': done,
                'inv_id': inv}

    @staticmethod
    def raz_archived_stock():
        missed = []
        done = []
        api = OdooAPI()
        # cond = [['active', '=', False], ['qty_available', '!=', 0]]
        cond = [['active', '=', False]]
        fields = ['uom_id', 'name', 'qty_available']
        res = api.search_read('product.product', cond, fields, 100)
        if len(res) > 0:
            fields = {'company_id': 1, 'name': 'RAZ archivés',
                      'location_id': settings.STOCK_LOC_ID}
            inv = api.create('stock.inventory', fields)
            if not (inv is None):
                for p in res:
                    try:
                        fields = {'product_id': p['id'],
                                  'inventory_id': inv,
                                  'product_qty': 0,
                                  'product_uom_id': p['uom_id'][0],
                                  'location_id': settings.STOCK_LOC_ID}
                        li = api.create('stock.inventory.line', fields)
                        done.append({'product': p, 'id': li})
                    except Exception as e:
                        missed.append({'product': p, 'msg': str(e)})
                api.execute('stock.inventory', 'action_done', [inv])
        return {'missed': missed, 'done': done}

    @staticmethod
    def raz_negative_stock():
        missed = []
        done = []
        api = OdooAPI()
        # cond = [['active', '=', False], ['qty_available', '!=', 0]]
        cond = [['qty_available', '<', 0]]
        fields = ['uom_id', 'name', 'qty_available']
        res = api.search_read('product.product', cond, fields, 100)
        if len(res) > 0:
            fields = {'company_id': 1, 'name': 'RAZ stocks négatifs',
                      'location_id': settings.STOCK_LOC_ID}
            inv = api.create('stock.inventory', fields)
            if not (inv is None):
                for p in res:
                    try:
                        fields = {'product_id': p['id'],
                                  'inventory_id': inv,
                                  'product_qty': 0,
                                  'product_uom_id': p['uom_id'][0],
                                  'location_id': settings.STOCK_LOC_ID}
                        li = api.create('stock.inventory.line', fields)
                        done.append({'product': p, 'id': li})
                    except Exception as e:
                        missed.append({'product': p, 'msg': str(e)})
                api.execute('stock.inventory', 'action_done', [inv])
        return {'missed': missed, 'done': done}

    @staticmethod
    def raz_not_saleable_stock():
        missed = []
        done = []
        api = OdooAPI()
        cond = [['active', '=', True], ['sale_ok', '=', False]]
        fields = ['uom_id', 'name', 'qty_available']
        res = api.search_read('product.product', cond, fields, 100)
        if len(res) > 0:
            fields = {'company_id': 1, 'name': 'RAZ non vendables',
                      'location_id': settings.STOCK_LOC_ID}
            inv = api.create('stock.inventory', fields)
            if not (inv is None):
                for p in res:
                    try:
                        fields = {'product_id': p['id'],
                                  'inventory_id': inv,
                                  'product_qty': 0,
                                  'product_uom_id': p['uom_id'][0],
                                  'location_id': settings.STOCK_LOC_ID}
                        li = api.create('stock.inventory.line', fields)
                        done.append({'product': p, 'id': li})
                    except Exception as e:
                        missed.append({'product': p, 'msg': str(e)})
                api.execute('stock.inventory', 'action_done', [inv])
        return {'missed': missed, 'done': done}


    @staticmethod
    def cancel_buggy_pos_sales_waiting_transfer():
        res = {'errors': [], 'actions': []}
        api = OdooAPI()
        c = [['state', 'in', ['partially_available', 'assigned']],
             ['location_dest_id', '=', settings.CUSTOMER_LOC_ID]]
        f = ['name', 'state']
        stock_pickings = api.search_read('stock.picking', c, f)

        for sp in stock_pickings:
            try:
                ac = api.execute('stock.picking', 'action_cancel', [int(sp['id'])])
                res['actions'].append([sp['name'], ac])
            except Exception as e:
                res['errors'].append([sp['name'], str(e)])
        return res


    def attach_file(self, fileName, removeFile = True):
        """
        Attach file to stock.inventory instance.
        By default, remove entry file after operation.
        """
        try:
            import base64, os
            content = open(fileName, "rb").read()
            b64content = base64.b64encode(content).decode('utf-8')
            name = fileName.replace('temp/', '')
            mimetype = 'text/plain'
            if '.xlsx' in name:
                mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            # Does a file has already been sent ? (consequence of first validation)
            cond = [['name', '=', name], ['res_model', '=', 'stock.inventory'], ['res_id', '=', self.id]]
            existing = self.o_api.search_read('ir.attachment', cond, [], 1)
            if (existing):
                fieldsDatas = {"datas": b64content}
                res = self.o_api.update('ir.attachment', [existing[0]['id']], fieldsDatas)
            else:
                fieldsDatas = {
                                "res_model": 'stock.inventory',
                                "name": name,
                                "datas_fname": name,
                                "res_id": self.id,
                                "mimetype": mimetype,
                                "datas": b64content
                            }
                res = self.o_api.create('ir.attachment', fieldsDatas)

            # File is in odoo, remove it from temp storage
            if removeFile :
                os.remove(fileName)
        except Exception as e:
            print (e)
            res = None

        return res

    def get_file(self):
        """Get the files attached to a stock.inventory"""
        cond = [['res_model', '=', 'stock.inventory'], ['res_id', '=', self.id]]
        existing = self.o_api.search_read('ir.attachment', cond, [], 1)

        if not existing:
            raise Exception('Erreur: Le fichier n\'existe pas.')
        else:
            return existing[0]
