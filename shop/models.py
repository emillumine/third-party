from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI
from outils.common import CouchDB

from shelfs.models import Shelfs


p_fields = [
    'name',
    'list_price',
    'categ_id',
    'uom_id',
    'incoming_qty',
    'qty_available',
    'image_small',
    'price_volume',
    'price_weight_net']

max_timeslots_cart_file = 'shop/max_timeslot_carts.txt'

# Shop settings set by admin user
shop_admin_settings_file = 'shop/shop_admin_settings.json'

#  Already exists in Inventory, but since it has to be modified soon, copied here
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

def get_all_children(branch):
    children = []
    if 'children' in branch:
        for c in branch['children']:
            children.append({'id': c['id'], 'name': c['name']})
            if 'children' in c:
                children += get_all_children(c)
    return children



class CagetteShop(models.Model):
    """Class to handle cagette Shop."""

    @staticmethod
    def get_default_shop_admin_settings():
        return {'closing_dates': [],
                'capital_message': '',
                'max_timeslot_carts': settings.DEFAULT_MAX_TIMESLOT_CARTS}

    @staticmethod
    def filter_products_according_settings(pdts):
        res = pdts
        try:
            conditions = settings.SHOP_LIMIT_PRODUCTS
            filtered = []
            for p in pdts:
                keep_it = True
                if 'relatively_available' in conditions:
                    if float(p['qty_available']) <= 0 and float(p['incoming_qty']) <= 0:
                        keep_it = False
                if 'no_shelf' in conditions and (isinstance(p['shelf_id'], list) is False):
                    keep_it = False
                    # print(p['name'] + ' écarté car pas de rayon')
                if keep_it is True:
                    filtered.append(p)
            res = filtered
        except Exception as e:
            coop_logger.error("Shop, filter_products_according_settings : %s", str(e))

        return res

    @staticmethod
    def get_all_available_bought_products_by_member(member_id):
        res = {}
        try:
            pdts = []
            limit_conditions = []
            try:
                limit_conditions = settings.SHOP_LIMIT_PRODUCTS
            except:
                pass
            api = OdooAPI()
            params = {'member_id': member_id}
            odoo_result = api.execute('lacagette.pos_member_purchases', 'get_member_available_products_among_bought_pool', params)
            if odoo_result and 'pdts' in odoo_result:
                if len(odoo_result['pdts']) > 0:
                    pids = []
                    for p in odoo_result['pdts']:
                        pids.append(p['product_id'])
                    # removed ['qty_available', '>', 0]
                    c = [['id', 'in', pids], ['sale_ok', '=', True], ['active', '=', True]]
                    if 'no_shelf' in limit_conditions:
                        p_fields.append('shelf_id')
                    res_pdts = api.search_read('product.product', c, p_fields)
                    # construct pdts as to be ordered as odoo_result
                    for p in odoo_result['pdts']:
                        for rp in res_pdts:
                            if rp['id'] == p['product_id']:
                                rp['qty_available'] = float("{0:.3f}".format(rp['qty_available']))
                                pdts.append(rp)
            res['pdts'] = CagetteShop.filter_products_according_settings(pdts)
        except Exception as e:
            res['error'] = str(e)
        return res

    #  Already exists in Inventory, but since it has to be modified soon, copied here
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
    def get_cat_children_ids(categ_id):
        cat_ids = [categ_id]
        tree = CagetteShop.get_product_categories()
        branch = None
        for cats in tree:
            if 'children' in cats:
                for c in cats['children']:
                    if str(c['id']) == str(categ_id):
                        branch = c
        if not (branch is None):
            cat_ids += get_all_children_ids(branch)

        return cat_ids

    @staticmethod
    def get_cat_children(categ_id):
        children = []
        tree = CagetteShop.get_product_categories()
        branch = None
        for cats in tree:
            if 'children' in cats:
                for c in cats['children']:
                    if str(c['id']) == str(categ_id):
                        branch = c
        if not (branch is None):
            children = get_all_children(branch)

        return children

    @staticmethod
    def get_category_products(categ_id):
        res = {}
        try:
            pdts = []
            limit_conditions = []
            try:
                limit_conditions = settings.SHOP_LIMIT_PRODUCTS
            except:
                pass
            api = OdooAPI()
            cat_ids = CagetteShop.get_cat_children_ids(categ_id)
            # removed ['qty_available', '>', 0]
            c = [['categ_id.id', 'in', cat_ids], ['sale_ok', '=', True], ['active', '=', True]]
            if 'categ_id' in p_fields:
                p_fields.remove('categ_id')
            if 'no_shelf' in limit_conditions:
                p_fields.append('shelf_id')
            res_pdts = api.search_read('product.product', c, p_fields, order='name ASC')
            for rp in res_pdts:
                rp['qty_available'] = float("{0:.3f}".format(rp['qty_available']))
                pdts.append(rp)
            res['pdts'] = CagetteShop.filter_products_according_settings(pdts)

        except Exception as e:
            res['error'] = str(e)
        return res

    @staticmethod
    def get_products_matching(kw):
        res = {}
        try:
            pdts = []
            limit_conditions = []
            try:
                limit_conditions = settings.SHOP_LIMIT_PRODUCTS
            except:
                pass
            api = OdooAPI()
            # removed ['qty_available', '>', 0]
            c = [['name', 'ilike', '%' + kw + '%'], ['sale_ok', '=', True], ['active', '=', True]]
            if 'categ_id' in p_fields:
                p_fields.remove('categ_id')
            if 'no_shelf' in limit_conditions:
                p_fields.append('shelf_id')
            res_pdts = api.search_read('product.product', c, p_fields, order='name ASC')
            for rp in res_pdts:
                rp['qty_available'] = float("{0:.3f}".format(rp['qty_available']))
                pdts.append(rp)
            res['pdts'] = CagetteShop.filter_products_according_settings(pdts)

        except Exception as e:
            res['error'] = str(e)
        return res


    @staticmethod
    def registrerCartInitialization(cart, partner_id):
        result = {}
        try:
            cart['init_time'] = time.time()
            cart['partner_id'] = partner_id
            partner = {}
            try:
                api = OdooAPI()
                c = [['id', '=', partner_id]]
                f = ['display_name', 'email']
                res_p = api.search_read('res.partner', c, f, 1)
                if (res_p):
                    partner = res_p[0]
            except Exception as e:
                cart['error_while_saving'] = str(e)
            cart['partner'] = partner
            c_db = CouchDB(arg_db='shop')
            result = c_db.dbc.save(cart)
        except Exception as e:
            result['error'] = str(e)
        return result


    @staticmethod
    def registrerCart(cart, partner_id):
        result = {}
        try:
            cart['submitted_time'] = time.time()
            cart['total'] = "{0:.2f}".format(cart['total'])
            partner = {}
            try:
                api = OdooAPI()
                c = [['id', '=', partner_id]]
                f = ['display_name', 'email']
                res_p = api.search_read('res.partner', c, f, 1)
                if (res_p):
                    partner = res_p[0]
            except Exception as e:
                cart['error_while_saving'] = str(e)
            cart['partner'] = partner
            c_db = CouchDB(arg_db='shop')
            result = c_db.updateDoc(cart)
            if result:
                try:
                    from outils.mail import CagetteMail
                    CagetteMail.sendCartValidation(partner['email'], cart)
                except Exception as e:
                    coop_logger.error("Shop, registrerCart : %s, %s", str(e), str(cart))
        except Exception as e:
            result['error'] = str(e)
        return result

    @staticmethod
    def get_cart_products_data(cart):
        import re
        result = {}
        try:
            api = OdooAPI()
            pids = []
            for p in cart['products']:
                pids.append(p['id'])
            c = [['id', 'in', pids]]
            f = ['qty_available', 'shelf_id']
            res_data = api.search_read('product.product', c, f)

            shelfs_sortorder = Shelfs.get_shelfs_sortorder()
            if res_data:
                for line in res_data:
                    shelf = ''
                    if not line['shelf_id'] is False:
                        for so_line in shelfs_sortorder:
                            if so_line['id'] == line['shelf_id'][0]:
                                shelf = so_line['sort_order']
                                if float(shelf) == float(re.sub(r'\..*', '', str(shelf))):
                                    shelf = str(int(shelf))
                    result[line['id']] = {'stock': line['qty_available'], 'shelf': shelf}
        except Exception as e:
            result['error'] = str(e)
        return result

    @staticmethod
    def orderCartProducts(cart, pdts_data):
        """Products will be sorted by shelf value."""
        shelf_pdts = {}
        without_shelf_pdts = []
        ordered_products = []
        for p in cart['products']:
            if p['id'] in pdts_data:
                shelf = pdts_data[p['id']]['shelf']
                p['shelf'] = shelf
                p['stock'] = "{0:.3f}".format(pdts_data[p['id']]['stock'])
                if len(str(shelf)) > 0:
                    if not (shelf in shelf_pdts):
                        shelf_pdts[shelf] = [p]
                    else:
                        shelf_pdts[shelf].append(p)
                else:
                    without_shelf_pdts.append(p)
            else:
                p['shelf'] = p['stock'] = "???"
                without_shelf_pdts.append(p)
        s_keys = sorted(shelf_pdts.keys(), key=float)

        for k in s_keys:
            ordered_products += shelf_pdts[k]
        ordered_products += without_shelf_pdts
        cart['products'] = ordered_products
        return cart

    @staticmethod
    def get_promoted_and_discounted_products():
        pdts = {'discounted': [], 'promoted': []}
        try:
            api = OdooAPI()
            shelf_ids = settings.PROMOTE_SHELFS_IDS + settings.DISCOUNT_SHELFS_IDS
            c = [['shelf_id', 'in', shelf_ids], ['sale_ok', '=', True], ['active', '=', True]]
            p_fields.append('shelf_id')
            if 'categ_id' in p_fields:
                p_fields.remove('categ_id')
            res_pdts = api.search_read('product.product', c, p_fields, order='name ASC')
            for rp in res_pdts:
                rp['qty_available'] = float("{0:.3f}".format(rp['qty_available']))
                if rp['image_small'] is False:
                    rp['image_small'] = ''
                if int(rp['shelf_id'][0]) in settings.PROMOTE_SHELFS_IDS:
                    pdts['promoted'].append(rp)
                else:
                    pdts['discounted'].append(rp)
        except Exception as e:
            pass  #  it doesn't matter
        return pdts

    @staticmethod
    def deleteCartFromCDB(cart_id):
        result = {}
        try:
            c_db = CouchDB(arg_db='shop')
            doc = c_db.getDocById(cart_id)
            result['del_action'] = c_db.delete(doc)
        except Exception as e:
            result['error'] = str(e)
        return result

    @staticmethod
    def destroy_connected_user_cart(request):
        import re
        result = {}
        try:
            # TODO : make function to clean received couchdb id
            cart_id = re.sub(r'[^0-9a-z]', '', request.POST.get('cart_id'))
            connected_mid = request.COOKIES['id']
            c_db = CouchDB(arg_db='shop')
            cart = c_db.getDocById(cart_id)
            if cart and '_id' in cart:
                if str(connected_mid) == str(cart['partner']['id']):
                    result = CagetteShop.deleteCartFromCDB(cart_id)
                else:
                    result['error'] = "Forbidden (detroy other people cart)"
            else:
                result['error'] = "Not found"
        except Exception as e:
            result['error'] = str(e)
        return result

    @staticmethod
    def change_best_date(cart_id, request):
        result = {}
        try:
            connected_mid = request.COOKIES['id']
            c_db = CouchDB(arg_db='shop')
            cart = c_db.getDocById(cart_id)
            if cart and '_id' in cart:
                if str(connected_mid) == str(cart['partner']['id']):
                    cart['best_date'] = request.POST.get('new_date')
                    result['changed'] = c_db.dbc.update([cart])
                else:
                    result['error'] = "Forbidden (detroy other people cart)"
            else:
                result['error'] = "Not found"
        except Exception as e:
            result['error'] = str(e)
        return result


    @staticmethod
    def addCartProductToCart(cart, added_cart):
        result = {}
        try:
            if cart['state'] == 'validating' or cart['state'] == 'init':
                total = float(cart['total']) + float(added_cart['total'])
                cart['total'] = "{0:.3f}".format(total)
                cart['products'] += added_cart['products']
                cart['state'] = 'validating'
                c_db = CouchDB(arg_db='shop')
                result = c_db.dbc.update([cart])
                if result and True in result[0]:
                    result = CagetteShop.deleteCartFromCDB(added_cart['_id'])
            else:
                result['error'] = "Cart status forbidden gathering (" + cart['state'] + ")"
        except Exception as e:
            result['error'] = str(e)
        return result

    @staticmethod
    def fusion_carts(request):
        import re
        result = {}
        try:
            # TODO : make function to clean received couchdb id
            cart_id = re.sub(r'[^0-9a-z]', '', request.POST.get('id'))
            add_id = re.sub(r'[^0-9a-z]', '', request.POST.get('add_id'))
            connected_mid = request.COOKIES['id']
            c_db = CouchDB(arg_db='shop')
            cart = c_db.getDocById(cart_id)
            if cart and '_id' in cart:
                if str(connected_mid) == str(cart['partner']['id']):
                    added_cart = c_db.getDocById(add_id)
                    if added_cart and '_id' in added_cart:
                        result = CagetteShop.addCartProductToCart(cart, added_cart)
                    else:
                        result['error'] = "Forbidden (gather other people carts)"
                else:
                    result['error'] = "Forbidden (gather other people carts)"
            else:
                result['error'] = "Not found"
        except Exception as e:
            result['error'] = str(e)
        return result

    @staticmethod
    def getMaxCartPerSlot():
        max_timeslot_carts = int(settings.DEFAULT_MAX_TIMESLOT_CARTS)
        try:
            f = open(max_timeslots_cart_file, 'r+')
            max_timeslot_carts = int(f.readline())
            f.close()
        except Exception as e:
            if 'No such file or directory' in str(e):
                f = open(max_timeslots_cart_file, 'w')
                f.write(str(max_timeslot_carts))
                f.close()
            else:
                coop_logger.error("Shop, getMaxCartPerSlot : %s", str(e))

        # if shop_settings contains an entry, it's value is returned
        shop_settings = CagetteShop.get_shop_settings()
        try:
            if 'max_timeslot_carts' in shop_settings:
                max_timeslot_carts = int(shop_settings['max_timeslot_carts'])
        except:
            pass
        return max_timeslot_carts

    @staticmethod
    def getSlotSize():
        slot_size = settings.SHOP_SLOT_SIZE

        return slot_size

    @staticmethod
    def get_full_slots():
        max_timeslot_carts = CagetteShop.getMaxCartPerSlot()
        c_db = CouchDB(arg_db='shop')
        all_docs = c_db.getAllDocs()  #  TODO use view /reduce
        slots = {}
        fulled = []
        for doc in all_docs:
            if doc['best_date'] in slots.keys():
                slots[doc['best_date']] += 1
            else:
                slots[doc['best_date']] = 1
        for k in slots:
            if slots[k] >= max_timeslot_carts:
                fulled.append(k)

        return fulled

    @staticmethod
    def isCartRespectingTimeSlotContraints(cart):
        import datetime
        answer = False
        try:
            received_date = datetime.datetime.strptime(cart['best_date'], '%Y-%m-%d %H:%M')
            if received_date.weekday() > 0 and received_date.weekday() < 6:
                # the received date is not a monday nor a sunday
                now_plus_delay = datetime.datetime.now() + datetime.timedelta(hours=settings.MIN_DELAY_FOR_SLOT + 1)
                d_diff = received_date - now_plus_delay
                answer = d_diff > datetime.timedelta(seconds=1)
                if answer is True:  #  else no need to go further verifying time slot
                    full_slots = CagetteShop.get_full_slots()
                    for ts in full_slots:
                        if ts == cart['best_date']:
                            answer = False
        except Exception as e:
            coop_logger.error("Shop, isCartRespectingTimeSlotContraints : %s, %s", str(e), str(cart))
        return answer

    @staticmethod
    def get_orders_by_partner_id(partner_id):
        result = {}
        # TODO : Retrieve orders and send them back
        try:
            c_db = CouchDB(arg_db='shop')
            all_docs = c_db.getAllDocs()  #  TODO use view /reduce
            p_orders = []
            for doc in all_docs:
                # print(str(doc))
                if int(doc['partner']['id']) == int(partner_id):
                    p_orders.append(doc)
            # orders are sorted by ascending best_date

            result['orders'] = sorted(p_orders, key=lambda x: x['best_date'])
        except Exception as e:
            result['error'] = str(e)
        return result

    @staticmethod
    def get_slots():
        slots = {}
        try:
            c_db = CouchDB(arg_db='shop')
            all_docs = c_db.getAllDocs()  #  TODO use view /reduce
            for doc in all_docs:
                d, h = doc['best_date'].split(' ')
                if d in slots.keys():
                    if h in slots[d].keys():
                        slots[d][h] += 1
                    else:
                        slots[d][h] = 1
                else:
                    slots[d] = {h: 1}

        except Exception as e:
            coop_logger.error("Shop, get_slots : %s", str(e))

        # print(str(sorted(slots.keys())))
        return slots

    @staticmethod
    def get_shop_settings():
        """ Get shop admin settings from json config file """
        res = {}
        try:
            with open(shop_admin_settings_file) as json_file:
                res = json.load(json_file)
                # file automatically closed with 'with..as' statement
        except Exception as e:
            res = {}

        return res

    @staticmethod
    def add_shop_closing_date(closing_date):
        """ Add a closing date to shop settings and return settings """
        res = {}
        default_data = CagetteShop.get_default_shop_admin_settings()
        try:
            with open(shop_admin_settings_file) as json_file:
                data = json.load(json_file)
            for k in default_data.keys():
                if k not in data:
                    data[k] = default_data[k]
        except:
            data = default_data

        data['closing_dates'].append(closing_date)
        data['closing_dates'].sort()

        try:
            with open(shop_admin_settings_file, 'w') as outfile:
                json.dump(data, outfile)

            res['shop_settings'] = data
        except Exception as ee:
            res['error'] = str(ee)
            return res

        return res

    @staticmethod
    def remove_shop_closing_date(closing_date):
        """ Remove a closing date from shop settings and return settings """
        res = {}
        data = {}

        try:
            with open(shop_admin_settings_file) as json_file:
                data = json.load(json_file)

            data['closing_dates'].remove(closing_date)

            with open(shop_admin_settings_file, 'w') as outfile:
                json.dump(data, outfile)

            res['shop_settings'] = data
        except Exception as e:
            res['error'] = str(e)

        return res

    @staticmethod
    def save_max_orders_ps(nb):
        res = {}
        default_data = CagetteShop.get_default_shop_admin_settings()
        try:
            with open(shop_admin_settings_file) as json_file:
                data = json.load(json_file)

            for k in default_data.keys():
                if k not in data:
                    data[k] = default_data[k]
        except:
            data = default_data

        data['max_timeslot_carts'] = nb

        try:
            with open(shop_admin_settings_file, 'w') as outfile:
                json.dump(data, outfile)

            res['shop_settings'] = data
        except Exception as ee:
            res['error'] = str(ee)

        return res

    @staticmethod
    def save_capital_message(text):
        # TODO : Factorize with save_max_orders_ps and add_shop_closing_date
        res = {}
        default_data = CagetteShop.get_default_shop_admin_settings()
        try:
            with open(shop_admin_settings_file) as json_file:
                data = json.load(json_file)

            for k in default_data.keys():
                if k not in data:
                    data[k] = default_data[k]
        except:
            data = default_data

        data['capital_message'] = text

        try:
            with open(shop_admin_settings_file, 'w') as outfile:
                json.dump(data, outfile)

            res['shop_settings'] = data
        except Exception as ee:
            res['error'] = str(ee)

        return res

    @staticmethod
    def remove_unused_orders():
        res = {'errors': []}
        try:
            from datetime import datetime
            now_unixts = datetime.timestamp(datetime.now())

            c_db = CouchDB(arg_db='shop')
            all_docs = c_db.getAllDocs()  #  TODO use view /reduce

            for doc in all_docs:
                if (doc['state'] == 'init'):
                    try:
                        diff = doc['init_time'] - now_unixts
                        if abs(diff / 3600) > settings.HOURS_FOR_VALIDATION_SHOP + 2:
                            del_res = CagetteShop.deleteCartFromCDB(doc['_id'])
                            if 'error' in del_res:
                                res['errors'].append({'ctx': 'delete', 'msg': del_res['error']})
                    except Exception as e1:
                        res['errors'].append({'ctx': 'init_doc_loop', 'msg': str(e1)})
                        coop_logger.error("Shop, remove_unused_orders (e1): %s", str(e1))

        except Exception as e2:
            coop_logger.error("Shop, remove_unused_orders (e2) : %s", str(e2))
            res['errors'].append({'ctx': 'main', 'msg': str(e2)})

        return res
