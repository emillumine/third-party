from django.db import models

from outils.common_imports import *
from outils.common import OdooAPI
from shelfs.models import Shelfs


class Order(models.Model):

    def __init__(self, id):
	    """Init with odoo id."""
	    self.id = int(id)
	    self.o_api = OdooAPI()

    def get_coop_main_coeff(self):
        coeff = None
        try:
            res = self.o_api.search_read('product.coefficient', [['id', '=', settings.COEFF_MAG_ID]], ['value'])
            if res:
                coeff = 1 + float(res[0]['value'])
        except:
            pass
        return coeff

    def get_inactive_products(self):
        """ Get the products in order that are inactive """
        result = []

        f = ['product_id']
        c = [['order_id', '=', self.id]]
        res = self.o_api.search_read('purchase.order.line', c, f)

        pids = []
        for ol in res:
            pids.append(ol['product_id'][0])

        if len(pids) > 0:
            # Get products not active: will block stock transfers
            f = ['id']
            c = [['id', 'in', pids], ['active','=',False]]
            res_prod = self.o_api.search_read('product.product', c, f)

            if res_prod:
                for p in res_prod:
                    for ol in res:
                        if ol['product_id'][0] == p['id']:
                            result.append(ol['product_id'])

        return result

    def get_lines(self, forExport=False, withNullQty=False):
        f = ['id', 'product_id', 'package_qty', 'product_qty_package', 'product_qty', 'product_uom', 'price_unit', 'partner_id']
        if forExport is True:
            f += ['discount', 'price_subtotal', 'price_tax', 'taxes_id']
        c = [['order_id', '=', self.id]]
        if (withNullQty is False):
            c.append(['product_qty', '>', 0])
        res = self.o_api.search_read('purchase.order.line', c, f)

        pids = []
        partner_id = None
        for p in res:
            pids.append(p['product_id'][0])
            partner_id = p['partner_id'][0]
        if len(pids) > 0:
            # Adding barcode and other data for every purchased product
            f = ['barcode', 'product_tmpl_id', 'shelf_id']
            if forExport is False:  # i.e for reception
                f += ['taxes_id', 'standard_price']
                coeff = self.get_coop_main_coeff()
            c = [['id', 'in', pids]]
            res_bc = self.o_api.search_read('product.product', c, f)
            tmpl_ids = []
            if res_bc:
                taxes = {}
                res_tax = self.get_taxes_data_for_lines(res_bc)
                if res_tax:
                    for tax in res_tax:
                        taxes[str(tax['id'])] = tax['amount']

                # Iterate a first time through results to get distinct shelf_ids
                shelf_ids = []
                for l in res_bc:
                    if l['shelf_id'] is not False:
                        try:
                            tmp = shelf_ids.index(l['shelf_id'][0])
                        except:
                            # If index error, id not in array, so add it
                            shelf_ids.append(l['shelf_id'][0])

                shelfs_sortorder = []
                if len(shelf_ids) > 0:
                    shelfs_sortorder = Shelfs.get_shelfs_sortorder(shelf_ids)

                for l in res_bc:
                    for p in res:
                        if p['product_id'][0] == l['id']:
                            p['shelf_sortorder'] = 'X'
                            p['barcode'] = l['barcode']
                            p['product_tmpl_id'] = l['product_tmpl_id'][0]
                            if ('standard_price' in l):
                                p['p_price'] = l['standard_price']
                                p_coeff = None
                                try:
                                    tax_coeff = (1 + (float(taxes[str(l['taxes_id'][0])]))/100)
                                    p_coeff = coeff * tax_coeff
                                except Exception as e:
                                    coop_logger.warning('order get_lines : %s', str(e))
                                p['p_coeff'] = p_coeff

                            if l['shelf_id'] is not False:
                                for s in shelfs_sortorder:
                                    if l['shelf_id'][0] == s['id']:
                                        p['shelf_sortorder'] = s['sort_order']
                            else:
                                p['shelf_sortorder'] = 'X'

                    tmpl_ids.append(l['product_tmpl_id'][0])

                # Adding indicative_package for every product
                f = ['indicative_package','product_tmpl_id','product_code']
                c = [['product_tmpl_id', 'in', tmpl_ids], ['name', '=', partner_id]]
                res_ip = self.o_api.search_read('product.supplierinfo', c, f)
                if res_ip:
                    for l in res_ip:
                        for p in res:
                            try:
                                if p['product_tmpl_id'] == l['product_tmpl_id'][0]:
                                    p['indicative_package'] = l['indicative_package']
                                    p['ps_info_id'] = l['id']
                                    p['supplier_code'] = l['product_code']
                                    p['active'] = True
                            except Exception as e:
                                # if product is not active, it is not included in res_bc result
                                p['active'] = False

        return res

    def get_taxes_data_for_lines(self, lines):
        taxes_id = []
        res = []
        for l in lines:
            if ('taxes_id' in l):
                taxes_id += l['taxes_id']
        if len(taxes_id) > 0:
            taxes_id = set(taxes_id) # to keep only unique values
            f = ['name', 'amount']
            c = [['id', 'in', list(taxes_id)]]
            res = self.o_api.search_read('account.tax', c, f)
        return res

    def export(self):
        res = {'success': True}
        try:
            f = ["id", "name", "date_order", "partner_id", "date_planned", "amount_untaxed", "amount_total", "x_reception_status"]
            c = [['id', '=', self.id]]
            order = self.o_api.search_read('purchase.order', c, f)
            if order:
                lines = self.get_lines(forExport=True)
                res['taxes'] = self.get_taxes_data_for_lines(lines)
                res['order'] = order[0]
                res['lines'] = lines
        except Exception as e:
            res['error'] = str(e)
            res['success'] = False
        return res

    def attach_file(self, fileName, removeFile = True):
        """
        Attach file to purshase orderself.
        By default, remove entry file after operation.
        """
        try:
            import base64, os
            content = open(fileName, "rb").read()
            b64content = base64.b64encode(content).decode('utf-8')
            # content = open(fileName, "rb").read().encode("utf-8")  # utf-8 encode needed for b64encode
            # b64content = base64.b64encode(content).decode("utf-8")  # utf-8 decode needed : if not Odoo bugs
            name = fileName.replace('temp/', '')
            mimetype = 'text/plain'
            if '.xlsx' in name:
                mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            # Does a file has already been sent ? (consequence of first validation)
            cond = [['name', '=', name], ['res_model', '=', 'purchase.order'], ['res_id', '=', self.id]]
            existing = self.o_api.search_read('ir.attachment', cond, [], 1)
            if (existing):
                fieldsDatas = {"datas": b64content}
                res = self.o_api.update('ir.attachment', [existing[0]['id']], fieldsDatas)
            else:
                fieldsDatas = {
                                "res_model": 'purchase.order',
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

    def attach_message(self, body):
        params = {'message_type': 'comment', 'subtype': 'mail.mt_comment', 'body': body}
        return self.o_api.execute('purchase.order','message_post',[self.id], params)

    def get_custom_barcode_labels_to_print(self):
        import re
        fixed_prefix = getattr(settings, 'FIXED_BARCODE_PREFIX', '0490')
        labels_data = {'total': 0, 'details': []}
        lines = self.get_lines()
        bc_pattern = re.compile('^' + fixed_prefix)
        for l in lines:
            if ('barcode' in l) and not (bc_pattern.match(str(l['barcode'])) is None):
                labels_data['details'].append(l)
                labels_data['total'] += l['product_qty']
        return labels_data

    def get_order_attachment_id(self):
        res = {}
        f = ["id"]
        c = [['res_model', '=', 'purchase.order'], ['res_id', '=', self.id], ['type', 'in', ['binary', 'url']]]

        try:
            attachment = self.o_api.search_read('ir.attachment', c, f)
            res = attachment[0]
        except Exception as e:
            res["id_po"] = self.id
            res["error"] = str(e)

        return res

    @staticmethod
    def create(supplier_id, date_planned, order_lines):
        order_data = {
            "partner_id": int(supplier_id),
            "partner_ref": False,
            "currency_id": 1,
            "date_order": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "origin": "Aide à la commande",
            "company_id": 1,
            "order_line": [],
            "notes": False,
            "date_planned": date_planned,
            "picking_type_id": 1,
            "dest_address_id": False,
            "incoterm_id": False,
            "payment_term_id": False,
            "fiscal_position_id": False,
            "message_follower_ids": False,
            "message_ids": False
        }

        for line in order_lines:
            product_line_name =  line["name"]
            if "product_code" in line and line["product_code"] is not False:
                product_code = str(line["product_code"])
                product_line_name = f"[{product_code}] {product_line_name}"

            order_data["order_line"].append(
                [
                    0,
                    False,
                    {
                        "package_qty": line["package_qty"],
                        "price_policy": "uom",
                        "indicative_package": True,
                        "product_id": line["product_variant_ids"][0],
                        "name": product_line_name,
                        "date_planned": date_planned,
                        "account_analytic_id": False,
                        "product_qty_package":line["product_qty_package"],
                        "product_qty": line["product_qty"],
                        "product_uom": line["product_uom"],
                        "price_unit": line["price_unit"],
                        "discount": 0,
                        "taxes_id": [
                            [
                                6,
                                False,
                                line["supplier_taxes_id"]
                            ]
                        ]
                    }
                ]
            )

        api = OdooAPI()
        id_po = api.create('purchase.order', order_data)
        res_confirm = api.execute('purchase.order', 'button_confirm', [id_po])

        res = {
            'id_po': id_po,
            'confirm_po': True,
            'supplier_id': supplier_id,
            'date_planned': date_planned
        }

        return res

class Orders(models.Model):

    @staticmethod
    def get_lines(oids):
        lines = []
        try:
            api = OdooAPI()
            f = ['id', 'product_id', 'package_qty', 'product_qty_package', 'product_qty', 'product_uom', 'price_unit', 'partner_id']
            c = [['order_id', 'in', oids]]
            res = api.search_read('purchase.order.line', c, f)
            pids = []
            for p in res:
                pids.append(p['product_id'][0])

            if len(pids) > 0:
                # Adding barcode and other data for every purchased product
                f = ['barcode', 'product_tmpl_id', 'shelf_id']
                c = [['id', 'in', pids]]
                res_bc = api.search_read('product.product', c, f)
                for l in res_bc:
                    for p in res:
                        if p['product_id'][0] == l['id']:
                            p['barcode'] = l['barcode']
                            p['product_tmpl_id'] = l['product_tmpl_id'][0]
                lines = res
        except Exception as e:
            coop_logger.error('Orders get_lines(oids) : %s', str(e))

        return lines

    @staticmethod
    def get_custom_barcode_labels_to_print(oids):
        import re
        labels_data = {}
        try:
            fixed_prefix = getattr(settings, 'FIXED_BARCODE_PREFIX', '0490')
            bc_pattern = re.compile('^' + fixed_prefix)
            for l in Orders.get_lines(oids):
                if not (bc_pattern.match(str(l['barcode'])) is None):
                    if not (l['product_tmpl_id'] in labels_data):
                        labels_data[l['product_tmpl_id']] = 0
                    labels_data[l['product_tmpl_id']] += int(l['product_qty'])
        except Exception as e:
            coop_logger.error('Orders get_custom_barcode_labels_to_print(oids) : %s', str(e))

        return labels_data

class CagetteSuppliers(models.Model):

    @staticmethod
    def get_suppliers():
        api = OdooAPI()

        f = ['id', 'name', 'display_name']
        c = [['supplier', '=', 1], ['parent_id', '=', False]]
        res = api.search_read('res.partner', c, f)

        return res
