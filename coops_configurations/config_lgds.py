"""Company specific data values."""


EMAIL_DOMAIN = 'lesgrainsdesel.fr'
OPEN_ON_SUNDAY = True

MAG_NAME = ''
OFFICE_NAME = ''
COMPANY_NAME = 'Les Grains de Sel'
MAX_BEGIN_HOUR = '19:00'
WELCOME_ENTRANCE_MSG = 'Bienvenue aux Grains de Sel!'


CAP_JOURNAL_ID = 9
CAP_APPELE_NON_VERSE_ACCOUNT_ID = 529
CAP_APPELE_VERSE_ACCOUNT_ID = 8
CAP_INVOICE_LINE_ACCOUNT_ID = 7
FUNDRAISING_CAT_ID = 1
UNITE_UOM_ID = 1
PARTS_A_PRODUCT_ID = 5
PARTS_B_PRODUCT_ID = 6
PARTS_C_PRODUCT_ID = 7
PARTS_PRICE_UNIT = 10.0
PARTS_A_PRICE_UNIT = PARTS_PRICE_UNIT


COOP_BARCODE_RULE_ID = 55

CHECK_PAYMENT_ID = 8
VIREMENT_PAYMENT_ID = 16
CASH_PAYMENT_ID = 18
CB_PAYMENT_ID = 15
PARR_PAYMENT_ID = 29

STOCK_LOC_ID = 12

LOSSES_LOC_ID = 33
LOSSES_PICKING_TYPE_ID = 10

AUTOCONSO_LOC_ID = 27
AUTOCONSO_PICKING_TYPE_ID = 8

MEALS_LOC_ID = 36
MEALS_PICKING_TYPE_ID = 17


CATEG_FRUIT = 189
CATEG_LEGUME = 189
VRAC_CATEGS = [197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207]
EXPORT_POS_CAT_FOR_SCALES = True
SHELF_LABELS_ADD_FIELDS = ['code', 'category_print_id', 'base_price', 'categ_id', 'country_id', 'label_ids', 'uom_id', 'suppliers']
FLV_CSV_NB = 6


COEFF_MAG_ID = 1

RECEPTION_PDT_LABELS_FN = 'print_product_labels()'
RECEPTION_PDT_LABELS_TEXT = 'Cliquez sur ce bouton pour imprimer les étiquettes code-barres à coller sur les produits'
RECEPTION_PDT_LABELS_BTN_TEXT = 'Lancer l\'impression'
RECEPTION_SHELF_LABEL_PRINT = True
FIXED_BARCODE_PREFIX = '0499'
RECEPTION_ADD_ADMIN_MODE = True
RECEPTION_ADD_ALL_LEFT_IS_GOOD = True

SUBSCRIPTION_PAYMENT_MEANINGS = [
                                  {'code': 'cash', 'title': 'Espèces', 'journal_id': CASH_PAYMENT_ID},
                                  {'code': 'ch', 'title': 'Chèque', 'journal_id': CHECK_PAYMENT_ID},
                                  {'code': 'cb', 'title': 'Carte bancaire', 'journal_id': CB_PAYMENT_ID},
                                  {'code': 'vir', 'title': 'Virement', 'journal_id': VIREMENT_PAYMENT_ID},
                                  {'code': 'parr', 'title': 'Parrainage', 'journal_id': PARR_PAYMENT_ID}
                                 ]
SUBSCRIPTION_INPUT_BARCODE = True
SUBSCRIPTION_NAME_SEP = ', '
CONCAT_NAME_ORDER = 'LF'
SUBSCRIPTION_ASK_FOR_SEX = True
WITH_WEBSITE_MENU = True
SUBSCRIPTION_ADD_STREET2 = True
SUBSCRIPTION_ADD_SECOND_PHONE = True
FORCE_HYPHEN_IN_SUBSCRIPTION_FIRSTNAME = False

SHIFT_EXCHANGE_DAYS_TO_HIDE = ''
CALENDAR_NO_MORE_LINK = True
SHIFT_INFO = """Aux Grains de Sel, un service est une plage horaire un jour en particulier, par exemple : le mardi 25/09/2018 à 13h15.
<br />A l'inverse, un créneau est une plage horaire régulière, par exemple, tous les mardi de semaine A à 13h15."""
PB_INSTRUCTIONS = """Si j'ai un problème, que je suis désinscrit, que je veux changer de créneaux ou quoi que ce soit, merci de contacter le Bureau Des Membres"""

ADMINS = ['francois@cooperatic.fr']
BRINKS_MUST_IDENTIFY = True


ENTRANCE_FTOP_BUTTON_DISPLAY = False

CUSTOM_CSS_FILES = {'all': ['common_lgds.css'],
                    'members': ['inscription_lgds.css','member_lgds.css']}

# Should block service exchange if old service is happening in less than 24h
BLOCK_SERVICE_EXCHANGE_24H_BEFORE = False