# Inscriptions
MAG_NAME = "Demo interfoodcoop"
OFFICE_NAME = "demo"
MAX_BEGIN_HOUR = '19:00'

CASH_PAYMENT_ID = 18
CB_PAYMENT_ID = 15
CHECK_PAYMENT_ID = 8
VIREMENT_PAYMENT_ID = 16

SUBSCRIPTION_PAYMENT_MEANINGS = [
    {'code': 'cash', 'title': 'Espèces','journal_id': CASH_PAYMENT_ID},
    {'code': 'ch', 'title': 'Chèque', 'journal_id': CHECK_PAYMENT_ID},
    {'code': 'cb', 'title': 'Carte bancaire', 'journal_id': CB_PAYMENT_ID},
    {'code': 'vir', 'title': 'Virement', 'journal_id': VIREMENT_PAYMENT_ID}
]

# Borne d'accueil /members/
WELCOME_ENTRANCE_MSG = "Bienvenue dans ce super-marché"
# Sous-titre optionel
#WELCOME_SUBTITLE_ENTRANCE_MSG = "Vous êtes venu aujourd'hui pour…"
#ENTRANCE_SHOPPING_BTN = "…faire <b>mes courses 🛒"
#ENTRANCE_SERVICE_BTN = "…faire <b>mon service 🤝"

# Shop
COMPANY_NAME = "Demo interfoodcoop"
SHOP_CATEGORIES = {}
EXCLUDE_SHOP_CATEGORIES = []
MIN_DELAY_FOR_SLOT = 4
