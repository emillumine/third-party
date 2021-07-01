# coding: utf-8
"""Products modelsmain page."""
from django.db import models
from outils.common_imports import *
from outils.common import OdooAPI
import csv
import tempfile
import pymysql.cursors
import datetime

vcats = []

if hasattr(settings, 'VRAC_CATEGS'):
    vcats = settings.VRAC_CATEGS



class CagetteProduct(models.Model):
    """Class to handle cagette Odoo products."""

    name = None
    id = None

    def __str__(self):
        """String returned where Object has to be print."""
        return self.name

    def get_product_from_barcode(barcode):
        api = OdooAPI()
        cond = [['barcode', '=', barcode],
                '|',
                ['active', '=', True],
                ['active', '=', False]]
        fields = ['id', 'uom_id', 'name', 'qty_available', 'barcode', 'active', 'shelf_id']

        return api.search_read('product.product', cond, fields)

    def get_products_stdprices(ids):
        api = OdooAPI()
        cond = [['id', 'in', ids]]
        fields = ['id', 'standard_price']

        try:
            res = api.search_read('product.product', cond, fields)
        except Exception as e:
            res = {'error': str(e)}

        return res


    @staticmethod
    def get_product_info_for_label_from_template_id(template_id):
        """Get product info for label."""
        api = OdooAPI()
        cond = [['product_tmpl_id.id', '=', template_id]]
        fields = ['barcode', 'product_tmpl_id', 'pricetag_rackinfos',
                  'price_weight_net', 'price_volume', 'list_price',
                  'weight_net', 'volume', 'to_weight']
        additionnal_fields = getattr(settings, 'SHELF_LABELS_ADD_FIELDS', [])
        fields += additionnal_fields
        product_data = api.search_read('product.product', cond, fields)
        if product_data and 'suppliers' in additionnal_fields:
            cond = [['product_tmpl_id.id', '=', template_id]]
            fields = ['name']
            suppliers = api.search_read('product.supplierinfo', cond, fields)
            if suppliers:
                suppliers_name = []
                for s in suppliers:
                    suppliers_name.append(s['name'][1])
                product_data[0]['suppliers'] = ', '.join(list(set(suppliers_name)))
        return product_data

    @staticmethod
    def generate_label_for_printing(templ_id, directory, price=None, nb=None):
        res = {}
        try:
            p = CagetteProduct.get_product_info_for_label_from_template_id(templ_id)

            if (p and p[0]['product_tmpl_id'][0] == int(templ_id)):
                product = p[0]
                txt = ''
                for k, v in product.items():
                    if type(v) == list and len(v) > 0 :
                        v = v[-1]
                    if k == 'product_tmpl_id':
                        k = 'name'
                    if k == 'list_price' and len(price) > 0 and float(price) > 0:
                        v = price
                    if k == 'price_weight_net' and len(v) > 0 and len(price) > 0 and float(price) > 0:
                        v = round(float(price) / float(product['weight_net']), 2)
                    if k == 'price_volume' and len(v) > 0 and len(price) > 0 and float(price) > 0:
                        v = round(float(price) / float(product['volume']), 2)
                    txt += k + '=' + str(v).strip() + "\r\n"
                if not (nb is None) and len(nb) > 0:
                    txt += 'nb_impression=' + str(nb) + "\r\n"
                res['txt'] = txt
                os_file = settings.DAV_PATH + directory
                os_file += 'EtiquetteProduit_' + str(product['id'])
                os_file += '_' + str(int(time.time())) + '.txt'
                file = open(os_file, "w")
                file.write(txt)
                file.close()
        except Exception as e:
            res['error'] = str(e)
            coop_logger.error("Generate label : %s %s", templ_id, str(e))
        return res

    @staticmethod
    def register_start_supplier_shortage(product_id, partner_id, date_start):
        """Start a supplier shortage for a product"""
        api = OdooAPI()

        c = [['product_id', '=', product_id],
                ['partner_id', '=', partner_id],
                ['date_start', '=', date_start]]
        existing = api.search_read('product.supplier.shortage', c)

        if existing:
            res = "already on shortage"
            return res

        f = {
            'product_id' : product_id,
            'partner_id' : partner_id,
            'date_start' : date_start,
        }
        res = api.create('product.supplier.shortage', f)
        return res

    @staticmethod
    def associate_supplier_to_product(data):
        api = OdooAPI()

        product_tmpl_id = data["product_tmpl_id"]
        partner_id = data["supplier_id"]
        package_qty = data["package_qty"]
        price = data["price"]

        f = ["id", "standard_price", "purchase_ok"]
        c = [['product_tmpl_id', '=', product_tmpl_id]]
        res_products = api.search_read('product.product', c, f)
        product = res_products[0]

        f = {
            'product_tmpl_id' : product_tmpl_id,
            'product_id' : product["id"],
            'name' : partner_id,
            'product_purchase_ok': product["purchase_ok"],
            'price': price,
            'base_price': price,
            'package_qty': package_qty
        }
        res = api.create('product.supplierinfo', f)

        return res

    @staticmethod
    def update_product_purchase_ok(product_tmpl_id, purchase_ok):
        api = OdooAPI()
        res = {}

        f = {
            'purchase_ok': purchase_ok
        }

        try:
            res["update"] = api.update('product.template', product_tmpl_id, f)
        except Exception as e:
            res["error"] = str(e)
            print(str(e))

        return res


class CagetteProducts(models.Model):
    """Initially used to make massive barcode update."""

    @staticmethod
    def get_simple_list():
        res = []
        api = OdooAPI()
        try:
            res = api.execute('lacagette.products', 'get_simple_list', {'only_purchase_ok': True})
        except Exception as e:
            coop_logger.error("Odoo api products simple list : %s", str(e))
        return res

    @staticmethod
    def __unique_product_list(plist):
        # 276
        upl = {}
        for p in plist:
            if not (p['id'] in upl):
                if ('image_medium' in p):
                    p['image'] = p['image_medium']
                    p['image_medium'] = ''
                # if ('image' in p):
                #    p['image'] = __process_img_data(p, 'image')
                if type(p['image']) is bool:
                    p['image'] = ''
                if p['categ_id'][0] == settings.CATEG_FRUIT:
                    p['categ'] = 'F'
                elif p['categ_id'][0] == settings.CATEG_LEGUME:
                    p['categ'] = 'L'
                elif (p['name'].lower().find(' vrac') > -1) or (p['categ_id'][0] in vcats):
                    p['categ'] = 'V'
                else:
                    p['categ'] = 'A'

                if not (len(p['image']) == 0 and p['list_price'] == 1.0):
                    if p['name'].find('A SUPPRIMER') == -1:
                        upl[p['id']] = p
        # 169
        return upl.values()

    @staticmethod
    def get_products_to_weight(withCandidate=False, fields=[]):
        api = OdooAPI()
        cond = [['active', '=', True],
                ['to_weight', '=', True],
                ['available_in_pos', '=', True]]
        if not withCandidate:
            cond = [('active', '=', True), ('to_weight', '=', True), ('available_in_pos', '=', True), '|', ('barcode', '=like', '0491%'), ('barcode', '=like', '0493%')]

        return api.search_read('product.product', cond, fields)

    @staticmethod
    def get_vrac_products_from_name(withCandidate=False, fields=[]):
        api = OdooAPI()
        cond = [['active', '=', True],
                ['available_in_pos', '=', True],
                ['name', 'ilike', 'vrac']]
        if not withCandidate:
            cond = [('active', '=', True), ('name', 'ilike', 'vrac'), ('available_in_pos', '=', True), '|', ('barcode', '=like', '0491%'), ('barcode', '=like', '0493%')]
        return api.search_read('product.product', cond, fields)

    @staticmethod
    def get_vrac_products_from_cats(cats, withCandidate=False, fields=[]):
        api = OdooAPI()
        cond = [['active', '=', True],
                ['available_in_pos', '=', True],
                ['categ_id', 'in', cats]]
        return api.search_read('product.product', cond, fields)

    @staticmethod
    def get_fl_products(withCandidate=False, fields=[]):
        api = OdooAPI()
        flv_cats = [settings.CATEG_FRUIT, settings.CATEG_LEGUME]
        cond = [['active', '=', True],
                ['available_in_pos', '=', True],
                ['categ_id', 'in', flv_cats]]
        if not withCandidate:
            cond = [('active', '=', True), ('categ_id', 'in', flv_cats), ('available_in_pos', '=', True), '|', ('barcode', '=like', '0493%'), ('barcode', '=like', '0499%')]
        return api.search_read('product.product', cond, fields)

    @staticmethod
    def get_products_for_label_appli(withCandidate=False):
        fields = ['sale_ok', 'uom_id', 'barcode',
                  'name', 'display_name', 'list_price', 'categ_id', 'image_medium']
        if getattr(settings, 'EXPORT_POS_CAT_FOR_SCALES', False) is True:
            fields.append('pos_categ_id')
        to_weight = CagetteProducts.get_products_to_weight(withCandidate, fields)
        if len(vcats) > 0:
            vrac = CagetteProducts.get_vrac_products_from_cats(vcats, withCandidate, fields)
        else:
            vrac = CagetteProducts.get_vrac_products_from_name(withCandidate, fields)
        flv = CagetteProducts.get_fl_products(withCandidate, fields)
        products = CagetteProducts.__unique_product_list(to_weight + vrac + flv)
        return products

    @staticmethod
    def get_all_available():
        api = OdooAPI()
        cond = [['active', '=', True], ['sale_ok', '=', True]]
        fields = ['uom_id', 'display_name','barcode']
        return api.search_read('product.product', cond, fields)


    @staticmethod
    def get_pos_categories():
        api = OdooAPI()
        fields = ['name', 'parent_id', 'sequence', 'image_small']
        try:
            res = api.search_read('pos.category', [], fields)
        except Exception as e:
            coop_logger.error('Getting POS categories : %s', str(e))
            res = []

        return res

    @staticmethod
    def get_all_barcodes():
        """Needs lacagette_products Odoo module to be active."""
        result = {}
        api = OdooAPI()
        try:
            res = api.execute('lacagette.products', 'get_barcodes', {})

            if 'list' in res:
                result['pdts'] = {}
                for p in res['list']:
                    # transcode result to compact format (for bandwith save and browser memory)
                    # real size / 4 (for 2750 products)
                    # following 2 lines is only useful for La Cagette (changing uom_id in Database has cascade effects...)
                    # TODO : Use mapping list in config.py
                    if p['uom_id'] == 3:
                        p['uom_id'] = 21
                    if p['uom_id'] == 20:
                        p['uom_id'] = 1
                    result['pdts'][p['barcode']] = [
                                                    p['display_name'],
                                                    p['sale_ok'],
                                                    p['purchase_ok'],
                                                    p['available_in_pos'],
                                                    p['id'],
                                                    p['standard_price'],
                                                    p['list_price'],
                                                    p['uom_id']]
                if 'uoms' in res and 'list' in res['uoms']:
                    result['uoms'] = res['uoms']['list']
            elif 'error' in res:
                result['error'] = res['error']
        except Exception as e:
                result['error'] = str(e)
        return result

    def get_uoms():
        result = {}
        api = OdooAPI()
        try:
            cond = [['active', '=', True]]
            fields = ['display_name', 'uom_type']
            res = api.search_read('product.uom', cond, fields)
            result['list'] = res
        except Exception as e:
                result['error'] = str(e)
        return result

    @staticmethod
    def find_bc_errors():
        from outils.functions import checkEAN13
        import re
        p_with_errors = {'missing': [], 'length': [], 'check': []}
        api = OdooAPI()
        # exclude teams and capital shares
        cond = [['active', '=', True], ['id', '>', 4], ['id', '!=', 1008]]
        cond.append(['available_in_pos', '=', True])
        cond.append(['sale_ok', '=', True])
        fields = ['barcode', 'display_name']
        p_with_bc = api.search_read('product.product', cond, fields)
        for p in p_with_bc:
            if (p['barcode'] is False):
                p_with_errors['missing'].append(p)
            else:
                try:
                    if (checkEAN13(p['barcode']) is False):
                        p_with_errors['check'].append(p)
                except:
                    p['barcode'] = re.sub('[ ]', '[ESP]', p['barcode'])
                    p['barcode'] = re.sub('[\t]', '[TAB]', p['barcode'])
                    p_with_errors['length'].append(p)

        return p_with_errors

    @staticmethod
    def get_sales(request):
        from outils.functions import getMonthFromRequestForm
        res = {}
        m_res = getMonthFromRequestForm(request)
        if 'month' in m_res:
            api = OdooAPI()
            res = api.execute('lacagette.pos_product_sales', 'get_pos_data', m_res)
            res['month'] = m_res['month']
        else:
            res = m_res
        return res

    @staticmethod
    def get_barcode_rules():
        result = {'patterns': [], 'aliases': {}}
        try:
            import re
            c = [['type', 'in', ['FF_price_to_weight', 'price', 'price_to_weight', 'product', 'weight', 'alias']], ['barcode_nomenclature_id','=', 1]]
            rules = OdooAPI().search_read('barcode.rule', c, ['pattern', 'type', 'alias'], order="sequence ASC")
            # As rules are ordered by sequence, let's find where to stop (.* pattern)
            stop_idx = len(rules) - 1
            i = 0
            for r in rules:
                if r['pattern'] == ".*":
                    stop_idx = i
                i += 1
            if stop_idx > 0:
                rules = rules[:stop_idx - 1]
            for r in rules:
                if r['type'] == 'alias':
                    alias_bc = re.sub('[^0-9]', '', r['pattern'])
                    if len(alias_bc) > 0:
                        result['aliases'][alias_bc] = r['alias']
                elif '{' in r['pattern'] or '.' in r['pattern']:
                    result['patterns'].append(r)
        except Exception as e:
            result['error'] = str(e)
            coop_logger.error("Get Barcode Rules : %s", str(e))
        # coop_logger.info("Fin get bc rules : %s", str(result))
        return result


    @staticmethod
    def get_fixed_barcode_correspondance(barcodes):
        import re
        from outils.functions import computeEAN13Check
        bc_map = {}
        rules = CagetteProducts.get_barcode_rules()

        rules = rules['patterns']
        # now, just keep rules with N in pattern
        rules = list(filter(lambda x: '.' in x['pattern'], rules))
        rules = list(map(lambda x: x['pattern'], rules))

        # now remove {NN...} from pattern
        rules = list(map(lambda x: re.sub(r'{.+}', '', x), rules))
        # coop_logger.info('rules = %s', rules)
        # now compile regex for pattern
        regex = []
        for r in rules:
            regex.append(re.compile(r))
        for bc in barcodes:
            found = False
            for r in regex:
                if found is False:
                    if r.match(bc):
                        generic = ''
                        for i in range(0, len(r.pattern)):
                            if r.pattern[i] == '.':
                                generic += bc[i]
                            else:
                                generic += r.pattern[i]
                        generic = generic.ljust(12, '0')
                        generic += str(computeEAN13Check(generic))
                        bc_map[bc] = generic
                        found = True
            if found is False:
                bc_map[bc] = bc
        return bc_map

    @staticmethod
    def get_template_products_sales_average(params={}):
        api = OdooAPI()
        res = {}
        try:
            res = api.execute('lacagette.products', 'get_template_products_sales_average', params)
        except Exception as e:
            coop_logger.error('get_template_products_sales_average %s (%s)', str(e), str(params))
            res["error"] = str(e)
        return res

    @staticmethod
    def get_products_for_order_helper(supplier_id, pids = []):
        """ 
            One of the two parameters must be set.
            Get products by supplier if a supplier_id is set. 
            If supplier_id is None, get products specified in pids.
        """
        api = OdooAPI()
        res = {}

        # todo : try with no result
        try:
            today = datetime.date.today().strftime("%Y-%m-%d")

            if supplier_id is not None:
                # Get products/supplier relation
                f = ["product_tmpl_id", 'date_start', 'date_end', 'package_qty', 'price']
                c = [['name', '=', int(supplier_id)]]
                psi = api.search_read('product.supplierinfo', c, f)

                # Filter valid data
                ptids = []
                for p in psi:
                    if (p["product_tmpl_id"] is not False 
                        and (p["date_start"] is False or p["date_end"] is not False and p["date_start"] <= today) 
                        and (p["date_end"] is False or p["date_end"] is not False and p["date_end"] >= today)):
                        ptids.append(p["product_tmpl_id"][0])
            else:
                ptids = [ int(x) for x in pids ]

            # Get products templates
            f = [
                "id",
                "state",
                "name",
                "default_code",
                "qty_available",
                "incoming_qty",
                "uom_id",
                "purchase_ok",
                "supplier_taxes_id",
                "product_variant_ids"
            ]
            c = [['id', 'in', ptids], ['purchase_ok', '=', True]]
            products_t = api.search_read('product.template', c, f)
            filtered_products_t = [p for p in products_t if p["state"] != "end" and p["state"] != "obsolete"]

            sales_average_params = {
                'ids': ptids, 
                # 'from': '2019-06-10', 
                # 'to': '2019-08-10',
            }
            sales = CagetteProducts.get_template_products_sales_average(sales_average_params)

            if 'list' in sales and len(sales['list']) > 0:
                sales = sales['list']
            else:
                sales = []
            
            # Add supplier data to product data
            for i, fp in enumerate(filtered_products_t):
                if supplier_id is not None:
                    psi_item = next(item for item in psi if item["product_tmpl_id"] is not False and item["product_tmpl_id"][0] == fp["id"])
                    filtered_products_t[i]['suppliersinfo'] = [{
                        'supplier_id': int(supplier_id),
                        'package_qty': psi_item["package_qty"],
                        'price': psi_item["price"]
                    }]

                for s in sales:
                    if s["id"] == fp["id"]:
                        filtered_products_t[i]['daily_conso'] = s["average_qty"]
                        filtered_products_t[i]['sigma'] = s["sigma"]
                        filtered_products_t[i]['vpc'] = s["vpc"]

            res["products"] = filtered_products_t
        except Exception as e:
            coop_logger.error('get_products_for_order_helper %s (%s)', str(e), str(supplier_id))
            res["error"] = str(e)

        return res

class OFF(models.Model):
    """OpenFoodFact restricted DB queries."""

    conn = None

    def __init__(self):
        self.conn = pymysql.connect(host='localhost',
                                    user=settings.SQL_OFF['user'],
                                    db=settings.SQL_OFF['db'],
                                    password=settings.SQL_OFF['pwd'],
                                    charset='utf8',
                                    cursorclass=pymysql.cursors.DictCursor)

    def get_products(self):
        res = {}
        if self.conn:
            try:
                with self.conn.cursor() as cursor:
                    sql = "SELECT code, nova_group, nutrition_grade_fr, energy_100g, quantity, categories, labels, manufacturing_places, origins, url FROM produits"
                    cursor.execute(sql)
                    for row in cursor:
                        res[str(row['code'])] = row
            except Exception as e:
                res['error'] = str(e)
            finally:
                self.conn.close()
        return res
