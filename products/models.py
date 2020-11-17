# coding: utf-8
"""Products modelsmain page."""
from django.db import models
from outils.common_imports import *
from outils.common import OdooAPI
import csv
import tempfile
import pymysql.cursors

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

    @staticmethod
    def get_product_info_for_label_from_template_id(template_id):
        """Get product info for label."""
        api = OdooAPI()
        cond = [['product_tmpl_id.id', '=', template_id]]
        fields = ['barcode', 'product_tmpl_id', 'pricetag_rackinfos',
                  'price_weight_net', 'price_volume', 'list_price',
                  'weight_net', 'volume','to_weight']
        return api.search_read('product.product', cond, fields)

    @staticmethod
    def generate_label_for_printing(templ_id, directory, price=None, nb=None):
        res = {}
        try:
            p = CagetteProduct.get_product_info_for_label_from_template_id(templ_id)
            if (p and p[0]['product_tmpl_id'][0] == int(templ_id)):
                product = p[0]
                txt = ''
                for k, v in product.items():
                    if type(v) == list:
                        v = v[1]
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
        return res

class CagetteProducts(models.Model):
    """Initially used to make massive barcode update."""

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
    def get_all_barcodes():
        api = OdooAPI()
        fields = ['barcode', 'display_name', 'sale_ok', 'purchase_ok', 'available_in_pos']
        # cond = ['|', ('active', '=', True), ('active', '=', False)]
        cond = []  # equivalent to [['active', '=', 'True']]
        res = api.search_read('product.product', cond, fields, 10000)
        result = {}

        for p in res:
            # transcode result to compact format (for bandwith save and browser memory)
            # real size / 4 (for 2750 products)
            result[p['barcode']] = [p['display_name'], p['sale_ok'], p['purchase_ok'], p['available_in_pos']]

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
        c = [['type', 'in', ['FF_price_to_weight', 'price', 'price_to_weight', 'product', 'weight' ]], ['barcode_nomenclature_id','=', 1]]
        rules = OdooAPI().search_read('barcode.rule', c, ['pattern'], order="sequence ASC")
        # As rules are ordered by sequence, let's find where to stop (.* pattern)
        stop_idx = len(rules) - 1
        i = 0
        for r in rules:
            if r['pattern'] == ".*":
                stop_idx = i
            i += 1
        if stop_idx > 0:
            rules = rules[:stop_idx - 1]
        return rules


    @staticmethod
    def get_fixed_barcode_correspondance(barcodes):
        import re
        from outils.functions import computeEAN13Check
        bc_map = {}

        rules = CagetteProducts.get_barcode_rules()

        # now, just keep rules with N in pattern
        rules = list(filter(lambda x: '.' in x['pattern'], rules))
        rules = list(map(lambda x: x['pattern'], rules))

        # now remove {NN...} from pattern
        rules = list(map(lambda x: re.sub(r'{.+}', '', x), rules))

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
