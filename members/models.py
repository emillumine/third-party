"""Members modelsmain page."""
from django.db import models
from outils.common_imports import *
from outils.images_imports import *

from outils.common import OdooAPI
from outils.common import CouchDB
from products.models import OFF
from envelops.models import CagetteEnvelops

import sys
import pytz
import locale
import re
import dateutil.parser
from datetime import date



FUNDRAISING_CAT_ID = {'A': 1, 'B': 2, 'C': 3}

class CagetteMember(models.Model):
    """Class to handle cagette Odoo member."""
    m_default_fields = ['name', 'parent_name', 'sex', 'image_medium', 'active',
                        'barcode_base', 'barcode', 'shift_type',
                        'is_associated_people', 'is_member', 'shift_type',
                        'display_ftop_points', 'display_std_points',
                        'is_exempted', 'cooperative_state', 'date_alert_stop']

    m_short_default_fields = ['name', 'barcode_base']

    def __init__(self, id):
        """Init with odoo id."""
        self.id = int(id)
        self.o_api = OdooAPI()

    def update_from_ajax(self, request):
        result = {}
        try:
            fields = {}
            for key, value in request.POST.items():
                fields[key] = value
            result['update'] = self.o_api.update('res.partner', [self.id], fields)
        except Exception as e:
            result['error'] = str(e)
        return result

    def set_odoo_image(self, image):
        """Record base64 image associated to member."""
        api = OdooAPI()
        f = {'image': image}
        return api.update('res.partner', [self.id], f)

    def attach_message(self, body):
        params = {'message_type': 'comment', 'subtype': 'mail.mt_comment', 'body': body}
        return self.o_api.execute('res.partner', 'message_post', [self.id], params)

    def get_image(self):
        image = ''
        cond = [['id', '=', self.id]]
        fields = ['image_medium']
        res = self.o_api.search_read('res.partner', cond, fields)
        if res and len(res) == 1:
            image = res[0]['image_medium']
        return image

    def get_member_points(self, shift_type):
        points_field = 'final_standard_point' if shift_type == "standard" else 'final_ftop_point'

        cond = [['id', '=', self.id]]
        fields = ['id', points_field]
        res = self.o_api.search_read('res.partner', cond, fields)

        if res and len(res) == 1:
            return res[0][points_field]
        else:
            return None

    def update_member_points(self, data):
        """
            ex:
            data = {
                'name': reason,
                'shift_id': False,
                'type': stype,
                'partner_id': self.id,
                'point_qty': pts
            }
        """

        try:
            return self.o_api.create('shift.counter.event', data)
        except Exception as e:
            print(str(e))


# # # BDM
    def save_partner_info(self, partner_id, fieldsDatas):
        return self.o_api.update('res.partner', partner_id,  fieldsDatas)


    @staticmethod
    def retrieve_data_according_keys(keys, full=False):
        api = OdooAPI()
        cond = []
        for k in keys:
            cond.append([k, '=', keys[k]])
        if full is True:
            fields = ['image_medium', 'barcode_base', 'barcode', 'create_date',
                      'cooperative_state', 'name', 'birthdate', 'street', 'street2',
                      'zip', 'city', 'email', 'mobile', 'phone', 'total_partner_owned_share',
                      'amount_subscription', 'active_tmpl_reg_line_count', 'is_exempted',
                      'shift_type', 'current_template_name',
                      'final_standard_point', 'final_ftop_point',
                      'date_alert_stop','date_delay_stop', 'sex']
        else:
            fields = ['name', 'email', 'birthdate',
                      'sex', 'country_id', 'total_partner_owned_share',
                      'barcode_base', 'tmpl_reg_line_ids']
        return api.search_read('res.partner', cond, fields, 1, 0,
                                     'id DESC')

    @staticmethod
    def get_credentials(request):
        import hashlib

        data = {}

        login = request.POST.get('login')
        password = request.POST.get('password')
        fp = request.POST.get('fp') #  fingerprint (prevent using stolen cookies)
        if login and password:
            api = OdooAPI()
            login = login.strip()
            cond = [['email', '=', login]]
            if getattr(settings, 'ALLOW_NON_MEMBER_TO_CONNECT', False) is False:
                cond.append('|')
                cond.append(['is_member', '=', True])
                cond.append(['is_associated_people', '=', True])

            fields = ['name', 'email', 'birthdate', 'create_date', 'cooperative_state', 'is_associated_people']
            res = api.search_read('res.partner', cond, fields)
            if (res and len(res) >= 1):
                coop_id = None
                for item in res:
                    coop = item
                    if item["birthdate"] is not False:
                        coop_birthdate = item['birthdate']
                        coop_state = item['cooperative_state']
                    if item["is_associated_people"] == True:
                        coop_id = item['id']

                y, m, d = coop_birthdate.split('-')
                password = password.replace('/', '')
                if (password == d + m + y):
                    if coop_id is None:
                        coop_id = coop['id']
                    data['id'] = coop_id
                    auth_token_seed = fp + coop['create_date']
                    data['auth_token'] = hashlib.sha256(auth_token_seed.encode('utf-8')).hexdigest()
                    data['token'] = hashlib.sha256(coop['create_date'].encode('utf-8')).hexdigest()
                    data['coop_state'] = coop_state

                if not ('auth_token' in data):
                    data['failure'] = True
                    data['msg'] = "Erreur dans le mail ou le mot de passe"
                    data['errnum'] = 1
            else:
                data['failure'] = True
                data['msg'] = "Erreur dans le mail ou le mot de passe"
                data['errnum'] = 2
                #  data['res'] = res

        elif 'token' in request.COOKIES and 'id' in request.COOKIES:
            api = OdooAPI()
            cond = [['id', '=', request.COOKIES['id']]]
            fields = ['create_date','email']
            res = api.search_read('res.partner', cond, fields)
            if (res and len(res) == 1):
                login = res[0]['email']
                calc_token = hashlib.sha256(res[0]['create_date'].encode('utf-8')).hexdigest()
                if calc_token == request.COOKIES['token']:
                    data['success'] = True
                else:
                    data['failure'] = True
                    data['errnum'] = 3
        else:
            data['failure'] = True
        if not ('failure' in data):
            data['login'] = login
            c_db_data = CagetteMember.get_couchdb_data(login)
            if len(c_db_data) > 0 and 'validation_state' in c_db_data:
                data['validation_state'] = c_db_data['validation_state']
        #  print(str(data))
        return data

    @staticmethod
    def send_new_password_link(request):
        result = {}
        email = request.POST.get('email')
        if len(email) > 5 and '@' in email:
            api = OdooAPI()
            cond = [['email', '=', email]]
            fields = ['create_date']
            res = api.search_read('res.partner', cond, fields)
            if (res and len(res) == 1):

                result['msg'] = 'Trouvé ' + str(res[0]['create_date'])
        else:
            result['error'] = 'Email non valide'

        return result

    def get_data(self, full=False):
        """Get member data using Odoo API."""
        return CagetteMember.retrieve_data_according_keys({'id':self.id}, full)

    @staticmethod
    def standalone_create_envelops(request):
        res = {}
        fields = {'checks': []}
        try:
            checks = request.POST.getlist("checks[]")
            if len(checks) > 0:
                for c in checks:
                    fields['checks'].append(int(c))
            for key, value in request.POST.items():
                if key != "checks[]":
                    fields[key] = value
            res = CagetteEnvelops().create_or_update_envelops(fields)
        except Exception as e:
            res['error'] = str(e)
        return res

    def add_pts(self, stype, pts, reason):
        fields = {'name': reason,
                  'shift_id': False,
                  'type': stype,
                  'partner_id': self.id,
                  'point_qty': pts
                 }
        return self.o_api.create('shift.counter.event', fields)

    def add_first_point(self, stype):
        """To prevent members to have -1 point if service is too close to subscription"""
        ltype = 'standard'
        if (stype == 2):
            ltype = 'ftop'
        self.add_pts(ltype, 1, 'Point de bienvenue')

    def generate_barcode(self):
        return self.o_api.execute('res.partner', 'generate_barcode', [self.id])

    def generate_base_and_barcode(self, data=None):
        """Call Odoo methods to generate base and barcode numbers."""
        res1 = res2 = 0
        try:
            if hasattr(settings, 'SUBSCRIPTION_INPUT_BARCODE') and not (data is None):
                # Below code no more useful since LGDS use random barcode
                # import re
                # p = '0420(......)00.'
                # exp = re.compile(p)
                # match = exp.match(data['m_barcode'])
                # base = int(match.group(1))
                f = {'barcode': data['m_barcode']}
                res1 = self.o_api.execute('res.partner', 'generate_base', [self.id])
                res2 = self.o_api.update('res.partner', [self.id], f)

            else:
                res1 = self.o_api.execute('res.partner', 'generate_base', [self.id])
                res2 = self.generate_barcode()
        except Exception as e:
            print(str(e))
        return (res1 and res2)

    def create_capital_subscription_invoice(self, amount, date):
        """Make CapitalFundraisingWizard entities creation."""
        api = OdooAPI()
        f1 = {'type': 'out_invoice',
              'date_invoice': date,
              'journal_id': settings.CAP_JOURNAL_ID,
              'account_id': settings.CAP_APPELE_NON_VERSE_ACCOUNT_ID,
              # 'payment_term_id':
              'partner_id': self.id,
              'is_capital_fundraising': True,
              'fundraising_category_id': settings.FUNDRAISING_CAT_ID,
              'state': 'open'
              }
        invoice_id = api.create('account.invoice', f1)
        f2 = {'invoice_id': invoice_id,
              'uom_id': settings.UNITE_UOM_ID,
              'product_id': settings.PARTS_A_PRODUCT_ID,
              'price_unit': settings.PARTS_A_PRICE_UNIT,
              'name': 'Parts A',
              'quantity': int(int(amount) / settings.PARTS_A_PRICE_UNIT),
              'account_id': settings.CAP_INVOICE_LINE_ACCOUNT_ID
              }
        invoice_line_id = api.create('account.invoice.line', f2)
        api.execute('account.invoice',
                    'action_move_create',
                    [invoice_id])
        api.execute('account.invoice',
                    'assign_ownshare_to_invoice',
                    [invoice_id])
        return [invoice_id, invoice_line_id]

    def create_coop_shift_subscription(self, shift_t_id, stype):
        """Store coop shift subscription."""
        # Get shift template ticket corresponding to given shift temp. id
        sti = None
        shift_type = 'standard'
        if stype == 2:
            shift_type = 'ftop'
        cond = [['shift_template_id', '=', int(shift_t_id)],
                ['shift_type', '=', shift_type]]
        fields = ['seats_reserved', 'seats_max']
        stt = self.o_api.search_read('shift.template.ticket', cond, fields)
        if len(stt) > 0:
            sti = stt[0]['id']  # shift_ticket_id
            seats_reserved = int(stt[0]['seats_reserved'])
            seats_max = int(stt[0]['seats_max'])
            # if (seats_reserved == seats_max):
            # TODO
        if not (sti is None):
            try:
                today = datetime.date.today().strftime("%Y-%m-%d")
                st_r_fields = {'partner_id': self.id,
                               'shift_template_id': int(shift_t_id),
                               'shift_ticket_id': int(sti),
                               'state': 'open',
                               'date_begin': today
                               }
                st_r_id = self.o_api.create('shift.template.registration',
                                            st_r_fields)
            except:
                st_r_id = None

        return st_r_id

    @staticmethod
    def exists(mail):
        api = OdooAPI()
        cond = [['email', 'ilike', str(mail)]]
        fields = ['email']
        res = api.search_read('res.partner', cond, fields, 1, 0, 'id DESC')
        if (res and len(res) == 1):
            answer = True
        else:
            answer = False
        return answer

    @staticmethod
    def is_associated(id_parent):
        api = OdooAPI()
        cond = [['parent_id', '=', int(id_parent)]]
        fields = ['id','name','parent_id','birthdate']
        res = api.search_read('res.partner', cond, fields, 10, 0, 'id DESC')
        already_have_adult_associated = False
        for partner in res:
            birthdate = partner['birthdate']
            if(birthdate):
                today = date.today()
                date1 = datetime.datetime.strptime(birthdate, "%Y-%m-%d")
                age = today.year - date1.year - ((today.month, today.day) < (date1.month, date1.day))
                if age > 17 :
                    already_have_adult_associated = True
        return already_have_adult_associated

    @staticmethod
    def finalize_coop_creation(post_data):
        """ Update coop data. """
        res = {}
        # First, update couchdb data
        c_db = CouchDB(arg_db='member')
        shift_template = json.loads(post_data['shift_template'])
        received_data = {'birthdate': post_data['birthdate'],
                         'city': post_data['city'],
                         'zip': post_data['zip'],
                         'firstname': post_data['firstname'],
                         'lastname': post_data['lastname'],
                         'odoo_id': post_data['odoo_id'],
                         'address': post_data['address'],
                         'mobile': post_data['mobile'],
                         'country': post_data['country'],
                         'validation_state': 'done'
                         }
        if ('sex' in post_data):
            received_data['sex'] = post_data['sex']
        if 'street2' in post_data:
            received_data['street2'] = post_data['street2']
        if 'phone' in post_data:
            received_data['phone'] = format_phone_number(post_data['phone'])
        r = c_db.updateDoc(received_data, 'odoo_id')
        if r:
            if ('odoo_id' in r):
                try:
                    # Update res.partner with received data
                    partner_id = CagetteMember.create_from_buffered_data(received_data)

                except Exception as e:
                    res['error'] = 'Erreur maj membre dans Odoo'
                    coop_logger.error("Pb avec couchDB (1): %s \n %s", str(received_data), str(e))
        else:
            res['error'] = 'Pb avec couchDB'
            coop_logger.error("Pb avec couchDB (B): %s", str(received_data))
        return res

    @staticmethod
    def latest_coop_id():
        """Return the last barcode base recorded in Odoo database."""
        api = OdooAPI()
        cond = [['is_member', '=', True],
                ['total_partner_owned_share', '>', 0]]
        fields = ['barcode_base']
        return api.search_read('res.partner', cond, fields, 1, 0, 'id DESC')

    @staticmethod
    def create_from_buffered_data(post_data):
        """
            Create member or update its data in odoo and return its partner_id.
            At creation:
             Capital subscription and shift subscription will be stored!
             Fill accounting envelops with payment data.
             Send welcome mail for new members.

        """
        # WARNING : Very sensitive data
        #           Very touching step :
        #           couchdb data should reflect Odoo state
        res = {}
        api = OdooAPI()
        c_db = CouchDB(arg_db='member')
        partner_id = None
        name_sep = getattr(settings, 'SUBSCRIPTION_NAME_SEP', ' ')
        ask_4_sex = getattr(settings, 'SUBSCRIPTION_ASK_FOR_SEX', False)
        concat_order = getattr(settings, 'CONCAT_NAME_ORDER', 'FL')
        sex = 'o'

        if ask_4_sex is True:
            sex = post_data['sex']

        # With input type="date", transmitted value is YYYY-mm-dd
        # But, it could be dd/mm/YYYY if not supported by browser
        well_formatted_dob = True
        birthdate = post_data['birthdate']
        try:
            i = birthdate.index('/')
            b_elts = birthdate.split('/')
            birthdate = b_elts[2] + '-' + b_elts[1] + '-' + b_elts[0]
        except:
            # Birthdate should be '-' separated values
            try:
                i = birthdate.index('-')
            except:
                well_formatted_dob = False

        if (well_formatted_dob is True):
            # Prepare data for odoo
            if concat_order == 'LF':
                name = post_data['lastname'] + name_sep + post_data['firstname']
            else:
                name = post_data['firstname'] + name_sep + post_data['lastname']
            f = {'name': name,
                 'birthdate': birthdate,
                 'sex': sex,
                 'street': post_data['address'],
                 'zip': post_data['zip'],
                 'city': post_data['city'],
                 'phone': format_phone_number(post_data['mobile']), # Because list view default show Phone and people mainly gives mobile
                 'barcode_rule_id': settings.COOP_BARCODE_RULE_ID
                 }
            if ('_id' in post_data):
                f['email'] = post_data['_id']
            if ('country' in post_data):
                if (post_data['country'].lower() == 'france' or
                   post_data['country'] == ''):
                    f['country_id'] = 76
            if 'street2' in post_data:
                f['street2'] = post_data['street2']
            if ('phone' in post_data) and len(post_data['phone']) > 0:
                if len(f['phone']) == 0:
                    f['phone'] = format_phone_number(post_data['phone'])
                else:
                    f['mobile'] = f['phone']
                    f['phone'] = format_phone_number(post_data['phone'])

            # Create coop
            if not ('odoo_id' in post_data):
                partner_id = api.create('res.partner', f)
                try:
                    id = int(partner_id)
                except:
                    id = 0
                if (id > 0):    # Coop succesfuly created
                    # Update couchdb (rest of data updated on client side)
                    update_data = {'_id': post_data['_id'],
                                   'email': post_data['_id'],
                                   'odoo_id': id}

                    r = c_db.updateDoc(update_data, '_id')
                    if r:
                        # Check if we proceed to capital subscription
                        m = CagetteMember(partner_id)
                        owned_share = 0
                        existing_data = m.get_data()

                        if (len(existing_data) > 0):
                            owned_share = existing_data[0]['total_partner_owned_share']

                        if (owned_share > 0):
                            # form has already been submitted
                            # Subscription, shift and payment data won't be saved
                            res['subs'] = [-1, -1]
                            res['bc'] = False
                            res['shift'] = None
                            res['envelop'] = None
                        else:
                            # New member
                            # Create capital subscription, base & barcode
                            today = datetime.date.today().strftime("%Y-%m-%d")
                            res['subs'] = \
                                m.create_capital_subscription_invoice(post_data['shares_euros'], today)
                            res['bc'] = m.generate_base_and_barcode(post_data)

                            # if the new member is associated with an already existing member 
                            # then we put the state in "associated" and we create the "associated" member
                            if 'is_associated_people' in post_data and 'parent_id' in post_data :
                                fields = {}
                                fields['cooperative_state'] = 'associated'
                                api.update('res.partner', [partner_id], fields)
                                associated_member = {
                                    'email': post_data['_id'],
                                    'name': name,
                                    'birthdate': birthdate,
                                    'sex': sex,
                                    'street': post_data['address'],
                                    'zip': post_data['zip'],
                                    'city': post_data['city'],
                                    'phone': format_phone_number(post_data['mobile']), # Because list view default show Phone and people mainly gives mobile
                                    'barcode_rule_id': settings.COOP_BARCODE_RULE_ID,
                                    'parent_id' : post_data['parent_id'],
                                    'is_associated_people': True
                                    }
                                associated_member_id = api.create('res.partner', associated_member)
                            # If it's an new associated member with a new partner. Link will be made by the user in BDM/admin
                            # We add the associated member to the "associate" shift template so we can find them in Odoo
                            elif 'is_associated_people' not in post_data or 'is_associated_people' in post_data and 'parent_id' not in post_data:
                                # Create shift suscription if is not associated
                                shift_template = json.loads(post_data['shift_template'])
                                shift_t_id = shift_template['data']['id']
                                stype = shift_template['data']['type']
                                res['shift'] = \
                                    m.create_coop_shift_subscription(shift_t_id, stype)
                                # m.add_first_point(stype) # Not needed anymore

                            # Update couchdb do with new data
                            try:
                                updated_data = m.get_data()
                                update_data['barcode_base'] = updated_data[0]['barcode_base']
                                res['bc'] = update_data['barcode_base']
                                update_data['odoo_state'] = 'done'
                                c_db.updateDoc(update_data, '_id')
                            except Exception as e:
                                res['error'] = 'Erreur après souscription du capital'
                                coop_logger.error("Erreur après souscription : %s \n %s", str(res), str(e))


                            # Create or update envelop(s) with coop payment data
                            payment_data = {
                                'partner_id': partner_id,
                                'partner_name': post_data['firstname'] + ' ' + post_data['lastname'],
                                'payment_meaning': post_data['payment_meaning'],
                                'shares_euros': post_data['shares_euros'],
                                'checks_nb': post_data['checks_nb']     # is 0 if payment is cash
                            }

                            if ('checks' in post_data):
                                payment_data['checks'] = json.loads(post_data['checks'])
                            else:
                                payment_data['checks'] = []

                            if payment_data['payment_meaning'] == 'cash' or payment_data['payment_meaning'] == 'ch':
                                res['envelop'] = CagetteEnvelops().create_or_update_envelops(payment_data)
                            else:
                                p_data = {'partner_id': partner_id, 'type': payment_data['payment_meaning'], 'amount': post_data['shares_euros']}
                                res['envelop'] = CagetteEnvelops().save_payment(p_data)

                        # Send welcome mail
                        try:
                            api.execute('res.partner', 'send_welcome_email', [partner_id])
                        except Exception as e:
                            res['error'] = 'Erreur envoie mail invitation'
                        # from outils.common import CagetteMail
                        # try:
                        #     CagetteMail.sendWelcome(f['email'])
                        # except Exception as e:
                        #     res['error'] = 'Erreur envoie mail invitation'
                    else:
                        res['error'] = 'Pb avec couchDB'
                        res['data'] = update_data
                        coop_logger.error("Pb couchDB (C) : %s", str(res))
                else:
                    res['error'] = 'Erreur creation membre odoo'
                    coop_logger.error("Pb couchDB (D) : %s", str(res))
            # Update coop data
            else:
                odoo_id = int(post_data['odoo_id'])
                if (api.update('res.partner', [odoo_id], f) is True):
                    partner_id = odoo_id

        return partner_id

    @staticmethod
    def create_from_cvs_row(data):
        """
            Create member or update its data in odoo and return its partner_id.
            At creation:
             Capital subscription
        """
        res = {}
        api = OdooAPI()
        partner_id = None

        well_formatted_dob = True
        birthdate = data['date de naissance']
        try:
            i = birthdate.index('/')
            b_elts = birthdate.split('/')
            birthdate = b_elts[2] + '-' + b_elts[1] + '-' + b_elts[0]
        except:
            # Birthdate should be '-' separated values
            try:
                i = birthdate.index('-')
            except:
                well_formatted_dob = False

        if (well_formatted_dob is True):
            # Prepare data for odoo
            f = {'name': data['Prénom'] + ' ' + data['Nom'],
                 'birthdate': birthdate,
                 'sex': 'o',
                 'street': data['adresse rue'],
                 'zip': data['code postal'],
                 'city': data['ville'],
                 'country_id': 76,
                 'phone': data['tel'],
                 'email': data['mail'],
                 'barcode_rule_id': settings.COOP_BARCODE_RULE_ID
                 }
            partner_id = api.create('res.partner', f)
            try:
                id = int(partner_id)
            except:
                id = 0
            if (id > 0):    # Coop succesfuly created
                res['id'] = partner_id
                m = CagetteMember(partner_id)
                shares_euros = int(float(data['Nb de parts']) * 10)
                res['subs'] = m.create_capital_subscription_invoice(shares_euros, data['date inscription'])
                res['bc'] = m.generate_base_and_barcode(data)
            else:
                res['error'] = 'Unable to create member from ' + str(data)
        return res

    @staticmethod
    def store_warning_msg(post_data):
        """Store in couchDB database the warning new coop has written."""
        c_db = CouchDB(arg_db='member')
        data = {
            '_id': post_data['_id'],
            'coop_msg': post_data['msg']
        }
        r = c_db.updateDoc(data, '_id')
        return r

    @staticmethod
    def get_couchdb_data(email):
        """Retrieve couchDB data corresponding to given email."""
        c_db = CouchDB(arg_db='member')
        try:
            doc = c_db.getDocById(email)
        except:
            doc = []
        return doc

    @staticmethod
    def get_state_fr(coop_state):
        """Return french version of given coop_state."""
        company = getattr(settings, 'COMPANY_CODE', '')

        if coop_state == 'alert':
            fr_state = 'En alerte'
        elif coop_state == 'delay':
            fr_state = 'Délai accordé'
        elif coop_state == 'suspended':
            if company == 'lacagette':
                fr_state = 'Rattrapage'
            else:
                fr_state = 'Suspendu(e)'
        elif coop_state == 'not_concerned':
            fr_state = 'Non concerné(e)'
        elif coop_state == 'blocked':
            fr_state = 'Bloqué(e)'
        elif coop_state == 'unpayed':
            fr_state = 'Impayé constaté'
        elif coop_state == 'unsubscribed':
            fr_state = 'Désinscrit(e)'
        elif coop_state == 'up_to_date':
            fr_state = 'A jour'
        elif coop_state == 'exempted':
            fr_state = 'Exempté(e)'
        else:
            fr_state = 'Inconnu'
        return fr_state

    @staticmethod
    def get_members_next_shift(ids):
        """Retrieve next shift for given members ids."""
        api = OdooAPI()
        cond = [['partner_id', 'in', ids],
                ['date_begin', '>=', datetime.datetime.now().isoformat()],
                ['state', '=', 'open']]
        fields = ['shift_type', 'date_begin', 'partner_id', 'date_end', 'shift_ticket_id']

        res = api.search_read('shift.registration', cond, fields, 2500, 0, 'date_begin ASC')
        shifts = {}
        locale.setlocale(locale.LC_ALL, 'fr_FR.utf8')

        if len(res) > 0:
            local_tz = pytz.timezone('Europe/Paris')
            for s in res:
                date, t = s['date_begin'].split(' ')
                year, month, day = date.split('-')
                hour, minute, second = t.split(':')
                if int(hour) < 21:
                    start = datetime.datetime(int(year), int(month), int(day), int(hour), int(minute), int(second), tzinfo=pytz.utc)
                    start_date = start.astimezone(local_tz)
                    s['start'] = start_date.strftime("%A %d %B %Y à %Hh%M")
                    if not (s['partner_id'][0] in shifts):
                        shifts[s['partner_id'][0]] = []
                    shifts[s['partner_id'][0]].append(s)

        return shifts

    @staticmethod
    def add_next_shifts_to_members(members):
        """Next shifts are added to members data."""
        ids = []
        m_list = []
        for m in members:
            ids.append(m['id'])

        shifts = CagetteMember.get_members_next_shift(ids)

        for m in members:
            s = []
            if m['id'] in shifts:
                s = shifts[m['id']]
            m['shifts'] = s
            m_list.append(m)
        return m_list

    @staticmethod
    def search(k_type, key, shift_id=None, search_type="full"):
        """Search member according 3 types of key."""
        api = OdooAPI()
        if k_type == 'id':
            cond = [['id', '=', int(key)]]
        elif k_type == 'barcode_base':
            cond = [['barcode_base', '=', str(key)]]
        elif k_type == 'barcode':
            cond = [['barcode', '=', str(key)]]
        else:
            cond = [['name', 'ilike', str(key)]]
        cond.append('|')
        cond.append(['is_member', '=', True])
        if search_type != 'members':
            cond.append(['is_associated_people', '=', True])
        else:
            cond.append(['is_associated_people', '=', False])
        # cond.append(['cooperative_state', '!=', 'unsubscribed'])
        if search_type == "full" or search_type == 'members':
            fields = CagetteMember.m_default_fields
            if not shift_id is None:
                CagetteMember.m_default_fields.append('tmpl_reg_line_ids')
            res = api.search_read('res.partner', cond, fields)
            members = []
            if len(res) > 0:
                for m in res:
                    keep_it = False
                    if not shift_id is None and len(shift_id) > 0:
                        # Only member registred to shift_id will be returned
                        if len(m['tmpl_reg_line_ids']) > 0:
                            cond = [['id', '=', m['tmpl_reg_line_ids'][0]]]
                            fields = ['shift_template_id']
                            shift_templ_res = api.search_read('shift.template.registration.line', cond, fields)
                            if (len(shift_templ_res) > 0
                                and
                                int(shift_templ_res[0]['shift_template_id'][0]) == int(shift_id)):
                                keep_it = True
                    else:
                        keep_it = True
                    if keep_it is True:
                        try:
                            img_code = base64.b64decode(m['image_medium'])
                            extension = imghdr.what('', img_code)
                            m['image_extension'] = extension
                        except Exception as e:
                            coop_logger.info("Img error : %s", e)
                        m['state'] = m['cooperative_state']
                        m['cooperative_state'] = \
                            CagetteMember.get_state_fr(m['cooperative_state'])
                        # member = CagetteMember(m['id'], m['email'])
                        # m['next_shifts'] = member.get_next_shift()
                        if not m['parent_name'] is False:
                            m['name'] += ' (en binôme avec ' + m['parent_name'] + ')'
                            del m['parent_name']
                        members.append(m)

            return CagetteMember.add_next_shifts_to_members(members)
        elif search_type == "shift_template_data":
            fields = CagetteMember.m_short_default_fields
            fields = fields + ['id', 'makeups_to_do', 'cooperative_state']
            res = api.search_read('res.partner', cond, fields)

            if res:
                for partner in res:
                    c = [['partner_id', '=', int(partner['id'])], ['state', 'in', ('draft', 'open')]]
                    f = ['shift_template_id']
                    shift_template_reg = api.search_read('shift.template.registration', c, f)

                    if shift_template_reg:
                        partner['shift_template_id'] = shift_template_reg[0]['shift_template_id']
                    else:
                        partner['shift_template_id'] = None

            return res
        else:
            # TODO differentiate short & subscription_data searches
            fields = CagetteMember.m_short_default_fields
            fields = fields + ['total_partner_owned_share','amount_subscription']
            res = api.search_read('res.partner', cond, fields)
            return res

    @staticmethod
    def remove_data_from_CouchDB(request):
        res = {}
        try:
            email = request.POST.get("email","")
            if len(email) > 0:
                is_connected_user = CagetteUser.are_credentials_ok(request)
                can_be_deleted = False
                coop = CagetteMember.retrieve_data_according_keys({'email':email})
                if len(coop) > 0:
                    coop = coop[0]
                    if (len(coop['tmpl_reg_line_ids']) > 0 and coop['total_partner_owned_share']):
                        #no need to be connected to delete it
                        can_be_deleted = True
                    else:
                        if not is_connected_user:
                            message = 'L\'inscription de ce membre n\'a pas été correctement finalisée, il ne peut être archivé.' + "\n"
                            if len(coop['tmpl_reg_line_ids']) == 0:
                                message += 'Il n\'est inscrit à aucun créneau. Veuillez en ajouter un sur Odoo.'+ "\n"
                            if coop['total_partner_owned_share'] == 0:
                                message += 'Le capital souscrit n\'a pas été enregistré. Veuillez le faire sur Odoo.'
                            res['msg'] = message

                else:
                    if is_connected_user is False:
                        res['msg'] = 'Aucun membre connu avec cet email'

                # if demand comes from a connected user, it can be deleted
                if is_connected_user:
                    can_be_deleted = True
                else:
                    if can_be_deleted is False:
                        res['msg'] = 'Seul un utilisateur connecté peut faire cette suppression'

                if can_be_deleted is True:
                    c_db = CouchDB(arg_db='member')
                    doc = c_db.getDocById(email)    # email is the id for members doc
                    res['action'] = c_db.delete(doc)
            else:
                res['msg'] = 'No email'
        except Exception as e:
            coop_logger.error("Remove data from couchDB : %s", str(e))
            res['msg'] = 'Oups ! Erreur Remove data from couchDB'
        return res

    @staticmethod
    def remove_from_mess_list(request):
        res = {}
        try:
            _id = request.POST.get("id", "")
            c_db = CouchDB(arg_db='member_mess')
            doc = c_db.getDocById(_id)
            res['action'] = c_db.delete(doc)
        except Exception as e:
            res['error'] = str(e)
        return res

    def search_associated_people(self):
        """ Search for an associated partner """
        res = {}

        c = [["parent_id", "=", self.id]]
        f = ["id", "name", "barcode_base"]

        res = self.o_api.search_read('res.partner', c, f)

        try:
            return res[0]
        except:
            return None

    def update_member_makeups(self, member_data):
        api = OdooAPI()
        res = {}

        f = { 'makeups_to_do': int(member_data["target_makeups_nb"]) }
        res_item = api.update('res.partner', [self.id], f)
        res = {
            'mid': self.id,
            'update': res_item
        }

        return res

    def get_member_selected_makeups(self):
        res = {}

        c = [["partner_id", "=", self.id], ["is_makeup", "=", True], ["state", "=", "open"]]
        f=['id']
        res = self.o_api.search_read("shift.registration", c, f)
        return res

    def unsuscribe_member(self):
        res = {}

        now = datetime.datetime.now().isoformat()

        # Get and then delete shift template registration
        c = [['partner_id', '=', self.id]]
        f = ['id']
        res_ids = self.o_api.search_read("shift.template.registration", c, f)
        ids = [d['id'] for d in res_ids]

        if ids:
            res["delete_shift_template_reg"] = self.o_api.execute('shift.template.registration', 'unlink', ids)
        
        # Get and then delete shift registrations
        c = [['partner_id', '=', self.id], ['date_begin', '>', now]]
        f = ['id']
        res_ids = self.o_api.search_read("shift.registration", c, f)
        ids = [d['id'] for d in res_ids]
        
        if ids:
            res["delete_shifts_reg"]  = self.o_api.execute('shift.registration', 'unlink', ids)

        # Close extensions
        c = [['partner_id', '=', self.id], ['date_start', '<=', now], ['date_stop', '>=', now]]
        f = ['id']
        res_ids = self.o_api.search_read("shift.extension", c, f)
        ids = [d['id'] for d in res_ids]
        
        if ids:
            f = {'date_stop': now}
            res["close_extensions"] = self.o_api.update('shift.extension', ids, f)

        return res

    def set_cooperative_state(self, state):
        f = {'cooperative_state': state}
        return self.o_api.update('res.partner', [self.id], f)

    def update_extra_shift_done(self, value):
        api = OdooAPI()
        res = {}

        f = { 'extra_shift_done': value }
        res_item = api.update('res.partner', [self.id], f)
        res = {
            'mid': self.id,
            'update': res_item
        }

        return res

class CagetteMembers(models.Model):
    """Class to manage operations on all members or part of them."""

    @staticmethod
    def get_problematic_members():
        """Search partner with missing elements"""
        api = OdooAPI()
        return []


    @staticmethod
    def raw_search(needle):
        """Search partner with missing elements"""
        res = []
        try:
            api = OdooAPI()
            cond = ['|', ('email', 'ilike', needle), ('display_name', 'ilike', needle)]
            fields = ['barcode_base', 'barcode', 'create_date',
                      'cooperative_state', 'name', 'birthdate', 'street', 'street2',
                      'zip', 'city', 'email', 'mobile', 'phone', 'total_partner_owned_share',
                      'amount_subscription', 'active_tmpl_reg_line_count',
                      'shift_type', 'current_template_name', 'sex']
            api_res = api.search_read('res.partner', cond, fields)
            if api_res:
                ids_in_env = CagetteEnvelops().get_ids_in_all()
                for c in api_res:
                    if not (str(c['id']) in ids_in_env):
                        c['envelops'] = False
                    else:
                        c['envelops'] = True
                res = api_res
        except Exception as e:
            res['error'] = str(e)
        return res

    @staticmethod
    def verify_subscription_state():
        """Verify couchDB and Odoo DB coherence."""
        c_db = CouchDB(arg_db='member')
        # Get all members with unregistrated shifts
        unregistrated_members = c_db.getAllDocs('odoo_state', 'done', False)
        partner_ids = []
        to_modify_in_couchDB = []
        for m in unregistrated_members:
            if 'odoo_id' in m:
                partner_ids.append(int(m['odoo_id']))
        if len(partner_ids) > 0:
            api = OdooAPI()
            cond = [['id', 'in', partner_ids]]
            f = ['total_partner_owned_share', 'name', 'barcode_base', 'tmpl_reg_line_ids']
            res = api.search_read('res.partner', cond, f)
            for p in res:
                if p['total_partner_owned_share'] > 0:
                    to_modify_in_couchDB.append(p)
        if len(to_modify_in_couchDB) > 0:
            for p in to_modify_in_couchDB:
                if len(p['tmpl_reg_line_ids']) > 0:
                    r = {'odoo_id': p['id'], 'odoo_state': 'done', 'barcode_base': p['barcode_base']}
                    c_db.updateDoc(r, 'odoo_id', ['shift_template'])

        return to_modify_in_couchDB

    @staticmethod
    def update_couchdb_barcodes():
        c_db = CouchDB(arg_db='member')
        # Get all members with 'done' state
        all_done = c_db.getAllDocs('odoo_state', 'done')
        partner_ids = []
        to_modify_in_couchDB = []
        for m in all_done:
            partner_ids.append(int(m['odoo_id']))
        if len(partner_ids) > 0:
            api = OdooAPI()
            cond = [['id', 'in', partner_ids]]
            f = ['barcode_base']
            res = api.search_read('res.partner', cond, f)

            for p in res:
                for m in all_done:
                    if (int(m['odoo_id']) == int(p['id'])):
                        try:
                            if int(m['barcode_base']) != int(p['barcode_base']):
                                m['barcode_base'] = p['barcode_base']
                                to_modify_in_couchDB.append(m)
                        except:
                            pass
            if len(to_modify_in_couchDB) > 0:
                for p in to_modify_in_couchDB:
                    r = {'odoo_id': p['odoo_id'],
                         'barcode_base': p['barcode_base']}
                    c_db.updateDoc(r, 'odoo_id')

        return to_modify_in_couchDB

    @staticmethod
    def _generate_inra_csv_data(odoo_result):
        data = {'lines': [], 'sum_up': ''}
        current_p = ''
        try:
            if (('purchases' in odoo_result) and len(odoo_result['purchases']) > 0):
                off = OFF()
                off_products = off.get_products()
                headers = ['date', 'coop_id', 'coop_num', 'coop_naissance', 'coop_ville',
                           'code-barre', 'nom_produit', 'qte', 'prix', 'remise',
                           'categ_id', 'nom_cat_cagette',
                           'off_qte', 'off_cat', 'off_labels',
                           'off_nutriscore', 'off_nova', 'off_nrj_100g',
                           'off_manufacture_places', 'off_origins']
                data['lines'].append(headers)
                coop_nums = []
                products = []
                remises = {}
                ca_ttc_panel = 0
                for p in odoo_result['purchases']:
                    current_p = p
                    if p['product_barcode'] in off_products:
                        off_pdt = off_products[p['product_barcode']]
                    else:
                        off_pdt = {'quantity': '', 'categories': '',
                                   'labels': '', 'nutrition_grade_fr': '', 'nova_group': '', 'energy_100g': '',
                                   'manufacturing_places': '', 'origins': ''}
                    pname = p['product_name'].replace(';', ' ')
                    cat_name = ''
                    if str(p['product_categ_id']) in odoo_result['pcat']:
                        cat_name = odoo_result['pcat'][str(p['product_categ_id'])]
                    line = [p['date_order'], p['coop_id'], p['coop_num'], p['coop_birthdate'], p['coop_city'],
                            p['product_barcode'], pname, p['product_qty'], p['product_price'], p['product_discount'],
                            p['product_categ_id'], cat_name,
                            off_pdt['quantity'], off_pdt['categories'], off_pdt['labels'],
                            off_pdt['nutrition_grade_fr'], off_pdt['nova_group'], off_pdt['energy_100g'],
                            off_pdt['manufacturing_places'], off_pdt['origins']]

                    ca_ttc_line = float(p['product_qty']) * float(p['product_price'])
                    if (int(p['product_discount']) > 0):
                        ca_ttc_line *= (100 - int(p['product_discount'])) / 100
                        if not (p['product_discount'] in remises):
                            remises[p['product_discount']] = 0
                        remises[p['product_discount']] += ca_ttc_line

                    ca_ttc_panel += ca_ttc_line
                    data['lines'].append(line)
                    if not (p['coop_num'] in coop_nums):
                        coop_nums.append(p['coop_num'])
                    if not (p['product_id'] in products):
                        products.append(p['product_id'])

                data['sum_up'] =  'Coopérateurs du panel ayant fait au moins 1 achat : ' + str(len(coop_nums)) + "\n"
                data['sum_up'] += 'Nb de références de produits achetés : ' + str(len(products)) + "\n"
                data['sum_up'] += 'CA TTC réalisé : ' + "{:.2f}".format(ca_ttc_panel) + "\n"
                for pc, val in remises.items():
                    data['sum_up'] += 'dont CA TTC remises ' + str(int(pc)) + '% : ' + "{:.2f}".format(val) + "\n"
        except Exception as e:
            data['error'] = str(e) + ' : produit en cours = ' + str(current_p)
        return data

    @staticmethod
    def get_inra_panel_purchases(request):
        api = OdooAPI()
        list_fpath = 'members/panel.csv'
        res = {'error': ''}
        try:
            nums = []
            with open(list_fpath) as fp:
                line = fp.readline()
                while line:
                    nums.append(line.strip())
                    line = fp.readline()
            if len(nums) > 0:
                params = {'partners_coop_num': nums}
                # num_slice = nums[0:1]
                month = request.POST.get('mois_month')
                year = request.POST.get('mois_year')
                try:
                    m = int(month)
                    y = int(year)
                    if (m < 10):
                        month = '0' + month
                    if (m > 0 and y > 0):
                        params['month'] = year + '-' + month
                    else:
                        today = datetime.date.today()
                        year = str(today.year)
                        month = str(today.month)
                        if (len(month) == 1):
                            month = '0' + month
                        params['month'] = year + '-' + month
                except Exception as e2:
                    res['error'] += str(e2)
                    pass
                odoo_result = api.execute('lacagette.pos_member_purchases', 'get_members_purchases', params)
                res['data'] = CagetteMembers._generate_inra_csv_data(odoo_result)
                if 'error' in res['data']:
                    res['error'] += res['data']['error']
                res['params'] = params

        except Exception as e:
            res['error'] += str(e)

        return res

    @staticmethod
    def get(cond, fields, o=0, l=5000):
        res = {}
        try:
            api = OdooAPI()
            res = api.search_read('res.partner', cond, fields, offset=o, limit=l)
        except Exception as e:
            res['error'] = str(e)
        return res

    @staticmethod
    def add_pts_to_everyone(mtype, ids, pts, reason):
        res = {}
        try:
            for mid in ids:
                m = CagetteMember(mid)
                res[str(mid)] = m.add_pts(mtype, pts, reason)
        except Exception as e:
            res['error'] = str(e)
        return res

    @staticmethod
    def get_makeups_members():
        api = OdooAPI()
        cond = [['makeups_to_do','>', 0]]
        fields = ['id', 'name', 'display_std_points', 'display_ftop_points', 'shift_type', 'makeups_to_do']
        res = api.search_read('res.partner', cond, fields)
        return res

class CagetteServices(models.Model):
    """Class to handle cagette Odoo services."""

    @staticmethod
    def get_all_shift_templates():
        """Return all recorded shift templates recorded in Odoo database."""
        creneaux = {}
        try:
            api = OdooAPI()
            f = ['name', 'week_number', 'start_datetime_tz', 'end_datetime_tz',
                 'seats_reserved', 'shift_type_id', 'seats_max',
                 'seats_available']
            c = [['active', '=', True]]
            shift_templates = api.search_read('shift.template', c, f)

            # Get count of active registrations for each shift template
            # shift_templates_active_count = api.execute('lacagette_shifts', 'get_active_shifts', [])
            # With LGDS tests, seats_reserved reflects better what's shown in Odoo ...

            title = re.compile(r"^(\w{1})(\w{3})\. - (\d{2}:\d{2}) ?-? ?(\w*)")
            for l in shift_templates:
                # nb_reserved = 0
                # for stac in shift_templates_active_count:
                #     if stac['shift_template_id'] == l['id']:
                #         nb_reserved = stac['seats_active_registration']

                line = {}
                end = time.strptime(l['end_datetime_tz'], "%Y-%m-%d %H:%M:%S")
                end_min = str(end.tm_min)
                if end_min == '0':
                    end_min = '00'
                line['end'] = str(end.tm_hour) + ':' + end_min
                line['max'] = l['seats_max']
                # line['reserved'] = nb_reserved
                line['reserved'] = l['seats_reserved']
                line['week'] = l['week_number']
                line['id'] = l['id']
                line['type'] = l['shift_type_id'][0]
                t_elts = title.search(l['name'])
                if t_elts:
                    line['day'] = t_elts.group(2)
                    line['begin'] = t_elts.group(3)
                    line['place'] = t_elts.group(4)

                creneaux[str(l['id'])] = {'data': line}
        except Exception as e:
            coop_logger.error(str(e))
        return creneaux

    @staticmethod
    def get_shift_templates_next_shift(id):
        """Retrieve next shift template shift."""
        api = OdooAPI()
        c = [['shift_template_id.id', '=', id],
             ['date_begin', '>=', datetime.datetime.now().isoformat()]]
        f = ['date_begin']
        # c = [['id','=',2149]]
        shift = {}
        res = api.search_read('shift.shift', c, f, 1, 0, 'date_begin ASC')
        if (res and res[0]):
            locale.setlocale(locale.LC_ALL, 'fr_FR.utf8')
            local_tz = pytz.timezone('Europe/Paris')
            date, t = res[0]['date_begin'].split(' ')
            year, month, day = date.split('-')
            start = datetime.datetime(int(year), int(month), int(day),
                                      0, 0, 0, tzinfo=pytz.utc)
            start_date = start.astimezone(local_tz)
            shift['date_begin'] = start_date.strftime("%A %d %B %Y")
        return shift

    @staticmethod
    def get_services_at_time(time, tz_offset, with_members=True):
        """Retrieve present services with member linked."""

        default_acceptable_minutes_after_shift_begins = getattr(settings, 'ACCEPTABLE_ENTRANCE_MINUTES_AFTER_SHIFT_BEGINS', 15)
        minutes_before_shift_starts_delay = getattr(settings, 'ACCEPTABLE_ENTRANCE_MINUTES_BEFORE_SHIFT', 15)
        minutes_after_shift_starts_delay = default_acceptable_minutes_after_shift_begins
        late_mode = getattr(settings, 'ENTRANCE_WITH_LATE_MODE', False)
        max_duration = getattr(settings, 'MAX_DURATION', 180)
        if late_mode is True:
            minutes_after_shift_starts_delay = getattr(settings, 'ENTRANCE_VALIDATION_GRACE_DELAY', 60)
        api = OdooAPI()
        now = dateutil.parser.parse(time) - datetime.timedelta(minutes=tz_offset)
        start1 = now + datetime.timedelta(minutes=minutes_before_shift_starts_delay)
        start2 = now - datetime.timedelta(minutes=minutes_after_shift_starts_delay)
        end = start1 + datetime.timedelta(minutes=max_duration)
        cond = [['date_end_tz', '<=', end.isoformat()]]
        cond.append('|')
        cond.append(['date_begin_tz', '>=', start1.isoformat()])
        cond.append(['date_begin_tz', '>=', start2.isoformat()])
        fields = ['name', 'week_number', 'registration_ids',
                  'standard_registration_ids',
                  'shift_template_id', 'shift_ticket_ids',
                  'date_begin_tz', 'date_end_tz']
        services = api.search_read('shift.shift', cond, fields,order ="date_begin_tz ASC")
        for s in services:
            if (len(s['registration_ids']) > 0):
                if late_mode is True:
                    s['late'] = (
                                 now.replace(tzinfo=None)
                                 -
                                 dateutil.parser.parse(s['date_begin_tz']).replace(tzinfo=None)
                                 ).total_seconds() / 60 > default_acceptable_minutes_after_shift_begins
                if with_members is True:
                    cond = [['id', 'in', s['registration_ids']], ['state', 'not in', ['cancel', 'waiting', 'draft']]]
                    fields = ['partner_id', 'shift_type', 'state', 'is_late', 'associate_registered']
                    members = api.search_read('shift.registration', cond, fields)
                    s['members'] = sorted(members, key=lambda x: x['partner_id'][0])
                    if len(s['members']) > 0:
                        # search for associated people linked to these members
                        mids = []
                        for m in s['members']:
                            mids.append(m['partner_id'][0])
                        cond = [['parent_id', 'in', mids]]
                        fields = ['id', 'parent_id', 'name','barcode_base']
                        associated = api.search_read('res.partner', cond, fields)

                        if len(associated) > 0:
                            for m in s['members']:
                                for a in associated:
                                    if int(a['parent_id'][0]) == int(m['partner_id'][0]):
                                        m['partner_name'] = m['partner_id'][1]
                                        m['partner_id'][1] += ' en binôme avec ' + a['name']
                                        m['associate_name'] = str(a['barcode_base']) + ' - ' + a['name']
                                        

        return services

    @staticmethod
    def registration_done(registration_id, overrided_date="", typeAction=""):
        """Equivalent to click present in presence form."""
        api = OdooAPI()
        f = {'state': 'done'}
        if(typeAction != "normal" and typeAction != ""):
            f['associate_registered'] = typeAction
        late_mode = getattr(settings, 'ENTRANCE_WITH_LATE_MODE', False)
        if late_mode is True:
            # services = CagetteServices.get_services_at_time('14:28',0, with_members=False)
            if len(overrided_date) > 0 and getattr(settings, 'APP_ENV', "prod") != "prod":
                now = overrided_date
            else:
                local_tz = pytz.timezone('Europe/Paris')
                now = datetime.datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(local_tz).strftime("%H:%MZ")
            # coop_logger.info("Maintenant = %s (overrided %s) %s", now, overrided_date)
            services = CagetteServices.get_services_at_time(now, 0, with_members=False)
            if len(services) > 0:
                # Notice : Despite is_late is defined as boolean in Odoo, 0 or 1 is needed for api call
                is_late = 0
                if services[0]['late'] is True:
                    is_late = 1
                f['is_late'] = is_late
            else:
                return False
        return api.update('shift.registration', [int(registration_id)], f)

    @staticmethod
    def reopen_registration(registration_id, overrided_date=""):
        
        api = OdooAPI()
        f = {'state': 'open'}
        return api.update('shift.registration', [int(registration_id)], f)

    @staticmethod
    def record_rattrapage(mid, sid, stid, typeAction):
        """Add a shift registration for member mid.

        (shift sid, shift ticket stid)
        Once created, shift presence is confirmed.
        """
        api = OdooAPI()
        fields = {
            "partner_id": mid,
            "shift_id": sid,
            "shift_ticket_id": stid,
            "shift_type": "standard",  # ou ftop -> voir condition
            "related_shift_state": 'confirm',
            "state": 'open'}
        reg_id = api.create('shift.registration', fields)
        f = {'state': 'done'}
        if(typeAction != "normal" and typeAction != ""):
            f['associate_registered'] = typeAction
        return api.update('shift.registration', [int(reg_id)], f)

    @staticmethod
    def record_absences(date):
        """Called by cron script."""
        import dateutil.parser
        if len(date) > 0:
            now = dateutil.parser.parse(date)
        else:
            now = datetime.datetime.now()
        # now = dateutil.parser.parse('2020-09-15T15:00:00Z')
        date_24h_before = now - datetime.timedelta(hours=24)
        # let authorized people time to set presence for those who came in late
        end_date = now - datetime.timedelta(hours=2)
        api = OdooAPI()

        # Let's start by adding an extra shift to associated member who came together
        cond = [['date_begin', '>=', date_24h_before.isoformat()],
                ['date_begin', '<=', end_date.isoformat()],
                ['state', '=', 'done'], ['associate_registered', '=', 'both']]
        fields = ['state', 'partner_id', 'date_begin']
        res = api.search_read('shift.registration', cond, fields)
        for r in res:
            cond = [['id', '=', r['partner_id'][0]]]
            fields = ['id','extra_shift_done']
            res = api.search_read('res.partner', cond, fields)
            f = {'extra_shift_done': res[0]['extra_shift_done'] + 1 }
            api.update('res.partner', [r['partner_id'][0]], f)

        absence_status = 'excused'
        res_c = api.search_read('ir.config_parameter',
                                [['key', '=', 'lacagette_membership.absence_status']],
                                ['value'])
        if len(res_c) == 1:
            absence_status = res_c[0]['value']
        cond = [['date_begin', '>=', date_24h_before.isoformat()],
                ['date_begin', '<=', end_date.isoformat()],
                ['state', '=', 'open']]
        fields = ['state', 'partner_id', 'date_begin']
        res = api.search_read('shift.registration', cond, fields)
        ids = []
        partner_ids = []
        excluded_partner = []
        for r in res:
            partner_ids.append(int(r['partner_id'][0]))
        cond = [['id', 'in', partner_ids],
                ['cooperative_state', 'in', ['exempted']]]
        fields = ['id']
        res_exempted = api.search_read('res.partner', cond, fields)
        for r in res_exempted:
            excluded_partner.append(int(r['id']))
        for r in res:
            if not (int(r['partner_id'][0]) in excluded_partner):
                d_begin = r['date_begin']
                (d, h) = d_begin.split(' ')
                (_h, _m, _s) = h.split(':')
                if int(_h) < 21:
                    ids.append(int(r['id']))
        f = {'state': absence_status}
        update_shift_reg_result = {'update': api.update('shift.registration', ids, f), 'reg_shift': res}
        if update_shift_reg_result['update'] is True:
            update_shift_reg_result['process_status_res'] = api.execute('res.partner','run_process_target_status', [])
        return update_shift_reg_result

    @staticmethod
    def close_ftop_service():
        """Called by cron script"""
        # Retrieve the latest past FTOP service
        import dateutil.parser
        now = datetime.datetime.now()
        # now = dateutil.parser.parse('2019-10-20T00:00:00Z')
        cond = [['shift_type_id','=', 2],['date_end', '<=', now.isoformat()],['state','=', 'draft'], ['active', '=', True]]
        fields = ['name']
        api = OdooAPI()
        res = api.search_read('shift.shift', cond, fields,order ="date_end ASC", limit=1)
        # return res[0]['id']
        result = {}
        if res and len(res) > 0:
            result['service_found'] = True
            # Exceptions are due to the fact API returns None whereas the action is really done !...
            marshal_none_error = 'cannot marshal None unless allow_none is enabled'
            actual_errors = 0
            try:
                api.execute('shift.shift', 'button_confirm', [res[0]['id']])
            except Exception as e:
                if not (marshal_none_error in str(e)):
                    result['exeption_confirm'] = str(e)
                    actual_errors += 1
            try:
                api.execute('shift.shift', 'button_makeupok', [res[0]['id']])
            except Exception as e:
                if not (marshal_none_error in str(e)):
                    result['exeption_makeupok'] = str(e)
                    actual_errors += 1
            try:
                api.execute('shift.shift', 'button_done', [res[0]['id']])
            except Exception as e:
                if not (marshal_none_error in str(e)):
                    result['exeption_done'] = str(e)
                    actual_errors += 1
            if actual_errors == 0:
                result['done'] = True
            else:
                result['done'] = False
            result['actual_errors'] = actual_errors
        else:
            result['service_found'] = False
        return result

    @staticmethod
    def get_committees_shift_id():
        shift_id = None
        try:
            api = OdooAPI()
            res = api.search_read('ir.config_parameter',
                                  [['key','=', 'lacagette_membership.committees_shift_id']],
                                  ['value'])
            if len(res) > 0:
                try:
                    shift_id = int(res[0]['value'])
                except:
                    pass
        except:
            pass
        return shift_id

    @staticmethod
    def easy_validate_shift_presence(coop_id):
        """Add a presence point if the request is valid."""
        res = {}
        try:
            committees_shift_id = CagetteServices.get_committees_shift_id()
            api = OdooAPI()
            # let verify coop_id is corresponding to a ftop subscriber
            cond = [['id', '=', coop_id]]
            fields = ['tmpl_reg_line_ids']
            coop = api.search_read('res.partner', cond, fields)
            if coop:
                if len(coop[0]['tmpl_reg_line_ids']) > 0 :
                    cond = [['id', '=', coop[0]['tmpl_reg_line_ids'][0]]]
                    fields = ['shift_template_id']
                    shift_templ_res = api.search_read('shift.template.registration.line', cond, fields)
                    if (len(shift_templ_res) > 0
                        and
                        shift_templ_res[0]['shift_template_id'][0] == committees_shift_id):

                        evt_name = getattr(settings, 'ENTRANCE_ADD_PT_EVENT_NAME', 'Validation service comité')
                        c = [['partner_id', '=', coop_id], ['name', '=', evt_name]]
                        f = ['create_date']
                        last_point_mvts = api.search_read('shift.counter.event', c, f,
                                                          order ="create_date DESC", limit=1)
                        ok_for_adding_pt = False
                        if len(last_point_mvts):
                            now = datetime.datetime.now()
                            past = datetime.datetime. strptime(last_point_mvts[0]['create_date'],
                                                               '%Y-%m-%d %H:%M:%S')
                            if (now - past).total_seconds() >= 3600 * 24:
                                ok_for_adding_pt = True
                        else:
                            ok_for_adding_pt = True
                        if ok_for_adding_pt is True:
                            res['evt_id'] = CagetteMember(coop_id).add_pts('ftop', 1, evt_name)
                        else:
                            res['error'] = "One point has been added less then 24 hours ago"
                    else:
                        res['error'] = "Unallowed coop"
                else:
                    res['error'] = "Unregistred coop"
            else:
                res['error'] = "Invalid coop id"
        except Exception as e:
            coop_logger.error("easy_validate_shift_presence :  %s %s", str(coop_id), str(e))
        return res

class CagetteUser(models.Model):

    @staticmethod
    def get_credentials(request):
        import hashlib

        data = {}
        api = OdooAPI()
        login = request.POST.get('login')
        password = request.POST.get('password')

        if login and password:
            uid = api.authenticate(login, password)
            if not(uid is False):
                cond = [['id', '=', uid]]
                fields = ['active', 'cooperative_state', 'create_date', 'groups_id']
                try:
                    res = api.search_read('res.users', cond, fields)
                    if (res[0]['active'] is True):
                        tocode = res[0]['create_date'] + request.META.get('HTTP_USER_AGENT')
                        data['authtoken'] = hashlib.sha256(tocode.encode('utf-8')).hexdigest()
                        data['uid'] = uid
                        data['cooperative_state'] = res[0]['cooperative_state']
                        cond = [['id', 'in', res[0]['groups_id']]]
                        fields = ['full_name']
                        data['groups'] = api.search_read('res.groups', cond, fields)

                except Exception as e:
                    data['error'] = str(e)

        return data

    @staticmethod
    def are_credentials_ok(request):
        import hashlib
        answer = False
        if 'authtoken' in request.COOKIES and 'uid' in request.COOKIES:
            api = OdooAPI()
            cond = [['id', '=', request.COOKIES['uid']]]
            fields = ['active','create_date']
            try:
                res = api.search_read('res.users', cond, fields)
                if (res[0]['active'] is True):
                    tocode = res[0]['create_date'] + request.META.get('HTTP_USER_AGENT')
                    calc_authtoken = hashlib.sha256(tocode.encode('utf-8')).hexdigest()
                    if calc_authtoken == request.COOKIES['authtoken']:
                        answer = True
            except:
                pass

        return answer
