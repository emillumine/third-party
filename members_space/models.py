from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI


class CagetteMembersSpace(models.Model):
    """Class to manage othe members space"""

    def __init__(self):
        """Init with odoo id."""
        self.o_api = OdooAPI()

    def get_points_history(self, partner_id, limit, date_from):
        """ Get partner points history with related shift registration if needed """
        cond = [
            ['partner_id', '=', partner_id], 
            ['type', '=', 'ftop'],
            ['create_date', '>', date_from]
        ]
        f = ['create_date', 'create_uid', 'shift_id', 'name', 'point_qty']

        # TODO get related data in service registration

        return self.o_api.search_read('shift.counter.event', cond, f, limit=limit, offset=0,
                    order='create_date DESC')
 