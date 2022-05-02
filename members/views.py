"""Members main page."""
from outils.common_imports import *
from outils.for_view_imports import *

from members.models import CagetteMember
from members.models import CagetteUser
from members.models import CagetteMembers
from members.models import CagetteServices
from outils.forms import GenericExportMonthForm

import datetime

default_fields = ['name',
                  'image_medium']

def index(request):
    """Page de présentation des membres."""
    from outils.common import MConfig
    template = loader.get_template('members/index.html')

    context = {
        'form': '', 'title': 'Coopérateurs',
        'WELCOME_ENTRANCE_MSG': getattr(settings, 'WELCOME_ENTRANCE_MSG', 'Bienvenue !'),
        'WELCOME_SUBTITLE_ENTRANCE_MSG': getattr(settings, 'WELCOME_SUBTITLE_ENTRANCE_MSG', ''),
        'ENTRANCE_SHOPPING_BTN': getattr(settings, 'ENTRANCE_SHOPPING_BTN', 'Je viens faire mes courses'),
        'ENTRANCE_SERVICE_BTN': getattr(settings, 'ENTRANCE_SERVICE_BTN', 'Je viens faire mon service'),
        'ENTRANCE_MISSED_SHIFT_BEGIN_MSG': getattr(settings, 'ENTRANCE_MISSED_SHIFT_BEGIN_MSG',
                                                   "La période pendant laquelle il est possible de s'enregistrer est close."),
        'ENTRANCE_EASY_SHIFT_VALIDATE_MSG': getattr(settings, 'ENTRANCE_EASY_SHIFT_VALIDATE_MSG',
                                                    'Je valide mon service "Comité"'),
        'CONFIRME_PRESENT_BTN' : getattr(settings, 'CONFIRME_PRESENT_BTN', 'Présent.e'),
        'LATE_MODE': getattr(settings, 'ENTRANCE_WITH_LATE_MODE', False),
        'ENTRANCE_VALIDATE_PRESENCE_MESSAGE' : getattr(settings, 'ENTRANCE_VALIDATE_PRESENCE_MESSAGE', '')
    }

    for_shoping_msg = getattr(settings, 'ENTRANCE_COME_FOR_SHOPING_MSG', '')

    msettings = MConfig.get_settings('members')
    if 'msg_accueil' in msettings:
        for_shoping_msg = msettings['msg_accueil']['value']
    context['ENTRANCE_COME_FOR_SHOPING_MSG'] = for_shoping_msg
    context['ftop_btn_display'] = getattr(settings, 'ENTRANCE_FTOP_BUTTON_DISPLAY', True)
    context['extra_btns_display'] = getattr(settings, 'ENTRANCE_EXTRA_BUTTONS_DISPLAY', True)
    context['easy_shift_validate'] = getattr(settings, 'ENTRANCE_EASY_SHIFT_VALIDATE', False)
    if context['easy_shift_validate'] is True:
        committees_shift_id = CagetteServices.get_committees_shift_id()
        if committees_shift_id is None:
            return HttpResponse("Le créneau des comités n'est pas configuré dans Odoo !")
        else:
            context['committees_shift_id'] = committees_shift_id

    if 'no_picture_member_advice' in msettings:
        if len(msettings['no_picture_member_advice']['value']) > 0:
            context['no_picture_member_advice'] = msettings['no_picture_member_advice']['value']

    response = HttpResponse(template.render(context, request))
    return response

def index_date(request, date):
    return index(request)

def exists(request, mail):
    answer = CagetteMember.exists(mail)
    return JsonResponse({'answer': answer})

def is_associated(request, id_parent):
    answer = CagetteMember.is_associated(id_parent)
    return JsonResponse({'answer': answer})

def getmemberimage(request, id):
    m = CagetteMember(id)
    call_res = m.get_image()
    return HttpResponse(call_res)

def get_all_shift_templates(request):
    """Return all stored shift templates."""
    creneaux = CagetteServices.get_all_shift_templates()
    return JsonResponse({'creneaux': creneaux})


@never_cache
def inscriptions(request, type=1):
    """Generate first subscription step form, used during meeting."""
    """
    type = 1 show every shift template.
    type = 2 show gathered shift templates (by hour)
    """
    template = loader.get_template('members/inscriptions.html')

    committees_shift_id = CagetteServices.get_committees_shift_id()
    context = {
        'type': type, 'title': 'Inscriptions',
        'couchdb_server': settings.COUCHDB['url'],
        'mag_place_string': settings.MAG_NAME,
        'office_place_string': settings.OFFICE_NAME,
        'max_begin_hour': settings.MAX_BEGIN_HOUR,
        'payment_meanings': settings.SUBSCRIPTION_PAYMENT_MEANINGS,
        'force_firstname_hyphen': getattr(settings, 'FORCE_HYPHEN_IN_SUBSCRIPTION_FIRSTNAME', True),
        'input_barcode': getattr(settings, 'SUBSCRIPTION_INPUT_BARCODE', False),
        'email_domain': getattr(settings, 'EMAIL_DOMAIN', 'lacagette-coop.fr'),
        'ask_for_sex': getattr(settings, 'SUBSCRIPTION_ASK_FOR_SEX', False),
        'open_on_sunday': getattr(settings, 'OPEN_ON_SUNDAY', False),
        'POUCHDB_VERSION': getattr(settings, 'POUCHDB_VERSION', ''),
        'max_chq_nb': getattr(settings, 'MAX_CHQ_NB', 12),
        'show_ftop_button': getattr(settings, 'SHOW_FTOP_BUTTON', True),
        'db': settings.COUCHDB['dbs']['member'],
        'ASSOCIATE_MEMBER_SHIFT' : getattr(settings, 'ASSOCIATE_MEMBER_SHIFT', ''),
        'prepa_odoo_url' : getattr(settings, 'PREPA_ODOO_URL', '/members/prepa-odoo'),
        'committees_shift_id': committees_shift_id,
    }

    response = HttpResponse(template.render(context, request))
    return response


def get_shift_templates_next_shift(request, id):
    """Retrieve next shift instance."""
    s = CagetteServices.get_shift_templates_next_shift(id)
    return JsonResponse({'shift': s})


@never_cache
def prepa_odoo(request):
    """Generate coop subscription form, to be fill by BDM."""
    template = loader.get_template('members/prepa_odoo.html')
    context = {'title': 'Préparation Odoo Inscriptions',
               'warning_placeholder': 'Par exemple, il manque un chèque',
               'couchdb_server': settings.COUCHDB['url'],
               'mag_place_string': settings.MAG_NAME,
               'office_place_string': settings.OFFICE_NAME,
               'max_begin_hour': settings.MAX_BEGIN_HOUR,
               'payment_meanings': settings.SUBSCRIPTION_PAYMENT_MEANINGS,
               'input_phone_pattern': getattr(settings, 'INPUT_PHONE_PATTERN', default_input_phone_pattern),
               'input_barcode': getattr(settings, 'SUBSCRIPTION_INPUT_BARCODE', False),
               'ask_for_sex': getattr(settings, 'SUBSCRIPTION_ASK_FOR_SEX', False),
               'ask_for_street2': getattr(settings, 'SUBSCRIPTION_ADD_STREET2', False),
               'ask_for_second_phone': getattr(settings, 'SUBSCRIPTION_ADD_SECOND_PHONE', False),
               'show_ftop_button': getattr(settings, 'SHOW_FTOP_BUTTON', True),
               'db': settings.COUCHDB['dbs']['member']}

    # with_addr_complement
    # with_second_phone
    response = HttpResponse(template.render(context, request))
    return response


def validation_inscription(request, email):
    """Generate coop validation form."""
    template = loader.get_template('members/validation_coop.html')

    referer = request.META.get('HTTP_REFERER')

    doc = CagetteMember.get_couchdb_data(email)

    if (len(doc) > 1 and doc['checks_nb'] == ''):
        doc['checks_nb'] = 0
        context = {'title': 'Validation inscription',
                   'coop': json.dumps(doc),
                   'coop_msg': doc.get('coop_msg'),
                   'warning_placeholder':
                   """Signaler ici une anomalie du formulaire,
                   un problème lié à votre souscription""",
                   'referer': referer,
                   'mag_place_string': settings.MAG_NAME,
                   'office_place_string': settings.OFFICE_NAME,
                   'max_begin_hour': settings.MAX_BEGIN_HOUR,
                   'payment_meanings': settings.SUBSCRIPTION_PAYMENT_MEANINGS,
                   'input_phone_pattern': getattr(settings, 'INPUT_PHONE_PATTERN', default_input_phone_pattern),
                   'ask_for_sex': getattr(settings, 'SUBSCRIPTION_ASK_FOR_SEX', False),
                   'ask_for_street2': getattr(settings, 'SUBSCRIPTION_ADD_STREET2', False),
                   'ask_for_second_phone': getattr(settings, 'SUBSCRIPTION_ADD_SECOND_PHONE', False),
                   'show_ftop_button': getattr(settings, 'SHOW_FTOP_BUTTON', True),
                   'em_url': settings.EM_URL,
                   'WELCOME_ENTRANCE_MSG': settings.WELCOME_ENTRANCE_MSG,
                   'WELCOME_SUBTITLE_ENTRANCE_MSG': getattr(settings, 'WELCOME_SUBTITLE_ENTRANCE_MSG', '')}

    # with_addr_complement
    response = HttpResponse(template.render(context, request))
    return response


def coop_warning_msg(request):
    """Store new coop warning message, while reading validation form."""
    m = CagetteMember.store_warning_msg(request.POST)
    return JsonResponse({'storing_result': m})


def latest_coop_id(request):
    """Retrieve lastest coop id."""
    """No more used"""
    res = CagetteMember.latest_coop_id()
    id = None
    if len(res) > 0:
        id = res[0]['barcode_base']
    return JsonResponse({'latest_coop_id': id})


def create_from_buffered_data(request):
    """Create new contact in Odoo from couchDB data."""
    id = CagetteMember.create_from_buffered_data(request.POST)
    return JsonResponse({'odoo_id': id})


def coop_validated_data(request):
    """New coop has validated its data, let's store them."""
    r = CagetteMember.finalize_coop_creation(request.POST)
    return JsonResponse({'result': r})


def get(request, id):
    """Retrieve some member data (minimal, for test)."""
    m = CagetteMember(id).get_data()
    return JsonResponse({'mobject': m})


def get_couchdb_odoo_markers(request, email):
    """Retrieve couchDB odoo_id and odoo_state data to check if any exists."""
    """Used by Espace Membre to decide if validation form should be shown."""
    # Verifier que email est bien du type email
    doc = CagetteMember.get_couchdb_data(email)
    odoo_id = None
    validation_state = None
    if 'odoo_id' in doc:
        odoo_id = doc['odoo_id']
    if 'validation_state' in doc:
        validation_state = doc['validation_state']
    return JsonResponse({'odoo_id': odoo_id, 'validation_state': validation_state})


def menu(request):
    """Simple member menu : inscription, prepa-odoo."""
    template = loader.get_template('members/menu.html')
    context = {'title': 'Menu gestion membre'}
    return HttpResponse(template.render(context, request))


def verify_final_state(request):
    """Verify members subscription final state."""
    res = CagetteMembers.verify_subscription_state()
    return JsonResponse({'res': res})

def update_couchdb_barcodes(request):
    res = CagetteMembers.update_couchdb_barcodes()
    return JsonResponse({'res': res})
# Borne accueil


def search(request, needle, shift_id):
    """Search member has been requested."""
    search_type = request.GET.get('search_type', "full")

    try:
        key = int(needle)
        k_type = 'barcode_base'
        if len(needle) == 13:
            k_type = 'barcode'
            key = needle
    except ValueError:
        key = needle
        k_type = 'name'

    res = CagetteMember.search(k_type, key, shift_id, search_type)
    return JsonResponse({'res': res})


def save_photo(request, id):
    """From webcam."""
    image = request.POST.get("photo", "")
    # TODO clean (enlever ; etc....)
    m = CagetteMember(id)
    # res = 'Photo envoyée'
    res = m.set_odoo_image(image)
    return JsonResponse({'res': res})


def services_at_time(request, time, tz_offset):
    """Retrieve present services with member linked."""
    services = CagetteServices.get_services_at_time(time, int(tz_offset))
    return JsonResponse({'res': services})


def record_service_presence(request):
    """Record service presence."""
    res = {}
    try:
        rid = int(request.POST.get("rid", -1))  # registration id
        mid = int(request.POST.get("mid", 0))  # member id
        sid = int(request.POST.get("sid", 0))  # shift id
        stid = int(request.POST.get("stid", 0))  # shift_ticket_id
        cancel = request.POST.get("cancel") == 'true'
        typeAction = str(request.POST.get("type"))

        app_env = getattr(settings, 'APP_ENV', "prod")
        if (rid > -1 and mid > 0):
            overrided_date = ""
            if app_env != "prod":
                import re
                o_date = re.search(r'/([^\/]+?)$', request.META.get('HTTP_REFERER'))
                if o_date:
                    overrided_date = re.sub(r'(%20)',' ', o_date.group(1))

            if(not cancel):
                # rid = 0 => C'est un rattrapage, sur le service
                if sid > 0 and stid > 0:
                    # Add member to service and take presence into account
                    res['rattrapage'] = CagetteServices.record_rattrapage(mid, sid, stid, typeAction)
                    if res['rattrapage'] is True:
                        res['update'] = 'ok'
                else:
                    if (CagetteServices.registration_done(rid, overrided_date, typeAction) is True):
                        res['update'] = 'ok'
                    else:
                        res['update'] = 'ko'
                if res['update'] == 'ok':
                    members = CagetteMember.search('id', mid)
                    m = members[0]
                    for k in ['image_medium', 'barcode', 'barcode_base']:
                        del m[k]
                    next_shift = {}
                    if len(m['shifts']) > 0:
                        next_shift = m['shifts'][0]
                        del m['shifts']
                        m['next_shift'] = next_shift
                    res['member'] = m
            else: CagetteServices.reopen_registration(rid, overrided_date)
                
    except Exception as e:
        res['error'] = str(e)
    return JsonResponse({'res': res})

def easy_validate_shift_presence(request):
    """Add a presence point if the request is valid."""
    res = {}
    try:
        coop_id = int(request.POST.get("coop_id", "nan"))
        res = CagetteServices.easy_validate_shift_presence(coop_id)
    except Exception as e:
        res['error'] = str(e)
    if 'error' in res:
        if res['error'] == "One point has been added less then 24 hours ago":
            #  TODO : use translation (all project wide)
            res['error'] = "Vous ne pouvez pas valider plus d'un service par 24h"
        return JsonResponse(res, status=500)
    else:
        return JsonResponse(res, safe=False)

def record_absences(request, date):
    return JsonResponse({'res': CagetteServices.record_absences(date)})

def close_ftop_service(request):
    """Close the closest past FTOP service"""
    return JsonResponse({'res': CagetteServices.close_ftop_service()})

def get_credentials(request):
    """Receiving user mail + password, returns id, rights and auth token"""
    return JsonResponse(CagetteUser.get_credentials(request))

def remove_data_from_CouchDB(request):
    """Receiving coop email to delete associated data in couchdb subscription database"""
    res = CagetteMember.remove_data_from_CouchDB(request)
    return JsonResponse(res,safe=False)

def create_from_csv(request):
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            import csv
            rows = []
            with open('members/import_coops.csv') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    rows.append(CagetteMember.create_from_cvs_row(row))
            res = rows
        except Exception as e:
            res['error'] = str(e)
    else:
        res['error'] = "Forbidden"
    return JsonResponse(res, safe=False)

def panel_get_purchases(request):
    """Return INRA panel purchases (possible filter : month (w/wo year))"""
    if request.method == 'GET':
        template = loader.get_template('outils/data_export.html')
        context = {'form': GenericExportMonthForm(),
                   'title': 'Export données coopérateurs'}
        response = HttpResponse(template.render(context, request))
    else:
        res = CagetteMembers.get_inra_panel_purchases(request)
        if (('data' in res) and len(res['data']) == 2 and len(res['data']['lines']) > 1):
            import csv
            month = res['params']['month']
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment;filename="export_conso_panel_' + month + '.csv"'
            writer = csv.writer(response, delimiter=';', quoting=csv.QUOTE_NONE, escapechar='\\')
            for row in res['data']['lines']:
                writer.writerow(row)
            fn = 'members/data/conso_panel_resume_' + month + '.txt'
            file = open(fn, 'w')
            file.write(res['data']['sum_up'])
            file.close()

        else:
            message = 'Anomalie : '
            if 'error' in res:
                message += 'erreur -> ' + res['error']
            if 'params' in res:
                message += ' ' + str(res['params'])
            response = HttpResponse(message)
    return response

def add_shares_to_member(request):
    res = {}
    try:
        data = json.loads(request.body.decode())
        partner_id = int(data["partner_id"])
        amount = int(data["amount"])
        
    except Exception as e:
        res['error'] = "Wrong params"
        return JsonResponse(res, safe=False, status=400)

    m = CagetteMember(partner_id)
    today = datetime.date.today().strftime("%Y-%m-%d")
    res = m.create_capital_subscription_invoice(amount, today)
    return JsonResponse(res, safe=False)

# # #  BDM # # #
def save_partner_info(request):
    """ Endpoint the front-end will call for saving partner information """
    res = {}
    credentials = CagetteMember.get_credentials(request)
    if ('success' in credentials):
        data = {}
        for post in request.POST:
            if post != "idPartner" and data != "verif_token" :
                data[post]= request.POST[post]
        
        cm = CagetteMember(int(request.POST['idPartner']))
        result = cm.save_partner_info(int(request.POST['idPartner']),data)
        res['success']= result
        return JsonResponse(res)
    else:
        res['error'] = "Forbidden"
        return JsonResponse(res, safe=False)
