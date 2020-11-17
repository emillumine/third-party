from django.db import models
from django.conf import settings
from outils.common import OdooAPI
from outils.common import CouchDB

import datetime


class CagetteEnvelops(models.Model):
    """Class to manage operations on envelops"""

    def __init__(self):
        """Init with odoo id."""
        self.o_api = OdooAPI()
        self.c_db = CouchDB(arg_db='envelops')
        for pm in settings.SUBSCRIPTION_PAYMENT_MEANINGS:
            if pm['code'] == 'cash':
                self.cash_code = pm['journal_id']
            elif pm['code'] == 'ch':
                self.check_code = pm['journal_id']
            elif pm['code'] == 'cb':
                self.cb_code = pm['journal_id']
            elif pm['code'] == 'vir':
                self.vir_code = pm['journal_id']

    def get_all(self):
        envelops = []
        alldocs = self.c_db.getAllDocs()
        if len(alldocs) > 0:
            for e in alldocs:
                if 'type' in e:
                    envelops.append(e)
        return envelops

    def get_ids_in_all(self):
        ids = []
        envelops = self.get_all()
        if len(envelops) > 0:
            for e in envelops:
                for key, val in e['envelop_content'].items():
                    if not (key in ids):
                        ids.append(key)
        return ids

    def save_payment(self, data):
        """Save a partner payment"""
        res = {
            "done": False
        }

        try:
            # Get invoice
            cond = [['partner_id', '=', data['partner_id']]]
            fields = ['id', 'name', 'number', 'partner_id', 'residual_signed']
            invoice_res = self.o_api.search_read('account.invoice', cond, fields)

            # Check if invoice exists
            if len(invoice_res) > 0:
                invoice = invoice_res[0]
            else:
                res['error'] = 'No invoice found for this partner, can\'t create payment.'
                return res

            # Set payment type
            if data['type'] == "cash":
                payment_type_code = self.cash_code
            elif data['type'] == "ch":
                payment_type_code = self.check_code
            elif data['type'] == "cb":
                payment_type_code = self.cb_code
            elif data['type'] == "vir":
                payment_type_code = self.vir_code

            args = {
                "writeoff_account_id": False,
                "payment_difference_handling": "open",
                "payment_date": datetime.date.today().strftime("%Y-%m-%d"),
                "currency_id": 1,
                "amount": data['amount'],
                "payment_method_id": 1,
                "journal_id": payment_type_code,
                "partner_id": data['partner_id'],
                "partner_type": "customer",
                "payment_type": "inbound",
                "communication": invoice['number'],
                "invoice_ids": [(4, invoice['id'])]
            }

            payment_id = self.o_api.create('account.payment', args)

            # Exception rises when odoo method returns nothing
            marshal_none_error = 'cannot marshal None unless allow_none is enabled'
            try:
                # Second operation to complete payment registration
                self.o_api.execute('account.payment', 'post', [payment_id])
            except Exception as e:
                if not (marshal_none_error in str(e)):
                    res['error'] = repr(e)

            if not ('error' in res):
                try:
                    if int(float(data['amount']) * 100) == int(float(invoice['residual_signed']) * 100):
                        # This payment is what it was left to pay, so change invoice state
                        self.o_api.update('account.invoice', [invoice['id']], {'state': 'paid'})
                except Exception as e:
                    res['error'] = repr(e)

        except Exception as e:
            res['error'] = repr(e)

        if not ('error' in res):

            res['done'] = True
            res['payment_id'] = payment_id

        return res

    def delete_envelop(self, envelop):
        return self.c_db.delete(envelop)

    def generate_envelop_display_id(self):
        """Generate a unique incremental id to display"""
        c_db = CouchDB(arg_db='envelops')
        display_id = 0
        # Get last created envelop: the one with the highest display_id
        envelops = c_db.getAllDocs(descending=True)
        if envelops:
            last_env = envelops[0]
            if 'display_id' in last_env:
                try:
                    if int(last_env['display_id']) > display_id:
                        display_id = int(last_env['display_id'])
                except:
                    pass

        display_id += 1
        return display_id

    @staticmethod
    def create_or_update_envelops(payment_data):
        """Create or update one or multiple envelops according to member payment data"""
        c_db = CouchDB(arg_db='envelops')
        m = CagetteEnvelops()
        answer = None

        doc = {
            'type' : payment_data['payment_meaning'],
            'creation_date' : datetime.date.today().strftime("%Y-%m-%d"),
            'envelop_content': {
                payment_data['partner_id'] : {
                    'partner_name' : payment_data['partner_name']
                }
            }
        }

        # Create or update today's envelop when payment is cash
        if payment_data['payment_meaning'] == 'cash':
            # Generate envelop id
            today = datetime.date.today()
            envelop_id = 'cash_' + str(today.year) + '_' + str(today.month) + '_' + str(today.day)

            try:
                doc = c_db.getDocById(envelop_id)   #today's envelop already exists

                doc['envelop_content'][payment_data['partner_id']] = {
                    'partner_name': payment_data['partner_name'],
                    'amount': int(payment_data['shares_euros'])
                }

                answer = c_db.dbc.update([doc])
            except:     #doesn't exist, create today's envelop
                doc['_id'] = envelop_id
                doc['envelop_content'][payment_data['partner_id']]['amount'] = int(payment_data['shares_euros'])

                doc.pop('_rev', None)
                answer = c_db.dbc.save(doc)

        # When payment by check
        else:
            # Get the oldest check envelops, limited by the number of checks
            docs = []
            for item in c_db.dbc.view('index/by_type', key='ch', include_docs=True, limit=payment_data['checks_nb']):
                docs.append(item.doc)

            # If only 1 check to save
            if int(payment_data['checks_nb']) == 1:
                # No existing envelop, create one
                if len(docs) == 0:
                    doc['_id'] = 'ch_' + str(datetime.datetime.now().timestamp())
                    doc['display_id'] = m.generate_envelop_display_id()
                    doc['envelop_content'][payment_data['partner_id']]['amount'] = int(payment_data['shares_euros'])

                    doc.pop('_rev', None)
                    answer = c_db.dbc.save(doc)

                # Update existing envelop
                else:
                    docs[0]['envelop_content'][payment_data['partner_id']] = doc['envelop_content'][payment_data['partner_id']]
                    docs[0]['envelop_content'][payment_data['partner_id']]['amount'] = int(payment_data['shares_euros'])

                    answer = c_db.dbc.update(docs)

            # If more than 1 check
            else:
                checks_cpt = 0
                # Put the first checks in the first existing envelops
                for item in docs:
                    item['envelop_content'][payment_data['partner_id']] = doc['envelop_content'][payment_data['partner_id']]
                    item['envelop_content'][payment_data['partner_id']]['amount'] = payment_data['checks'][checks_cpt]

                    checks_cpt += 1

                    answer = c_db.dbc.update([item])

                # If there is no existing envelop for the reminding checks, create them
                env_display_id = m.generate_envelop_display_id()
                for i in range(checks_cpt, int(payment_data['checks_nb'])):    # rangeMAX excluded -> no loop if no remaining checks
                    doc['_id'] = 'ch_' + str(datetime.datetime.now().timestamp() + i)
                    doc['display_id'] = env_display_id
                    doc['envelop_content'][payment_data['partner_id']]['amount'] = payment_data['checks'][checks_cpt]

                    doc.pop('_rev', None)  # For some reason, the _rev of the previously created doc is stored and set to the next new doc
                    answer = c_db.dbc.save(doc)

                    checks_cpt += 1
                    env_display_id += 1

        return answer
