from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI

from pytz import timezone

import locale
import re


class CagetteShift(models.Model):
    """Class to handle cagette Odoo Shift."""

    def __init__(self):
        """Init with odoo id."""
        self.tz = pytz.timezone("Europe/Paris")
        self.o_api = OdooAPI()

    def get_shift(self, id):
        """Get one shift by id"""
        cond = [['id', '=', id]]

        fields = ['date_begin_tz']
        listService = self.o_api.search_read('shift.shift', cond, fields)

        try:
            return listService[0]
        except Exception as e:
            print(str(e))
            return None

    def get_data_partner(self, id):
        """Retrieve partner data useful to make decision about shift options"""
        cond = [['id', '=', id]]
        fields = ['display_name', 'display_std_points',
                  'shift_type', 'date_alert_stop', 'date_delay_stop', 'extension_ids',
                  'cooperative_state', 'final_standard_point', 'create_date',
                  'final_ftop_point', 'in_ftop_team', 'leave_ids', 'makeups_to_do', 'barcode_base']
        partnerData = self.o_api.search_read('res.partner', cond, fields, 1)
        if partnerData:
            partnerData = partnerData[0]
            if partnerData['shift_type'] == 'standard':
                partnerData['in_ftop_team'] = False
                #  Because 'in_ftop_team' doesn't seem to be reset to False in Odoo
            cond = [['partner_id.id', '=', id]]
            fields = ['shift_template_id', 'is_current']
            shiftTemplate = self.o_api.search_read('shift.template.registration', cond, fields)
            if (shiftTemplate and len(shiftTemplate) > 0):
                s_t_id = None
                for s_t in shiftTemplate:
                    if s_t['is_current'] is True:
                        s_t_id = s_t['shift_template_id'][0]
                if not (s_t_id is None):
                    cond = [['shift_template_id.id', '=', int(s_t_id)],
                            ['date_begin_tz', '>', datetime.datetime.now().isoformat()]]
                    fields = ['date_begin_tz', 'name']
                    nextShifts = self.o_api.search_read('shift.shift', cond, fields, 1)
                    if nextShifts:
                        (d, h) = nextShifts[0]['date_begin_tz'].split(' ')
                        partnerData['next_regular_shift_date'] = d
                        partnerData['regular_shift_name'] = nextShifts[0]['name']
            partnerData['is_leave'] = False
            if len(partnerData['leave_ids']) > 0:
                # Is member in active leave period
                now = datetime.datetime.now().isoformat()
                cond = [['id', 'in', partnerData['leave_ids']],
                        ['start_date', '<', now],
                        ['stop_date', '>', now], ['state', '!=', 'cancel']]
                fields = ['start_date', 'stop_date', 'type_id', 'state']
                res_leaves = self.o_api.search_read('shift.leave', cond, fields)

                if res_leaves and len(res_leaves) > 0:
                    # TODO : Consider > 1 results
                    partnerData['is_leave'] = True
                    partnerData["leave_start_date"] = res_leaves[0]["start_date"]
                    partnerData["leave_stop_date"] = res_leaves[0]["stop_date"]

        return partnerData

    def get_shift_partner(self, id):
        """Récupère les shift du membre"""
        fields = ['date_begin', 'date_end','final_standard_point',
                  'shift_id', 'shift_type','partner_id',  "id"] # res.partner
        cond = [['partner_id.id', '=', id],['state', '=', 'open'],
               ['date_begin', '>', datetime.datetime.now().isoformat()]]
        shiftData = self.o_api.search_read('shift.registration', cond, fields, order ="date_begin ASC")
        return shiftData

    def get_shift_calendar(self, id, start, end):
        """Récupère les shifts à partir de maintenant pour le calendier"""
        cond = [['date_begin', '>', datetime.datetime.now().isoformat()],
                ['state', '!=', 'cancel']]
        try:
            start_d = datetime.datetime.strptime(start, '%Y-%m-%d')
            cond.append(['date_begin', '>=', start_d.isoformat()])
        except:
            pass
        try:
            end_d = datetime.datetime.strptime(end, '%Y-%m-%d')
            cond.append(['date_end', '<=', end_d.isoformat()])
        except:
            pass
        # 2018-11-25 seats_available instead of seats_max
        fields = ['date_begin_tz',
                  'date_end_tz', 'name',
                  'shift_template_id',
                  'event_type_id', 'seats_reserved',
                  'seats_available', 'registration_ids', 'address_id', 'shift_type_id']
        listService = self.o_api.search_read('shift.shift', cond, fields)

        return listService

    def get_leave(self, idPartner):
        """Récupération des congés en cours du membre"""
        now = datetime.datetime.now().isoformat()
        cond = [['partner_id', '=', idPartner], ['start_date', '<', now], ['stop_date', '>', now]]
        fields = ['stop_date', 'id', 'start_date']
        return self.o_api.search_read('shift.leave', cond, fields)

    def get_shift_ticket(self,idShift, in_ftop_team):
        """Récupérer le shift_ticket suivant le membre et flotant ou pas"""
        fields = ['shift_ticket_ids']
        cond = [['id', "=", idShift]]
        listeTicket = self.o_api.search_read('shift.shift', cond, fields)
        if in_ftop_team == "True":
            return listeTicket[0]['shift_ticket_ids'][1]
        else:
            return listeTicket[0]['shift_ticket_ids'][0]

    def set_shift(self, data):
        """Shift registration"""
        st_r_id = False
        try:
            fieldsDatas = { "partner_id": data['idPartner'],
                            "shift_id": data['idShift'],
                            "shift_ticket_id": self.get_shift_ticket(data['idShift'], data['in_ftop_team']),
                            "shift_type": "standard",  # ftop
                            "related_shift_state": 'confirm',
                            "state": 'open'}

            st_r_id = self.o_api.create('shift.registration', fieldsDatas)
        except Exception as e:
            coop_logger.error("Set shift : %s, %s", str(e), str(data))
            if 'This partner is already registered on this Shift' in str(e):
                res = self.reopen_shift(data)
                if res:
                    st_r_id = True
        return st_r_id

    def cancel_shift(self, idsRegisteur):
        """Annule un shift"""
        fieldsDatas = { "related_shift_state": 'cancel',
                        "state": 'cancel'}

        return self.o_api.update('shift.registration', idsRegisteur,  fieldsDatas)

    def reopen_shift(self, data):
        """Use when a member select a shift he has canceled before"""
        response = None
        cond = [['partner_id', '=', int(data['idPartner'])],
                ['shift_id', '=', int(data['idShift'])],
                ['state', '=', 'cancel']]
        fields = ['id']
        try:
            canceled_res = self.o_api.search_read('shift.registration', cond, fields, 1)
            if (len(canceled_res) == 1):
                shift_res = canceled_res[0]
                fieldsDatas = { "related_shift_state":'open',
                                "state": 'open'}
                response = self.o_api.update('shift.registration', [shift_res['id']],  fieldsDatas)
        except Exception as e:
            coop_logger.error("Reopen shift : %s", str(e))
        return response

    def create_delay(self, data):
        """Create a delay for a member.
        A delay is 28 days from the given start_date.

        If the partner already has a current extension: extend it by 28 days.
        Else, create a 28 days delay.

        Args:
            idPartner: int
            start_date: string date at iso format (eg. "2019-11-19")
                Date from which the 28 days delay is calculated
            (optionnal) extension_beginning: string date at iso format
                If specified, will be the actual starting date of the extension.
                Should be inferior than start_date.
                (at creation only: odoo ignores delays if today's not inside)
        """
        action = 'create'

        # Get partner extension ids
        cond = [['id','=',data['idPartner']]]
        fields = ['extension_ids']
        partner_extensions = self.o_api.search_read('res.partner', cond, fields)
        response = False

        # If has extensions
        if 'extension_ids' in partner_extensions[0]:
            # Look for current extension: started before today and ends after
            current_extension = False
            for ext_id in partner_extensions[0]['extension_ids']:
                cond = [['id','=',ext_id]]
                extension = self.o_api.search_read('shift.extension', cond)
                extension = extension[0]

                if datetime.datetime.strptime(extension['date_start'], '%Y-%m-%d') <= datetime.datetime.now() and\
                        datetime.datetime.strptime(extension['date_stop'], '%Y-%m-%d') > datetime.datetime.now():
                    current_extension = extension
                    break

            # Has a current extension -> Update it
            if current_extension != False:
                action = 'update'

        # Update current extension
        if action == 'update':
            ext_date_stop = datetime.datetime.strptime(extension['date_stop'], '%Y-%m-%d').date()
            ext_new_date_stop = (ext_date_stop + datetime.timedelta(days=28))

            update_data = {
                'date_stop': ext_new_date_stop.isoformat()
            }

            response = self.o_api.update('shift.extension', current_extension['id'],  update_data)
        # Create the extension
        else:
            # Get the 'Extension' type id
            extension_types = self.o_api.search_read('shift.extension.type')
            ext_type_id = 1 # Default
            for val in extension_types:
                if val['name'] == 'Extension':
                    ext_type_id = val['id']

            starting_date = datetime.datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            ending_date = (starting_date + datetime.timedelta(days=28))

            if 'extension_beginning' in data:
                starting_date = datetime.datetime.strptime(data['extension_beginning'], '%Y-%m-%d').date()

            #TODO : bloquer si nextmonth > date_end_alert+5months ? (blocage js)
            fields= {
                "partner_id":   data['idPartner'],
                "type_id":      ext_type_id,
                "date_start":   starting_date.isoformat(),
                "date_stop":    ending_date.isoformat(),
                "name":         "Extension créée depuis l'espace membre"
            }

            response = self.o_api.create('shift.extension', fields)

        return response

    @staticmethod
    def reset_members_positive_points():
        """
        Look for all the members with standard points > 0 when registered for more than a month and reset them to 0
        -> As an intern rule, members can't have more than 0 standard point (except during the first month)

        --- Called by a cron script
        """
        api = OdooAPI()

        # Get concerned members id and points
        lastmonth = (datetime.date.today() - datetime.timedelta(days=28)).isoformat()

        cond = [['is_member', '=', True],
                ['final_standard_point', '>', 0],
                ['create_date', '<', lastmonth]]
        fields = ['id', 'final_standard_point']
        members_data = api.search_read('res.partner', cond, fields)

        # For each, set points to 0
        res = True
        for member_data in members_data:
            try:
                fields = {
                    'name': 'RAZ des points positifs',
                    'shift_id': False,
                    'type': 'standard',
                    'partner_id': member_data['id'],
                    'point_qty': -int(member_data['final_standard_point'])
                }

                api.create('shift.counter.event', fields)
            except:
                res = False

        return res

    def get_test(self, odooModel, cond, fieldsDatas):
        return self.o_api.search_read(odooModel, cond, fieldsDatas, limit = 1000)
