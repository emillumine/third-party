"""Company specific data values."""

"""Odoo coop specific constants ."""
EMAIL_DOMAIN = 'supercafoutch.fr'
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

EXPORT_COMPTA_FORMAT = 'Quadratus'

COOP_BARCODE_RULE_ID = 11

CHECK_PAYMENT_ID = 8
VIREMENT_PAYMENT_ID = 16
CASH_PAYMENT_ID = 18
CB_PAYMENT_ID = 15
HELLO_ASSO_PAYMENT_ID = 29
SUMUP_PAYMENT_ID = 30

STOCK_LOC_ID = 12

CATEG_FRUIT = 151
CATEG_LEGUME = 152
VRAC_CATEGS = [166, 167, 174, 179]
FLV_CSV_NB = 2


COEFF_MAG_ID = 1

RECEPTION_PDT_LABELS_FN = 'print_product_labels()'
RECEPTION_PDT_LABELS_TEXT = 'Cliquez sur ce bouton pour imprimer les étiquettes code-barres à coller sur les produits'
RECEPTION_PDT_LABELS_BTN_TEXT = 'Lancer l\'impression'
RECEPTION_SHELF_LABEL_PRINT = False
FIXED_BARCODE_PREFIX = '0491'


SUBSCRIPTION_PAYMENT_MEANINGS = [
                                  {'code': 'cash', 'title': 'Espèces', 'journal_id': CASH_PAYMENT_ID},
                                  {'code': 'ch', 'title': 'Chèque', 'journal_id': CHECK_PAYMENT_ID},
                                  {'code': 'cb', 'title': 'Carte bancaire', 'journal_id': CB_PAYMENT_ID},
          {'code': 'vir', 'title': 'Virement', 'journal_id': VIREMENT_PAYMENT_ID},
          {'code': 'hel', 'title': 'HelloAsso', 'journal_id': HELLO_ASSO_PAYMENT_ID}
                                 ]


SHOP_HEADER_IMG = 'https://supercafoutch.fr/wp-content/uploads/2018/02/SC-logo-4-invert@1x.png'
SHOP_OPENING = {'jeu.': [{'start': '15:45', 'end': '18:15'}, {'start': '18:30', 'end': '21:00'}],
    'ven.': [{'start': '15:45', 'end': '18:15'}, {'start': '18:30', 'end': '21:00'}],
                'sam.': [{'start': '10:15', 'end': '12:45'}, {'start': '13:00', 'end': '15:30'}]}

SHOP_SLOT_SIZE = 15  #  minutes
SHOP_CATEGORIES = {
            'epicerie': {'id': 75, 'label': 'Epicerie'},
            'liquide': {'id': 96, 'label': 'Liquides'},
            'produits_frais': {'id': 104, 'label': 'Frais'},
            'surgeles': {'id': 115, 'label': 'Surgelés'},
            'bazar': {'id': 122, 'label': 'Bazar'},
            'droguerie': {'id': 127, 'label': 'Droguerie Hygiène'},
            'parfumerie': {'id': 133, 'label': 'Parfumerie'}
}

DELIVERY_CAN_BUY = True

EXCLUDE_SHOP_CATEGORIES=[]

DEFAULT_MAX_TIMESLOT_CARTS = 1
MIN_DELAY_FOR_SLOT = 0
HOURS_FOR_VALIDATION_SHOP = 2

SHOW_SUBSTITUTION_OPTION = False
CART_VALIDATION_BOTTOM_MSG = ""

SHOP_LIMIT_PRODUCTS = ['relatively_available', 'no_shelf']
VALIDATION_ORDER_MAIL_TEMPLATE = 'shop/supercafoutch_validation_mail.html'


ADMINS = ['francois@cooperatic.fr']
BRINKS_MUST_IDENTIFY = True
PROMOTE_SHELFS_IDS = []
DISCOUNT_SHELFS_IDS = []
FL_SHELFS = []
VRAC_SHELFS = []
