"""Company specific data values."""
MAG_NAME = 'Cleme'
OFFICE_NAME = ''
MAX_BEGIN_HOUR = '19:00'
COMPANY_NAME = 'La Cagette'
WELCOME_ENTRANCE_MSG = 'Bienvenue à La Cagette !'
WELCOME_MAIL_SUBJECT = 'Dernière étape de votre inscription à la Cagette.'
WELCOME_MAIL_TEMPLATE = 'members/bienvenue.html'
BLOCK_SERVICE_EXCHANGE_24H_BEFORE = True
USE_NEW_MEMBERS_SPACE = True
ASSOCIATE_MEMBER_SHIFT = 429
START_DATE_FOR_POINTS_HISTORY = "2021-07-01"
START_DATE_FOR_SHIFTS_HISTORY = "2021-07-01"
COMPANY_CODE = "lacagette"
AMNISTIE_DATE= "2021-11-24 23:00:00"
DEFAULT_SHIFT_TYPE = 'standard'
SHOW_FTOP_BUTTON = False
USE_STANDARD_SHIFT = True

OPEN_ON_SUNDAY = True

FLV_CSV_NB = 4

CAP_JOURNAL_ID = 9
CAP_APPELE_NON_VERSE_ACCOUNT_ID = 529
CAP_APPELE_VERSE_ACCOUNT_ID = 8
CAP_INVOICE_LINE_ACCOUNT_ID = 8

FUNDRAISING_CAT_ID = 1
UNITE_UOM_ID = 1
PARTS_A_PRODUCT_ID = 1008
PARTS_A_PRICE_UNIT = 10.0
COOP_BARCODE_RULE_ID = 11

CHECK_PAYMENT_ID = 8
CASH_PAYMENT_ID = 18



STOCK_LOC_ID = 12
CATEG_FRUIT = 151
CATEG_LEGUME = 152

COEFF_MAG_ID = 1

LOSSES_LOC_ID = 33
LOSSES_PICKING_TYPE_ID = 10

AUTOCONSO_LOC_ID = 27
AUTOCONSO_PICKING_TYPE_ID = 7

MEALS_LOC_ID = 36
MEALS_PICKING_TYPE_ID = 16

DEFAULT_MAX_TIMESLOT_CARTS = 5
MIN_DELAY_FOR_SLOT = 4
HOURS_FOR_VALIDATION_SHOP = 3

CART_VALIDATION_BOTTOM_MSG = "Pour des raisons d'hygiène les commandes seront préparées dans des sacs en papier kraft qui vous seront facturées, 0,24€ pour les petits et 0,77€ pour les grands. Merci de votre compréhension"

SUBSCRIPTION_PAYMENT_MEANINGS = [{'code': 'cash', 'title': 'Espèces', 'journal_id': CASH_PAYMENT_ID},
                                 {'code': 'ch', 'title': 'Chèque', 'journal_id': CHECK_PAYMENT_ID}]
EM_URL = ''


RECEPTION_MERGE_ORDERS_PSWD = 'jpsrcp'

DAV_PATH = '/shared_dir/dav/'
TOOLS_SERVER = 'http://10.203.101.242:2012'


ADMIN_IDS = [13]
BRINKS_MUST_IDENTIFY = False

SHOP_CAN_BUY = True
SHOP_OPENING = {'mar.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'mer.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'jeu.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'ven.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'sam.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}]
               }
#
# SHOP_OPENING = {}
SHOP_OPENING_START_DATE = '2020-06-02'
SHOP_SLOT_SIZE = 30  #  minutes


SHOP_CATEGORIES = {'epicerie': {'id': 75, 'label': 'Epicerie'},
                   'liquide': {'id': 96, 'label': 'Liquides'},
                   'produits_frais': {'id': 104, 'label': 'Frais'},
                   'surgeles': {'id': 115, 'label': 'Surgelés'},
                   'bazar': {'id': 122, 'label': 'Bazar'},
                   'droguerie': {'id': 127, 'label': 'Droguerie Hygiène'},
                   'parfumerie': {'id': 133, 'label': 'Parfumerie'}}
SHOP_EXTRA_MENUS = ['shop/planning_livraison_pains.html', 'shop/combien_ca_pese.html']
SHOP_SURVEY_LINK = ''
SHOP_LIMIT_PRODUCTS = ['relatively_available', 'no_shelf']
SHOP_HEADER_IMG = "https://odoo.demo.cooperatic.fr/web/binary/company_logo?db=lacagette&company=1"

EXCLUDE_SHOP_CATEGORIES = [108]
PROMOTE_SHELFS_IDS = [68]
DISCOUNT_SHELFS_IDS = [74]
FL_SHELFS = [16, 17, 18]
VRAC_SHELFS = [20, 38]

SHIFT_EXCHANGE_DAYS_TO_HIDE = ''
SHIFT_INFO  = """A la cagette, un service est une plage de trois heures un jour en particulier, par exemple : le mardi 25/09/2018 à 13h15.
<br />A l'inverse, un créneau est une plage de trois heures régulière, par exemple, tous les mardi de semaine A à 13h15."""
PB_INSTRUCTIONS = """Si j'ai un problème, que je suis désinscrit, que je veux changer de créneaux ou quoi que ce soit, merci de vous rendre dans la section \"J'ai un problème\" sur le site web de <a href=\"https://lacagette-coop.fr/?MonEspaceMembre\">La Cagette</a>"""

ENTRANCE_COME_FOR_SHOPING_MSG = "Hey coucou toi ! Cet été nous sommes plus de <strong>1000 acheteur·euses</strong> pour seulement  <strong>300 coopérateur·rice·s</strong> en service. <br />Tu fais tes courses à La Cagette cet été ?<br/> Inscris-toi sur ton espace membre !"
ENTRANCE_EXTRA_BUTTONS_DISPLAY = False
ENTRANCE_EASY_SHIFT_VALIDATE = True
ENTRANCE_MISSED_SHIFT_BEGIN_MSG = """La période pendant laquelle il est possible de s'enregistrer est close.<br/>
Pour tout problème ou demande vous pouvez contacter le Bureau des Membres via les formulaires depuis votre espace membre.
"""
ENTRANCE_VALIDATE_PRESENCE_MESSAGE = """
<div class="explanations">
 Ta présence a bien été validée ! Merci de te diriger au fond du magasin pour le lancement du créneau !
</div>
Ton prochain service <span class="service_verb">est prévu</span> le <span class="next_shift"></span>
"""
ENTRANCE_EASY_SHIFT_VALIDATE_MSG = """Si vous faites un service dans un comité, merci de <br/>
valider votre présence en cherchant<br/>
votre nom ou numéro ci-dessous
"""
# Members space / shifts
UNSUBSCRIBED_MSG = 'Vous êtes désincrit·e, merci de remplir <a href="">ce formulaire</a>'


UNSUBSCRIBED_FORM_LINK = ''

RECEPTION_PB = "Ici, vous pouvez signaler toute anomalie lors d'une réception, les produits non commandés, cassés ou pourris. \
        Merci d'indiquer un maximum d'informations, le nom du produit et son code barre."

CONFIRME_PRESENT_BTN = 'Clique ici pour valider ta présence'

ORDERS_HELPER_METABASE_URL = ""
