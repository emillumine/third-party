from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI


class CagetteMembersSpace(models.Model):
    """Class to manage othe members space"""

    def __init__(self):
        """Init with odoo id."""
        self.o_api = OdooAPI()
