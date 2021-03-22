"""Secret data for DB connexion ."""

ODOO = {
    'url': 'http://odoo:8069',
    'user': 'api',
    'passwd': 'changeme',
    'db': 'foodcoops',
}

COUCHDB = {
    'url': 'http://couchdb:5984',
    'dbs': {
              'member': 'coops',
              'inventory': 'inventory',
              'envelops': 'envelop',
              'shop': 'shopping_carts'
            }
}


SQL_OFF = {
             'db': 'open_food_facts',
             'user': 'off_user',
             'pwd': 'xxxxxxxx'
          }

EMAIL_HOST = 'mail.proxy'
EMAIL_HOST_USER = 'nepasrepondre@mydomain.ext'
EMAIL_HOST_PASSWORD = 'xxxxx'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = 'nepasrepondre@mydomain.ext'

ADMINS = [('myname', 'django@mydomain.ext')]
