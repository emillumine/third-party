from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI


class CagetteMembersSpace(models.Model):
    """Class to manage othe members space"""

    def __init__(self):
        """Init with odoo id."""
        self.o_api = OdooAPI()

    def get_shifts_history(self, partner_id, limit, offset, date_from):
        """ Get partner shifts history """
        res = {}
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
            f = ['create_date', 'shift_id', 'name', 'state', 'is_late', 'is_makeup']

            marshal_none_error = 'cannot marshal None unless allow_none is enabled'
            try:
                res = self.o_api.search_read('shift.registration', cond, f, limit=limit, offset=offset,
                            order='date_begin DESC')
            except Exception as e:
                if not (marshal_none_error in str(e)):
                    res['error'] = repr(e)
                    coop_logger.error(res['error'] + ' : %s', str(payment_id))
                else:
                    res = []

        except Exception as e:
            print(str(e))

        return res
 