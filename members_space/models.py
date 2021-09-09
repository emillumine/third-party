from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI


class CagetteMembersSpace(models.Model):
    """Class to manage othe members space"""

    def __init__(self):
        """Init with odoo id."""
        self.o_api = OdooAPI()

    def get_points_history(self, partner_id, limit, offset, date_from):
        """ Get partner points history with related shift registration if needed """
        cond = [
            ['partner_id', '=', partner_id], 
            ['type', '=', 'ftop'],
            ['create_date', '>', date_from]
        ]
        f = ['create_date', 'create_uid', 'shift_id', 'name', 'point_qty']

        res = self.o_api.search_read('shift.counter.event', cond, f, limit=limit, offset=offset,
                    order='create_date DESC')

        # Get related data from shift.registration
        shift_ids = []
        for item in res:
            item['is_late'] = False # So every item has the attribute

            if item['shift_id'] is not False:
                shift_ids.append(item['shift_id'][0])

        cond = [['shift_id', 'in', shift_ids]]
        f = ['is_late', 'shift_id']

        res_shift_registration = self.o_api.search_read('shift.registration', cond, f)

        for registration_item in res_shift_registration:
            for shift_counter_item in res:
                if (shift_counter_item['shift_id'] is not False 
                    and shift_counter_item['shift_id'] == registration_item['shift_id']):
                    shift_counter_item['is_late'] = registration_item['is_late']
                    break

        return res
 