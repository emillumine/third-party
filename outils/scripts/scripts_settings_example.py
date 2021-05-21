SECRET_KEY = 'Mettre_plein_de_caracteres_aleatoires_iezezezeezezci'

ODOO = {
    'url': 'http://127.0.0.1:8069'
    'user': 'api',
    'passwd': 'xxxxxxxxxxxx',
    'db': 'bd_test',
}

COUCHDB = {
    'url': 'http://127.0.0.1:5984',
    'dbs': {
              'member': 'coops',
              'inventory': 'inventory',
              'envelops': 'envelop',
              'shop': 'shopping_carts'
            }
}
