from django.db import models

from outils.common_imports import *
from outils.common import OdooAPI
from orders.models import Order

import os, re

# Create your models here.

PO_TO_PROCESS_FILE_PREFIX = 'data/po_to_process'

class CagetteReception(models.Model):

    def __init__(self, id):
        """Init with odoo id."""
        self.id = int(id)
        self.o_api = OdooAPI()

    def get_orders(pids=[]):
        """
            Recupere la liste des BC en cours.
            pids: Id des purchase.order à récupérer. Limite la recherche si défini.
        """
        orders = []
        try:
            api = OdooAPI()
            if len(pids) == 0:
                f = ["purchase_id"]
                c = [['picking_type_id', '=', 1], ["state", "in", ['assigned', 'partially_available']]]
                res = api.search_read('stock.picking', c, f)
                pids = []
                if res and len(res) > 0:
                    for r in res:
                        if r['purchase_id']:  #  May be False
                           pids.append(int(r['purchase_id'][0]))

            if len(pids):
                f=["id","name","date_order", "partner_id", "date_planned", "amount_untaxed", "amount_total", "x_reception_status", 'create_uid']

                # Only get orders that need to be treated in Reception
                c = [['id', 'in', pids], ["x_reception_status", "in", [False, 'qty_valid', 'valid_pending', 'br_valid']]]

                orders = api.search_read('purchase.order', c, f)
        except Exception as e:
            coop_logger.error("get_orders : %s", str(e))
        return orders

    def get_order_unprocessable_products(id_po):
        """Return all products that can't be processed in order"""
        return Order(id_po).get_inactive_products()

    def get_order_lines_by_po(id_po, nullQty=False):
        """Return all purchases order lines linked with purchase order id in Odoo."""
        return Order(id_po).get_lines(withNullQty=nullQty)
        
    def get_mail_create_po(id_po):
        """Return name et email from id_po of order"""
        try:
            api = OdooAPI()
            f = ["create_uid"] 
            c = [['id', '=', id_po]]
            
            res = api.search_read('purchase.order', c, f)

            f = ["email", "display_name"]
            c = [['user_ids', '=', int(res[0]['create_uid'][0])]]
            res = api.search_read('res.partner', c, f)


        except Exception as e:
            print(str(e))
        
        return res

    def implies_scale_file_generation(self):
        answer = False
        lines = Order(self.id).get_lines()
        bc_pattern = re.compile('^0493|0499')
        for l in lines:
            if not (bc_pattern.match(str(l['barcode'])) is None):
                answer = True
        # print ('answer=' + str(answer))
        return answer

    def update_line(self, idOnLine, updateType, pakageQty, nbPakage, uPrice):
        """Update purchase.order.line with qty data and/or price"""
        result = None
        try:
            f = {}

            if updateType == "qty_valid" or updateType == "br_valid":
                f['package_qty'] = pakageQty
                f['product_qty_package'] = nbPakage
                f['product_qty'] = pakageQty * nbPakage

            if updateType == "br_valid":
                f['price_unit'] = uPrice


            res = self.o_api.update('purchase.order.line', idOnLine, f)
            result = True
        except Exception as e:
            coop_logger.error("update_line : %s (fields values = %s, line_id = %s)",str(e), str(f), str(idOnLine))
            result = False
        return result

    def remove_package_restriction(self, order_line):
        """Set indicative_package to True"""
        f = {'indicative_package' : True}
        return self.o_api.update('product.supplierinfo', order_line['ps_info_id'], f)

    def update_order_status(self, id_po, updateType):
        """Update purchase.order with new reception status """
        f = {'x_reception_status':updateType}

        res = self.o_api.update('purchase.order', int(id_po), f)
        return res

    def attach_file(self, fileName, removeFile = True):
        """
        Attach file to purshase order.
        By default, remove entry file after operation.
        """
        return Order(self.id).attach_file(fileName, removeFile)


    def make_immediate_transfer(self, pack_operation_ids):
        """
            Pack operations have been created when order has been changed from draft to 'purchase'
            Qty have to be changed to fit with the actual received one
        """
        import json
        processed_lines = 0
        order_lines = CagetteReception.get_order_lines_by_po(self.id, nullQty=True)
        received_products = {}
        for p in order_lines:
            received_products[p['product_id'][0]] = p['product_qty']
        packs = self.o_api.search_read('stock.pack.operation',[['id','in', pack_operation_ids]],['product_qty','product_id','linked_move_operation_ids'])
        if packs:
            for pack in packs:
                try:
                    if len(pack['linked_move_operation_ids']) == 1:
                        received_qty = 0
                        if pack['product_id'][0] in received_products:
                            received_qty = received_products[pack['product_id'][0]]
                            # First of all, change stock.move quantities to prevent missing quantities
                            pfields = {'product_qty_package': 1,
                                       'package_qty': received_qty,
                                      }
                            linked_move_op_id = int(pack['linked_move_operation_ids'][0])
                            mol_cond = [['id','=', linked_move_op_id]]
                            mol_f = ['move_id']
                            move_op_link = self.o_api.search_read('stock.move.operation.link', mol_cond, mol_f)
                            move_id = int(move_op_link[0]['move_id'][0])
                            self.o_api.update('stock.move.operation.link', [linked_move_op_id], {'qty': received_products[pack['product_id'][0]]})
                            pfields['product_uom_qty'] = received_qty
                            self.o_api.update('stock.move', [move_id], pfields)
                            del pfields['product_uom_qty']  # field not in stock.pack.operation
                            pfields['qty_done'] = pfields['product_qty'] = received_qty
                            self.o_api.update('stock.pack.operation', [int(pack['id'])], pfields)
                        processed_lines += 1
                    else:
                        # More than 1 move have been created : Attach a message to PO to advise
                        msg = 'Transfert non réalisé car le nombre de "linked_move_operation_ids" est > 1'
                        Order(self.id).attach_message(msg)
                except Exception as e:
                    print (str(e))
                    # link a message to PO to advise
                    msg = 'Transfert non réalisé : erreur sur produit ' + str(pack['product_id'])
                    msg += ' ' + str(e)
                    Order(self.id).attach_message(msg)

        return  processed_lines


    def update_products_price(self):
        processed = 0
        errors = []
        order_lines = CagetteReception.get_order_lines_by_po(self.id)
        if order_lines and len(order_lines) > 0:
            # Exceptions are due to the fact API returns None whereas the action is really done !...
            marshal_none_error = 'cannot marshal None unless allow_none is enabled'
            processed = 0
            for line in order_lines:
                try:
                    self.o_api.execute('purchase.order.line','update_po_price_to_vendor_price',[int(line['id'])])
                    processed += 1
                except Exception as e:
                    if not (marshal_none_error in str(e)):
                        errors.append(str(e))
                    else:
                        processed += 1
        if processed == len(order_lines):
            success = True
        else:
            success = False
        return {'errors': errors, 'processed': processed, 'success': success}


    def finalyze_picking(self):
        """stock_picking is created to make,
           stock immediate transfer is done,
           products are updated with new vendor prices"""
        result = None

        res = self.o_api.execute('purchase.order', 'action_view_picking', [self.id])
        new_x_reception_status = ''
        if res:
            sp = self.o_api.search_read('stock.picking',[['id','=', int(res['res_id'])]],['pack_operation_ids','state'],1)
            if sp:
                if sp[0]['state'] == 'assigned':
                    pack_operation_ids = sp[0]['pack_operation_ids']
                    cpt = self.make_immediate_transfer(pack_operation_ids)
                    if cpt == len(pack_operation_ids):
                        try:
                            self.o_api.execute('stock.picking','do_transfer', [int(sp[0]['id'])])
                            result = 'processed'
                        except:
                            result = 'error: transfer'
                            new_x_reception_status = 'error_transfer'

                    else:
                        result = 'error: pack operations'
                        new_x_reception_status = 'error_pack_op'
                else:
                    result = 'already done'
        else:
            result = 'error: cant access stock picking'
            new_x_reception_status = 'error_picking'
        if result == 'processed':
            price_update = self.update_products_price()
            if price_update['success'] is False:
                result = 'error: price update'
                new_x_reception_status += '/error_uprice'
            if new_x_reception_status == '':
                new_x_reception_status = 'done'
        if result != 'already done':
            self.o_api.update('purchase.order', [self.id], {'x_reception_status': new_x_reception_status})

        return result

    def register_purchase_order_to_finalyze(self):
        try:
            import datetime
            file = open(PO_TO_PROCESS_FILE_PREFIX + '_'+ str(self.id),'w')
            file.close()
            result = True
        except Exception as e:
            result = str(e)
        return result

    def process_enqueued_po_to_finalyze():
        to_process = []
        processed = []
        print_label = False
        for root, dirs, files in os.walk('data'):
            po_to_process_pattern = re.compile('po_to_process_([0-9]+)')
            po_in_process_pattern = re.compile('po_in_process_([0-9]+)')
            in_process_ids = []
            for basename in files:
                in_po_id = po_in_process_pattern.findall(basename)
                if len(in_po_id) > 0:
                    in_process_ids.append(in_po_id[0])
            for basename in files:
                id = po_to_process_pattern.findall(basename)
                if len(id) > 0 and not (id[0] in in_process_ids):
                    file = open('data/po_in_process_' + str(id[0]), 'w')
                    file.close()
                    to_process.append({'file': 'data/' + basename, 'id': str(id[0])})
        if len(to_process) > 0:
            for p in to_process:
                m = CagetteReception(int(p['id']))
                fp = m.finalyze_picking()
                if fp == 'processed':
                    print_label = m.implies_scale_file_generation()
                if fp == 'processed' or fp == 'already done':
                    os.remove(p['file'])
                processed.append({p['id']: fp})
                os.remove('data/po_in_process_' + str(p['id']))
        if print_label is True:
            import requests
            requests.get(settings.TOOLS_SERVER + '/products/labels_appli_csv')
        return [to_process, processed]
