from django.db import models
from outils.common_imports import *
from members.models import CagetteServices

from outils.common import OdooAPI


class CagetteMembersSpace(models.Model):
    """Class to manage othe members space"""

    def __init__(self):
        """Init with odoo id."""
        self.o_api = OdooAPI()

    def is_comite(self, partner_id):
        """Check if partner is from comite."""
        cond = [['partner_id.id', '=', partner_id]]
        fields = ['shift_template_id', 'is_current']
        shiftTemplate = self.o_api.search_read('shift.template.registration', cond, fields)
        if (shiftTemplate and len(shiftTemplate) > 0):
            s_t_id = None
            for s_t in shiftTemplate:
                if s_t['is_current'] is True:
                    s_t_id = s_t['shift_template_id'][0]
        if s_t_id == CagetteServices.get_committees_shift_id():
            return True
        else:
            return False

    def get_shifts_history(self, partner_id, limit, offset, date_from):
        """ Get partner shifts history """
        res = []
        paginated_res = []
        today = str(datetime.date.today())

        try:
            cond = [
                ['partner_id', '=', partner_id], 
                ['create_date', '>', date_from],
                ['date_begin', '<', today],
                ['state', '!=', 'draft'],
                ['state', '!=', 'open'],
                ['state', '!=', 'waiting'],
                ['state', '!=', 'replaced'],
                ['state', '!=', 'replacing'],
            ]
            f = ['create_date', 'date_begin', 'shift_id', 'name', 'state', 'is_late', 'is_makeup']

            marshal_none_error = 'cannot marshal None unless allow_none is enabled'
            try:
                res = self.o_api.search_read('shift.registration', cond, f, order='date_begin DESC')
            except Exception as e:
                if not (marshal_none_error in str(e)):
                    print(str(e))
                    coop_logger.error(repr(e) + ' : %s', str(partner_id))
                else:
                    res = []

            # Get committees shifts
            committees_shifts_name = getattr(settings, 'ENTRANCE_ADD_PT_EVENT_NAME', 'Validation service comité')
            cond = [
                ['partner_id', '=', partner_id], 
                ['name', '=', committees_shifts_name]
            ]
            f = ['create_date']

            try:
                res_committees_shifts = self.o_api.search_read('shift.counter.event', cond, f, order='create_date DESC')

                for committee_shift in res_committees_shifts:
                    item = {
                        "create_date": committee_shift["create_date"],
                        "date_begin": committee_shift["create_date"],
                        "shift_id": False,
                        "name": "Services des comités",
                        "state": "done",
                        "is_late": False,
                        "is_makeup": False,
                    }

                    res.append(item)

            except Exception as e:
                if not (marshal_none_error in str(e)):
                    print(str(e))
                    coop_logger.error(repr(e) + ' : %s', str(partner_id))
                else:
                    res = res + []

            # Add amnesty line
            is_amnesty = getattr(settings, 'AMNISTIE_DATE', 'false')
            company_code = getattr(settings, 'COMPANY_CODE', '')
            if is_amnesty and company_code == "lacagette":
                amnesty={}
                amnesty['is_amnesty'] = True
                amnesty['create_date'] = is_amnesty
                amnesty['date_begin'] = is_amnesty
                amnesty['shift_name'] = 'Amnistie'
                amnesty['state'] = ''
                res.append(amnesty)

            # ordering
            res.sort(key = lambda x: datetime.datetime.strptime(x['date_begin'], '%Y-%m-%d %H:%M:%S'), reverse=True)

            # Paginate
            end_index = offset + limit
            paginated_res = res[offset:end_index]

        except Exception as e:
            print(str(e))

        return paginated_res
 