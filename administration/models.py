from django.db import models
from outils.common_imports import *
from shelfs.models import Shelf, Shelfs
import glob

class ThirdPartyAdmin(models.Model):
    """Class to manage third party and view logs"""

    @staticmethod
    def get_inventory_backups():
        content = []
        files = []
        for file in glob.glob("data/inventories_backup/*.json"):
            files.append(file)
        files.sort()
        if len(files) > 0:
            shelfs_map = {}
            for shelf in Shelfs.get_all('simple'):
                shelfs_map[str(shelf['id'])] = shelf['name']
            for f in files:
                fn = f.split('/')[-1]
                inv_file = fn.replace(".json","")
                (timestamp, shelf_id) = inv_file.split('__')
                (date, hms) = timestamp.split('--')
                hms = hms.replace('-',':')
                content.append({'file': fn, 'date': date, 'hms': hms, 'shelf_id': shelf_id, 'shelf_name': shelfs_map[str(shelf_id)] })
        return content

    @staticmethod
    def merge_inventory_data(elts):
        result = {'name': '',
                  'inventory_status': '',
                  'list_processed': [],
                  'total_price': 0 }
        names = []
        for elt in elts:
            name = elt['name']
            if elt['inventory_status'] == "": 
                name += " (Etape 1)"
            else:
                name += " (Etape 2)"

            names.append(name)
            result['list_processed'] += elt['list_processed']
        result['name'] = ' // '.join(names)
        
        # Retrieve product data (price at date)
        # and compute total purchase price
        i = 0
        for inv_line in result['list_processed']:
            line_price = round(inv_line['standard_price'] * inv_line['qty'], 2)
            result['total_price'] += line_price
            result['list_processed'][i]['line_price'] = line_price
            i += 1
        return result

    @staticmethod
    def get_inventory_backup(file_names):
        data = []
        result = {}
        fn = file_names.split('|-|')
        try:
            for file_name in fn:
                fpath = "data/inventories_backup/" + file_name
                inventory_data = {}
                with open(fpath) as json_file:
                    inventory_data = json.load(json_file)
                    data.append(inventory_data)
            result = ThirdPartyAdmin.merge_inventory_data(data)

        except Exception as e:
            coop_logger.error("get_inventory_backup : %s", str(e))

        return result

    @staticmethod
    def get_django_logs():
    	content = []
    	for file in glob.glob("log/*.log"):
            with open(file) as f:
                content.append({'key' :file, 'value': f.readlines()})
    	return content
