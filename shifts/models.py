from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI
from members.models import CagetteMember

from pytz import timezone

import locale
import re

import dateutil.parser

class CagetteShift(models.Model):
    """Class to handle cagette Odoo Shift."""

    def __init__(self):
        """Init with odoo id."""
        self.tz = pytz.timezone("Europe/Paris")
        self.o_api = OdooAPI()

    def get_cycle_week_data(self, date=None):
        result = {}
        try:
            res_param = self.o_api.search_read('ir.config_parameter',
                                               [['key', '=', 'coop_shift.week_a_date']],
                                               ['value'])
            if res_param:
                import math
                WEEKS = ['A', 'B', 'C', 'D']
                start_A = tz.localize(datetime.datetime.strptime(res_param[0]['value'], '%Y-%m-%d'))
                result['start'] = start_A
                now = datetime.datetime.now(tz)  # + datetime.timedelta(hours=72)
                if date is not None:
                    now = tz.localize(datetime.datetime.strptime(date, '%Y-%m-%d'))
                diff = now - start_A
                weeks_diff = diff.total_seconds() / 3600 / 24 / 7
                week_index = math.floor(weeks_diff % 4)
                result['week_name'] = WEEKS[week_index]
                result['start_date'] = start_A + datetime.timedelta(weeks=math.floor(weeks_diff))

        except Exception as e:
            coop_logger.error("get_current_cycle_week_data %s", str(e))
            result['error'] = str(e)
        return result

    def is_matching_ftop_rules(self, partner_id, idNewShift, idOldShift=0):
        answer = True
        rules = getattr(settings, 'FTOP_SERVICES_RULES', {})
        if ("successive_shifts_allowed" in rules
             or
            "max_shifts_per_cycle" in rules
            ):
            try:
                now = datetime.datetime.now(tz)
                # Have to retrive shifts (from now to a cycle period forward to check rules respect)
                [shift_registrations, is_ftop] = self.get_shift_partner(partner_id, now + datetime.timedelta(weeks=4))
                new_shift = self.get_shift(idNewShift)  # WARNING : use date_begin_tz while shift_registrations use date_begin (UTC)
                if "successive_shifts_allowed" in rules:
                    min_duration = getattr(settings, 'MIN_SHIFT_DURATION', 2)
                    for sr in shift_registrations:
                        if int(sr['shift_id'][0]) != int(idOldShift):
                            diff = (datetime.datetime.strptime(sr['date_begin'], '%Y-%m-%d %H:%M:%S').astimezone(tz)
                                    - tz.localize(datetime.datetime.strptime(new_shift['date_begin_tz'], '%Y-%m-%d %H:%M:%S')))
                            if abs(diff.total_seconds() / 3600) < (min_duration * 2) * (int(rules['successive_shifts_allowed']) + 1):
                                answer = False
                            #  coop_logger.info(sr['date_begin'] + ' - ' + new_shift['date_begin_tz'])
                            #  coop_logger.info(str(diff.total_seconds()/3600) + 'h')
                if "max_shifts_per_cycle" in rules:
                    [ymd, hms] = new_shift['date_begin_tz'].split(" ")
                    cw = self.get_cycle_week_data(ymd)
                    if 'start_date' in cw:
                        sd = cw['start_date']
                        ed = cw['start_date'] + datetime.timedelta(weeks=4)
                        [cycle_shift_regs, is_ftop] = self.get_shift_partner(partner_id, start_date=sd, end_date=ed)
                        if len(cycle_shift_regs) >= int(rules['max_shifts_per_cycle']):
                            answer = False
                            coop_logger.info("services max par cycle atteint pour partner_id %s", str(partner_id))
            except Exception as e:
                coop_logger.error("is_shift_exchange_allowed %s %s", str(e), str(new_shift))
        return answer

    def is_shift_exchange_allowed(self, idOldShift, idNewShift, shift_type, partner_id):
        answer = True
        min_delay = getattr(settings, 'STANDARD_BLOCK_SERVICE_EXCHANGE_DELAY', 0)
        if shift_type == "ftop":
            min_delay = getattr(settings, 'FTOP_BLOCK_SERVICE_EXCHANGE_DELAY', 0)
        if min_delay > 0:
            now = datetime.datetime.now(tz)
            old_shift = self.get_shift(idOldShift)
            day_before_old_shift_date_start = \
                tz.localize(datetime.datetime.strptime(old_shift['date_begin_tz'], '%Y-%m-%d %H:%M:%S')
                            - datetime.timedelta(hours=min_delay))

            if now > day_before_old_shift_date_start:
                answer = False
            elif shift_type == "ftop":
                answer = self.is_matching_ftop_rules(partner_id, idNewShift, idOldShift)


        return answer

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
                  'final_ftop_point', 'shift_type', 'leave_ids', 'makeups_to_do', 'barcode_base',
                  'street', 'street2', 'zip', 'city', 'mobile', 'phone', 'email',
                  'is_associated_people', 'parent_id', 'extra_shift_done']
        partnerData = self.o_api.search_read('res.partner', cond, fields, 1)
        if partnerData:
            partnerData = partnerData[0]
            if partnerData['is_associated_people']:
                cond = [['id', '=', partnerData['parent_id'][0]]]
                fields = ['create_date', 'makeups_to_do', 'date_delay_stop', 'extra_shift_done']
                parentData = self.o_api.search_read('res.partner', cond, fields, 1)
                if parentData:
                    partnerData['parent_create_date'] = parentData[0]['create_date']
                    partnerData['parent_makeups_to_do'] = parentData[0]['makeups_to_do']
                    partnerData['parent_date_delay_stop'] = parentData[0]['date_delay_stop']
                    partnerData['parent_extra_shift_done'] = parentData[0]['extra_shift_done']

            if partnerData['shift_type'] == 'standard':
                partnerData['in_ftop_team'] = False
                #  Because 'in_ftop_team' doesn't seem to be reset to False in Odoo
            if partnerData['is_associated_people']:
                cond = [['partner_id.id', '=', partnerData['parent_id'][0]]]
            else:
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
                  'shift_id', 'shift_type','partner_id',  "id", "associate_registered", "is_makeup"] # res.partner
        cond = [['partner_id.id', '=', id],['state', '=', 'open'],
               ['date_begin', '>', datetime.datetime.now().isoformat()]]
        shiftData = self.o_api.search_read('shift.registration', cond, fields, order ="date_begin ASC")
        return shiftData

    def shift_is_makeup(self, id):
        """vérifie si une shift est un rattrapage"""
        fields = ["is_makeup", "id"] 
        cond = [['id', '=', id]]
        shiftData = self.o_api.search_read('shift.registration', cond, fields)
        return shiftData[0]["is_makeup"]

         

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

    def get_shift_ticket(self,idShift, shift_type):
        """Récupérer le shift_ticket suivant le membre et flotant ou pas"""
        if getattr(settings, 'USE_STANDARD_SHIFT', True) == False:
            shift_type = "ftop"
        fields = ['shift_ticket_ids']
        cond = [['id', "=", idShift]]
        listeTicket = self.o_api.search_read('shift.shift', cond, fields)
        if shift_type == "ftop":
            return listeTicket[0]['shift_ticket_ids'][1]
        else:
            return listeTicket[0]['shift_ticket_ids'][0]

    def set_shift(self, data):
        """Shift registration"""
        st_r_id = False
        try:
            shift_type = "standard"
            if data['shift_type'] == "ftop" or getattr(settings, 'USE_STANDARD_SHIFT', True) == False:
                shift_type = "ftop"
            fieldsDatas = { "partner_id": data['idPartner'],
                            "shift_id": data['idShift'],
                            "shift_ticket_id": self.get_shift_ticket(data['idShift'], data['shift_type']),
                            "shift_type": shift_type,  
                            "origin": 'memberspace',
                            "is_makeup": data['is_makeup'],
                            "state": 'open'}
            if (shift_type == "standard" and data['is_makeup'] is not True) or shift_type == "ftop":
                fieldsDatas['template_created'] = 1  # It's not true but otherwise, presence add 1 standard point , which is not wanted

            st_r_id = self.o_api.create('shift.registration', fieldsDatas)
        except Exception as e:
            coop_logger.error("Set shift : %s, %s", str(e), str(data))
            if 'This partner is already registered on this Shift' in str(e):
                res = self.reopen_shift(data)
                if res:
                    st_r_id = True
        return st_r_id
    
    def affect_shift(self, data):
        """Affect shift to partner, his associate or both"""
        response = None
        # partner_id can be 'associated_people' one, which is never use as shift partner_id reference
        # So, let's first retrieved data about the res.partner involved
        cond = [['id', '=', int(data['idPartner'])]]
        fields = ['parent_id']
        partner = self.o_api.search_read('res.partner', cond, fields, 1)
        if partner:
            if partner[0]['parent_id']:
                partner_id = partner[0]['parent_id'][0]
            else:
                partner_id = int(data['idPartner'])
            cond = [['partner_id', '=', partner_id],
                    ['id', '=', int(data['idShiftRegistration'])]]
            fields = ['id']
            try:
                # make sure there is coherence between shift.registration id and partner_id (to avoid forged request)
                shit_to_affect = self.o_api.search_read('shift.registration', cond, fields, 1)
                if (len(shit_to_affect) == 1):
                    shift_res = shit_to_affect[0]
                    fieldsDatas = { "associate_registered":data['affected_partner']}
                    response = self.o_api.update('shift.registration', [shift_res['id']],  fieldsDatas)
            except Exception as e:
                coop_logger.error("Model affect shift : %s", str(e))
        else:
            coop_logger.error("Model affect shift nobody found : %s", str(cond))
        return response

    def cancel_shift(self, idsRegisteur, origin='memberspace'):
        """Annule un shift"""
        fieldsDatas = { "related_shift_state": 'cancel',
                        "origin": origin,
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

    def create_delay(self, data, duration=28, ext_name="Extension créée depuis l'espace membre"):
        """
        Create a delay for a member.
        If no duration is specified, a delay is by default 28 days from the given start_date.

        If the partner already has a current extension: extend it by [duration] days.
        Else, create a 28 days delay.

        Args:
            data
                idPartner: int
                start_date: string date at iso format (eg. "2019-11-19")
                    Date from which the delay end date is calculated
                (optionnal) extension_beginning: string date at iso format
                    If specified, will be the actual starting date of the extension.
                    Should be inferior than start_date.
                    (at creation only: odoo ignores delays if today's not inside)
            duration: nb of days
            ext_name: will be displayed in odoo extensions list
        """
        action = 'create'

        # Get partner extension ids
        cond = [['id', '=', data['idPartner']]]
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
            ext_new_date_stop = (ext_date_stop + datetime.timedelta(days=duration))

            update_data = {
                'date_stop': ext_new_date_stop.isoformat()
            }

            response = self.o_api.update('shift.extension', current_extension['id'],  update_data)
        # Create the extension
        else:
            # Get the 'Extension' type id
            extension_types = self.o_api.search_read('shift.extension.type')
            ext_type_id = getattr(settings, 'EXTENSION_TYPE_ID', 1)
            for val in extension_types:
                if val['name'] == 'Extension':
                    ext_type_id = val['id']
            
            starting_date = datetime.datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            ending_date = (starting_date + datetime.timedelta(days=duration))

            if 'extension_beginning' in data:
                starting_date = datetime.datetime.strptime(data['extension_beginning'], '%Y-%m-%d').date()

            fields= {
                "partner_id":   data['idPartner'],
                "type_id":      ext_type_id,
                "date_start":   starting_date.isoformat(),
                "date_stop":    ending_date.isoformat(),
                "name":         ext_name
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

    def decrement_makeups_to_do(self, partner_id):
        """ Decrements partners makeups to do if > 0 """
        cond = [['id', '=', partner_id]]
        fields = ['makeups_to_do']
        makeups_to_do = self.o_api.search_read('res.partner', cond, fields)[0]["makeups_to_do"]

        if makeups_to_do > 0:
            makeups_to_do -= 1
            f = { "makeups_to_do": makeups_to_do }

            return self.o_api.update('res.partner', [partner_id],  f)
        else:
            return "makeups already at 0"

    def member_can_have_delay(self, partner_id):
        """ Can a member have a delay? """
        answer = False
        try:
            answer = self.o_api.execute('res.partner', 'can_have_extension', [partner_id])
        except Exception as e:
            coop_logger.error("member_can_have_delay : %s", str(e))
        return answer

    def update_counter_event(self, fields):
        """ Add/remove points """
        return self.o_api.create('shift.counter.event', fields)


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
                 'seats_available','registration_qty']
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
                #line['reserved'] = l['seats_reserved']
                line['reserved'] = l['registration_qty']
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
        """Retrieve present services with members linked."""

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
                  'date_begin_tz', 'date_end_tz', 'state']
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

        if typeAction == "both":
            f['should_increment_extra_shift_done'] = True
        else:
            f['should_increment_extra_shift_done'] = False
            
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
        try:
            cond = [['id', '=', int(registration_id)]]
            fields = ['partner_id']
            res = api.search_read('shift.registration', cond, fields)
            coop_logger.info("On invalide la présence de  %s ", res[0]['partner_id'][1])
        except Exception as e:
            coop_logger.error("On invalide shift_registration  %s (erreur : %s)", str(registration_id), str(e))
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
        if typeAction == "both":
            f['should_increment_extra_shift_done'] = True
        else:
            f['should_increment_extra_shift_done'] = False

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
                ['state', '=', 'done'], 
                ['associate_registered', '=', 'both'],
                ['should_increment_extra_shift_done', '=', True]]
        fields = ['id', 'state', 'partner_id', 'date_begin']
        res = api.search_read('shift.registration', cond, fields)

        extra_shift_done_incremented_srids = []  # shift registration ids
        for r in res:
            cond = [['id', '=', r['partner_id'][0]]]
            fields = ['id','extra_shift_done']
            res_partner = api.search_read('res.partner', cond, fields)

            f = {'extra_shift_done': res_partner[0]['extra_shift_done'] + 1 }
            api.update('res.partner', [r['partner_id'][0]], f)

            extra_shift_done_incremented_srids.append(int(r['id']))

        # Make sure the counter isn't incremented twice
        f = {'should_increment_extra_shift_done': False}
        api.update('shift.registration', extra_shift_done_incremented_srids, f)

        absence_status = 'excused'
        res_c = api.search_read('ir.config_parameter',
                                [['key', '=', 'lacagette_membership.absence_status']],
                                ['value'])
        if len(res_c) == 1:
            absence_status = res_c[0]['value']
        cond = [['date_begin', '>=', date_24h_before.isoformat()],
                ['date_begin', '<=', end_date.isoformat()],
                ['state', '=', 'open']]
        fields = ['state', 'partner_id', 'date_begin', 'shift_id']
        res = api.search_read('shift.registration', cond, fields)
        ids = []
        partner_ids = []
        excluded_partner = []
        canceled_reg_ids = []  # for exempted people
        shift_ids = []
        for r in res:
            partner_ids.append(int(r['partner_id'][0]))
            shift_id = int(r['shift_id'][0])
            if shift_id not in shift_ids:   
                shift_ids.append(shift_id)
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
            else:
                canceled_reg_ids.append(int(r['id']))
        # coop_logger.info("Traitement absences shift_registration ids %s", ids)
        f = {'state': absence_status, 'date_closed': now.isoformat()}
        update_shift_reg_result = {'update': api.update('shift.registration', ids, f), 'reg_shift': res, 'errors': []}
        if update_shift_reg_result['update'] is True:
            update_shift_reg_result['process_status_res'] = api.execute('res.partner','run_process_target_status', [])
            # change shift state by triggering button_done method for all related shifts
            if len(canceled_reg_ids) > 0:
                f = {'state': 'cancel', 'date_closed': now.isoformat()}
                api.update('shift.registration', canceled_reg_ids, f)
            for sid in shift_ids:
                try:
                    api.execute('shift.shift', 'button_done', sid)
                except Exception as e:
                    marshal_none_error = 'cannot marshal None unless allow_none is enabled'
                    if not (marshal_none_error in str(e)):
                        update_shift_reg_result['errors'].append({'shift_id': sid, 'msg' :str(e)})

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
    def get_exemptions_shift_id():
        shift_id = None
        try:
            api = OdooAPI()
            res = api.search_read('ir.config_parameter',
                                  [['key','=', 'lacagette_exemptions.exemptions_shift_id']],
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
    def get_first_ftop_shift_id():
        shift_id = None
        try:
            api = OdooAPI()
            res = api.search_read('shift.template',
                                  [['shift_type_id','=', 2]],
                                  ['id', 'registration_qty'])

            # Get the ftop shift template with the max registrations: most likely the one in use
            ftop_shift = {'id': None, 'registration_qty': 0}
            for shift_reg in res:
                if shift_reg["registration_qty"] > ftop_shift["registration_qty"]:
                    ftop_shift = shift_reg

            try:
                shift_id = int(ftop_shift['id'])
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
                        ok_for_adding_pt = False
                        mininum_seconds_interval = getattr(settings, 'MINIMUM_SECONDS_BETWEEN_TWO_COMITEE_VALIDATION', 3600 * 24)
                        evt_name = getattr(settings, 'ENTRANCE_ADD_PT_EVENT_NAME', 'Validation service comité')

                        if mininum_seconds_interval > 0:
                            #  A constraint has been set to prevent from adding more than 1 point during a time period
                            #  Let's find out when was the last time a "special point" has been addes
                            c = [['partner_id', '=', coop_id], ['name', '=', evt_name]]
                            f = ['create_date']
                            last_point_mvts = api.search_read('shift.counter.event', c, f,
                                                              order ="create_date DESC", limit=1)
                            
                            if len(last_point_mvts):
                                now = datetime.datetime.now()
                                past = datetime.datetime. strptime(last_point_mvts[0]['create_date'],
                                                                   '%Y-%m-%d %H:%M:%S')
                                if (now - past).total_seconds() >= mininum_seconds_interval:
                                    ok_for_adding_pt = True
                            else:
                                ok_for_adding_pt = True
                        else:
                            #  mininum_seconds_interval is 0 : Point can we added without any condition
                            ok_for_adding_pt = True

                        if ok_for_adding_pt is True:
                            res['evt_id'] = CagetteMember(coop_id).add_pts('ftop', 1, evt_name)
                        else:
                            res['error'] = "Un point a déjà été ajouté trop récemment."
                    else:
                        res['error'] = "Vous n'avez pas le droit d'ajouter un point."
                else:
                    res['error'] = "Unregistred coop"
            else:
                res['error'] = "Invalid coop id"
        except Exception as e:
            coop_logger.error("easy_validate_shift_presence :  %s %s", str(coop_id), str(e))
        return res

class CagetteService(models.Model):
    """Class to handle cagette Odoo service."""

    def __init__(self, id):
        """Init with odoo id."""
        self.id = int(id)
        self.o_api = OdooAPI()

    def _process_associated_people_extra_shift_done(self):
        cond = [['shift_id', '=', self.id],
                ['state', '=', 'done'], 
                ['associate_registered', '=', 'both'],
                ['should_increment_extra_shift_done', '=', True]]
        fields = ['id', 'state', 'partner_id', 'date_begin']
        res = self.o_api.search_read('shift.registration', cond, fields)
        extra_shift_done_incremented_srids = []  # shift registration ids
        for r in res:
            cond = [['id', '=', r['partner_id'][0]]]
            fields = ['id','extra_shift_done']
            res_partner = self.o_api.search_read('res.partner', cond, fields)

            f = {'extra_shift_done': res_partner[0]['extra_shift_done'] + 1 }
            self.o_api.update('res.partner', [r['partner_id'][0]], f)

            extra_shift_done_incremented_srids.append(int(r['id']))

        # Make sure the counter isn't incremented twice
        f = {'should_increment_extra_shift_done': False}
        self.o_api.update('shift.registration', extra_shift_done_incremented_srids, f)

    def _process_related_shift_registrations(self):
        now = datetime.datetime.now()
        absence_status = 'excused'
        res_c = self.o_api.search_read('ir.config_parameter',
                                [['key', '=', 'lacagette_membership.absence_status']],
                                ['value'])
        if len(res_c) == 1:
            absence_status = res_c[0]['value']
        cond = [['shift_id', '=', self.id],
                ['state', '=', 'open']]
        fields = ['state', 'partner_id', 'date_begin']
        res = self.o_api.search_read('shift.registration', cond, fields)
        ids = []
        partner_ids = []
        excluded_partner = []
        canceled_reg_ids = []  # for exempted people

        for r in res:
            partner_ids.append(int(r['partner_id'][0]))

        cond = [['id', 'in', partner_ids],
                ['cooperative_state', 'in', ['exempted']]]
        fields = ['id']
        res_exempted = self.o_api.search_read('res.partner', cond, fields)
        for r in res_exempted:
            excluded_partner.append(int(r['id']))
        for r in res:
            if not (int(r['partner_id'][0]) in excluded_partner):
                d_begin = r['date_begin']
                (d, h) = d_begin.split(' ')
                (_h, _m, _s) = h.split(':')
                if int(_h) < 21:
                    ids.append(int(r['id']))
            else:
                canceled_reg_ids.append(int(r['id']))
        # coop_logger.info("Traitement absences shift_registration ids %s", ids)
        f = {'state': absence_status, 'date_closed': now.isoformat()}
        update_shift_reg_result = {'update': self.o_api.update('shift.registration', ids, f), 'reg_shift': res, 'errors': []}
        if update_shift_reg_result['update'] is True:
            update_shift_reg_result['process_status_res'] = self.o_api.execute('res.partner','run_process_target_status', [])
            # change shift state by triggering button_done method for all related shifts
            if len(canceled_reg_ids) > 0:
                f = {'state': 'cancel', 'date_closed': now.isoformat()}
                self.o_api.update('shift.registration', canceled_reg_ids, f)
           
            try:
                self.o_api.execute('shift.shift', 'button_done', self.id)
            except Exception as e:
                marshal_none_error = 'cannot marshal None unless allow_none is enabled'
                if not (marshal_none_error in str(e)):
                    update_shift_reg_result['errors'].append({'shift_id': self.id, 'msg' :str(e)})

        return update_shift_reg_result

    def record_absences(self, request):
        """Can only been executed if an Odoo user is beeing connected."""
        res = {}
        try:
            if CagetteUser.are_credentials_ok(request) is True:
                self._process_associated_people_extra_shift_done()
                res = self._process_related_shift_registrations()
            else:
                res['error'] = 'Forbidden'
        except Exception as e:
            coop_logger.error("CagetteService.record_absences :  %s %s", str(self.id), str(e))
            res['error'] = str(e)
        return res
