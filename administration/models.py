from django.db import models
from outils.common_imports import *
import glob

class ThirdPartyAdmin(models.Model):
    """Class to manage third party and view logs"""

    @staticmethod
    def get_django_logs():
    	content = []
    	for file in glob.glob("log/*.log"):
            with open(file) as f:
                content.append({'key' :file, 'value': f.readlines()})
    	return content