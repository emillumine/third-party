# Company specific data values

(TODO : Specify which one are mandatory)

### General

- OPEN_ON_SUNDAY = True

        Used to show Sunday on calendars (set SHIFT_EXCHANGE_DAYS_TO_HIDE = '' to show sunday shifts)

- EMAIL_DOMAIN = 'lesgrainsdesel.fr'

- MAG_NAME = ''

        Could be "Cleme" for example, at Cagette (Location are associated to shift template)

- OFFICE_NAME = ''

        Was used for La Cagette (shift template)

- MAX_BEGIN_HOUR = '19:00'

        Used to draw weeks planning

- COMPANY_NAME = 'Les Grains de Sel'

- ADMIN_IDS = [13]

        Used to show hidden things. for example, input barcode in shelf adding product (Odoo user id array)

- ADMINS = ['webmaster@coop.dom']


- TOOLS_SERVER = 'https://outils.lacagette-coop.fr'

        Used for file generation (scale or print purpose)

- BRINKS_MUST_IDENTIFY = True

        If True, visitor has to use its Odoo user to identify

- UNITE_UOM_ID = 1

        DB uom unit id (only use for shares invoice)


### Member subscription

- FORCE_HYPHEN_IN_SUBSCRIPTION_FIRSTNAME = False

- CONCAT_NAME_ORDER = 'LF'

- SUBSCRIPTION_ADD_SECOND_PHONE = True

- SUBSCRIPTION_ADD_STREET2 = True

- SUBSCRIPTION_ASK_FOR_SEX = True

- SUBSCRIPTION_INPUT_BARCODE = True

- SUBSCRIPTION_NAME_SEP = ', '

- COOP_BARCODE_RULE_ID = 11

- FUNDRAISING_CAT_ID = 1

- PARTS_PRICE_UNIT = 10.0

- PARTS_A_PRICE_UNIT = PARTS_PRICE_UNIT

- PARTS_A_PRODUCT_ID = 5

- PARTS_B_PRODUCT_ID = 6

- PARTS_C_PRODUCT_ID = 7

- CAP_APPELE_NON_VERSE_ACCOUNT_ID = 529

- CAP_APPELE_VERSE_ACCOUNT_ID = 8

- CAP_INVOICE_LINE_ACCOUNT_ID = 8

- CAP_JOURNAL_ID = 9

- CASH_PAYMENT_ID = 18

- CB_PAYMENT_ID = 15

- CHECK_PAYMENT_ID = 8

- VIREMENT_PAYMENT_ID = 16

- HELLO_ASSO_PAYMENT_ID = 29

- SUMUP_PAYMENT_ID = 30

- SUBSCRIPTION_PAYMENT_MEANINGS = [
                                  {'code': 'cash', 'title': 'Espèces','journal_id': CASH_PAYMENT_ID},
                                  {'code': 'ch', 'title': 'Chèque', 'journal_id': CHECK_PAYMENT_ID},
                                  {'code': 'cb', 'title': 'Carte bancaire', 'journal_id': CB_PAYMENT_ID},
                                  {'code': 'vir', 'title': 'Virement', 'journal_id': VIREMENT_PAYMENT_ID}]

        Used to generate payment meanings in subscription form

- MAX_CHQ_NB = 12

        Maximum accepted checks numbers

- INPUT_PHONE_PATTERN = "^(0\d{9})$"
        Regexp pattern which is used to validate values input in phone fields
        Default is "^((\+33(-| )\d{1})|\d{2})(\.| )\d{2}(\.| )\d{2}(\.| )\d{2}(\.| )\d{2}$"

- PHONE_PAIRS_SEPARATOR = "."
        Character which by used to separate every 2 phone figures (04.67.23.89.21 for example)
        Default is " "

### Scales and labels files generation

- DAV_PATH = '/data/dav/cagette'

        DAV_PATH is a directory managed by Apache2 dav module

- CATEG_FRUIT = 151

- CATEG_LEGUME = 152

- FIXED_BARCODE_PREFIX = '0491'

- FLV_CSV_NB = 4

        How many distinct file for scale input have to be generated

- VRAC_CATEGS = [166, 167, 174]

- SHELF_LABELS_ADD_FIELDS = ['category_print_id', 'categ_id', 'country_id', 'label_ids', 'uom_id']

        Fields add to generated text file

- EXPORT_POS_CAT_FOR_SCALES = True

        Exports POS categories data as a JSON file, and add a POS Category column in CSV file for scale database update

### Shop module

- SHOP_CAN_BUY = False

        If set to False, visitors can only see products (quantities and prices)

- SHOP_SLOT_SIZE = 30

        How many minutes for a slot

- DEFAULT_MAX_TIMESLOT_CARTS = 5

        How many carts can be produced by slot
        This value can be changed in shop admin page

- HOURS_FOR_VALIDATION_SHOP = 2

        How many hours are left for people to complete cart (for the choosen date)
        Once time has left, booked picking hour is canceled.
        Visitor has to choose a new picking date and hour

- MIN_DELAY_FOR_SLOT = 4

        How far has to be the closest picking date (in hours)
        For example, with 4 value, if it's 08:00 am, the picking date could not be before 12:00 am (even if a slot is free before)

- DISCOUNT_SHELFS_IDS = [74]

- EXCLUDE_SHOP_CATEGORIES = [108]

- FL_SHELFS = [16, 17, 18]

        Fruits et Légumes shelves (Odoo database ids)

- VRAC_SHELFS = [20, 38]


- PROMOTE_SHELFS_IDS = [68]


- CART_VALIDATION_BOTTOM_MSG = "Pour des raisons d'hygiène les commandes seront préparées dans des sacs en papier kraft qui vous seront facturées, 0,24€ pour les petits et 0,77€ pour les grands. Merci de votre compréhension"


- SHOP_CATEGORIES = {}

- SHOP_EXTRA_MENUS = ['shop/planning_livraison_pains.html', 'shop/combien_ca_pese.html']

- SHOP_HEADER_IMG = 'https://supercafoutch.fr/wp-content/uploads/2018/02/SC-logo-4-invert@1x.png'

- SHOP_LIMIT_PRODUCTS = ['relatively_available', 'no_shelf']

- SHOP_OPENING = {'mar.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'mer.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'jeu.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'ven.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}],
                'sam.': [{'start': '10:30', 'end': '14:00'}, {'start': '15:30', 'end': '20:00'}]
                }

- SHOP_OPENING_START_DATE = '2020-06-02'

- SHOP_SURVEY_LINK = 'https://docs.google.com/forms/d/e/1FAIpQLSczl0mMRwx3s9LbUSPYwwFTiiRa6agx7YkQM9cL41eiQnXNUw/viewform'

- SHOW_SUBSTITUTION_OPTION = False

- VALIDATION_ORDER_MAIL_TEMPLATE = 'shop/supercafoutch_validation_mail.html'



### Entrance module

- WELCOME_ENTRANCE_MSG = "Bienvenue dans ce super-marché"

        Message shown as H1 at screen top

- WELCOME_SUBTITLE_ENTRANCE_MSG = "Vous êtes venu aujourd'hui pour..."

        Text to introduce button texts (Here for shopping or for a shift)

- ENTRANCE_COME_FOR_SHOPING_MSG = "Hey coucou toi ! Cet été nous sommes plus de <strong>1000 acheteur·euses</strong> pour seulement  <strong>300 coopérateur·rice·s</strong> en service. <br />Tu fais tes courses à La Cagette cet été ?<br/> Inscris-toi sur ton espace membre !"

- ENTRANCE_FTOP_BUTTON_DISPLAY = False

        Hide the "I come as FTOP" button when set on False

- ENTRANCE_SHOPPING_BTN = "…faire <b>mes courses 🛒"

- ENTRANCE_SERVICE_BTN = "…faire <b>mon service 🤝"

- ENTRANCE_EXTRA_BUTTONS_DISPLAY = False (no button is shown above shift coop. list) (True if not set)

- ENTRANCE_EASY_SHIFT_VALIDATE = False (default value)

        When set to True allow coop to identify and have 1 point (only if FTOP)

- ENTRANCE_ADD_PT_EVENT_NAME = 'Add 1 point name throught easy validate' (default : 'Validation service comité'')

- ENTRANCE_MISSED_SHIFT_BEGIN_MSG (default :  "")

        This message is dispayed when time to register is last

- ENTRANCE_EASY_SHIFT_VALIDATE_MSG (default = 'Je valide mon service "Comité"')

        (makes sens if ENTRANCE_EASY_SHIFT_VALIDATE is True)

### Member space

- EM_URL = ''

        Url to redirect once member has validated its data (empty in simple use)

- WITH_WEBSITE_MENU = True

        If set to True, a "personnal data" menu is shown, permitting connected member to modify its data.

- CALENDAR_NO_MORE_LINK = True

        If True, in shifts calendar view (to choose one or exchange one)
        all shifts are shown (if False, a link to show more shifts is shown)

- CAL_INITIAL_VIEW = 'dayGridWeek'

        If not set, default view is 'dayGridMonth'

- SHIFT_EXCHANGE_DAYS_TO_HIDE = ''

        By default, if this variable is not set, sunday is hidden
        To hide Sunday and Monday, set this to "0,1"
- SHIFT_COLOR_TOGGLE_NUM = 7

        If not set, shift class for rendering color is based on % (toggle limit = 50%)
        If set with a number, this number is used (toggle limit = this number, including it)

- SHIFT_INFO = """A la cagette, un service est une plage de trois heures un jour en particulier, par exemple : le mardi 25/09/2018 à 13h15.
<br />A l'inverse, un créneau est une plage de trois heures régulière, par exemple, tous les mardi de semaine A à 13h15."""

- PB_INSTRUCTIONS = """Si j'ai un problème, que je suis désinscrit, que je veux changer de créneaux ou quoi que ce soit, merci de vous rendre dans la section \"J'ai un problème\" sur le site web de <a href=\"https://lacagette-coop.fr/?MonEspaceMembre\">La Cagette</a>"""

- UNSUBSCRIBED_MSG = 'Vous êtes désincrit·e, merci de remplir <a href="https://docs.google.com/forms/d/e/1FAIpQLSfPiC2PkSem9x_B5M7LKpoFNLDIz0k0V5I2W3Mra9AnqnQunw/viewform">ce formulaire</a> pour vous réinscrire sur un créneau.<br />Vous pouvez également contacter le Bureau des Membres en remplissant <a href="https://docs.google.com/forms/d/e/1FAIpQLSeZP0m5-EXPVJxEKJk6EjwSyZJtnbiGdYDuAeFI3ENsHAOikg/viewform">ce formulaire</a>'

        Message shown to people when they connect to the Member Space

### Reception

- RECEPTION_ADD_ADMIN_MODE = True

- RECEPTION_ADD_ALL_LEFT_IS_GOOD = True

        A second button appears to make all pending products (left list) to be considered as "good"
        (RECEPTION_ADD_ADMIN_MODE needs to be set at True)

- RECEPTION_MERGE_ORDERS_PSWD = 'pass2makeApause'

        Password to enter to validate merge orders processing
        It has been set only to stop member action, considering the impact of the merge

- RECEPTION_PDT_LABELS_BTN_TEXT = 'Lancer l\'impression'

- RECEPTION_PDT_LABELS_FN = 'print_product_labels()'

- RECEPTION_PDT_LABELS_TEXT = 'Cliquez sur ce bouton pour imprimer les étiquettes code-barres à coller sur les produits'

- RECEPTION_SHELF_LABEL_PRINT = True

- COEFF_MAG_ID = 1

        DB coeff id, needed to compute product shelf price

### Stocks

- STOCK_LOC_ID = 12

        Only used in Inventory module, which is no more in use

- LOSSES_LOC_ID = 33

- LOSSES_PICKING_TYPE_ID = 10

- AUTOCONSO_LOC_ID = 27

- AUTOCONSO_PICKING_TYPE_ID = 7

- MEALS_LOC_ID = 33

- MEALS_PICKING_TYPE_ID = 10




### Miscellious

- EXPORT_COMPTA_FORMAT = 'Quadratus'

        If not set, export format is the one used by La Cagette
        Quadratus has been introduced to fit with Supercafoutch need.



- CUSTOM_CSS_FILES = {'all': ['common_lgds.css'],
                    'members': ['inscription_lgds.css']}

        To insert a CSS to all modules, key is 'all' (files actually put in outils/static/css)
