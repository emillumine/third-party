"""commons functions to collect data through API."""

from django.conf import settings
import xmlrpc.client
import couchdb
import logging

coop_logger = logging.getLogger("coop.framework")

class OdooAPI:
    """Class to handle  Odoo API requests."""

    url = settings.ODOO['url']
    user = settings.ODOO['user']
    passwd = settings.ODOO['passwd']
    db = settings.ODOO['db']
    common = None
    uid = None
    models = None

    def __init__(self):
        """Initialize xmlrpc connection."""
        try:
            common_proxy_url = '{}/xmlrpc/2/common'.format(self.url)
            object_proxy_url = '{}/xmlrpc/2/object'.format(self.url)
            self.common = xmlrpc.client.ServerProxy(common_proxy_url)
            self.uid = self.common.authenticate(self.db,
                                                self.user, self.passwd, {})
            self.models = xmlrpc.client.ServerProxy(object_proxy_url)
        except:
            coop_logger.error("Impossible d'initialiser la connexion API Odoo")

    def get_entity_fields(self, entity):
        fields = self.models.execute_kw(self.db, self.uid, self.passwd,
                                        entity, 'fields_get',
                                        [],
                                        {'attributes': ['string', 'help',
                                         'type']})
        return fields

    def search_count(self, entity, cond=[]):
        """Return how many lines are matching the request."""
        return self.models.execute_kw(self.db, self.uid, self.passwd,
                                      entity, 'search_count', [cond])

    def search_read(self, entity, cond=[], fields={}, limit=3500, offset=0,
                    order='id ASC'):
        """Main api request, retrieving data according search conditions."""
        fields_and_context = {'fields': fields,
                              'context': {'lang': 'fr_FR', 'tz': 'Europe/Paris'},
                              'limit': limit,
                              'offset': offset,
                              'order': order
                              }

        return self.models.execute_kw(self.db, self.uid, self.passwd,
                                      entity, 'search_read', [cond],
                                      fields_and_context)

    def update(self, entity, ids, fields):
        """Update entities which have ids, with new fields values."""
        context = {
                    'context': {'lang': 'fr_FR', 'tz': 'Europe/Paris'}
                  }
        return self.models.execute_kw(self.db, self.uid, self.passwd,
                                      entity, 'write', [ids, fields], context)

    def create(self, entity, fields):
        """Create entity instance with given fields values."""
        return self.models.execute_kw(self.db, self.uid, self.passwd,
                                      entity, 'create', [fields])

    def execute(self, entity, method, ids, params={}):
        return self.models.execute_kw(self.db, self.uid, self.passwd,
                                      entity, method, [ids], params)

    def authenticate(self, login, password):
        return self.common.authenticate(self.db, login, password, {})

    def get_system_param(self, key):
        value = ''
        try:
            res = self.search_read('ir.config_parameter',
                                   [['key', '=', key]],
                                   ['value'])
            if res:
                value = res[0]['value']
        except Exception as e:
            coop_logger.error('get_system_param: (%s) %s', key, str(e))
        return value

class CouchDB:
    """Class to handle interactions with CouchDB"""

    if 'private_url' in settings.COUCHDB:
        url = settings.COUCHDB['private_url']
    else:
        url = settings.COUCHDB['url']
    dbs = settings.COUCHDB['dbs']
    db = None
    dbc = None

    def __init__(self, arg_db=''):
        url = self.url
        dbs = self.dbs
        if len(arg_db) > 0:
            db = arg_db

        couchserver = couchdb.Server(url)
        self.dbc = couchserver[dbs[db]]

    def getDocById(self, id):
        # https://gist.github.com/marians/8e41fc817f04de7c4a70
        return self.dbc[id]

    def getView(self, view, my_key=None):
        #  return self.dbc.view(view, my_key,include_docs=False)
        return self.dbc.view(view, include_docs=True)

    def getAllDocs(self, key=None, value=None, with_key=True, descending=False):
        """
            Get all documents
            If key and value provided :
                Filter with the key/value pair if 'with_key' is True
                Filter without key or without value if 'with_key' if False
        """
        res = []
        for item in self.dbc.view('_all_docs', include_docs=True, descending=descending):
            m = item.doc
            if key and value:
                if with_key:
                    if (key in m) and m[key] == value:
                        res.append(m)
                else:
                    if not(key in m) or m[key] != value:
                        res.append(m)
            else:
                res.append(m)
        return res

    def updateDoc(self, data, key_name='_id', remove_keys=[]):
        """
            Update a document with data
            Fetch the document using provided key_name
                - key must be in data
                - key must be unique (duh)
            Remove the remove_keys from document

            Returns None in case of error.
        """
        existing = None
        try:
            if key_name in data:
                try:
                    key_value = int(data[key_name])
                except:
                    key_value = data[key_name]
                _rev = None

                # Find existing doc
                document = None
                try:
                    # Use view if it exists for this key
                    index = self.dbc['_design/index']
                    if index and ('by_' + key_name) in index['views']:
                        for item in self.dbc.view('index/by_' + key_name, key=key_value, include_docs=True, limit=1):
                            document = item.doc
                except:
                    pass
                    # else fetch in all docs
                if document is None:
                    for item in self.dbc.view('_all_docs', include_docs=True):
                        if key_name in item.doc:
                            if item.doc[key_name] == key_value:
                                document = item.doc

                if not (document is None):
                    existing = document
                if ('_rev' in data) and data['_rev'] == document['_rev']:
                    existing = document

                if not (existing is None):
                    for key in data:
                        value = data[key]
                        if (key == 'odoo_id'):
                            value = int(value)
                        existing[key] = value
                    for rk in remove_keys:
                        existing.pop(rk, None)
                    if ('_rev' in data):
                        (_id, _rev) = self.dbc.save(existing)
                    else:
                        res = self.dbc.update([existing])
                        if res[0] and (res[0][0] is True):
                            _rev = res[0][2]

                    if not(_rev is None):
                        existing['_rev'] = _rev
                else:
                    coop_logger.warning('CouchDB : Document not found')
            else:
                coop_logger.warning('CouchDB : Key not found in data.')
        except Exception as e:
            coop_logger.error('Update couchdb: %s, %s', str(e), str(data))

        return existing

    def delete(self, doc):
        # Database has to be purged to completly remove data
        # http://docs.couchdb.org/en/stable/api/database/misc.html
        res = ''
        try:
            res = self.dbc.delete(doc)
            # only admin can definitly purge docs
        except Exception as e:
            res = str(e)
        return res

class MConfig:
    """Module configuration"""

    def get_settings(module):
        import json
        try:
            with open(module + '/settings.json') as json_file:
                msettings = json.load(json_file)
                # file automatically closed with 'with..as' statement
        except Exception as e:
            msettings = {}

        return msettings

    def save_settings(module, data):
        import json # TODO : which performance to declare here instead of file headings
        res = False
        try:
            with open(module + '/settings.json', 'w') as outfile:
                    json.dump(data, outfile)
            res = True
        except Exception as e:
            coop_logger.error(str(e))
        return res

class Verification:

    @staticmethod
    def verif_token(token, coop_id):
        import hashlib
        match = False
        api = OdooAPI()
        cond = [['id', '=', coop_id]]
        fields = ['create_date']
        res = api.search_read('res.partner', cond, fields, 1)
        if (res and len(res) == 1):
            coop = res[0]
            md5_calc = hashlib.md5(coop['create_date'].encode('utf-8')).hexdigest()
            if token == md5_calc:
                match = True
        return match
