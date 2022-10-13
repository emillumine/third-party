from outils.common_imports import *
from outils.for_view_imports import *

from django.urls import reverse

from outils.common import Verification
from outils.common import MConfig
from members.models import CagetteMember
from shifts.models import CagetteShift
from members_space.models import CagetteMembersSpace

import hashlib


def _get_response_according_to_credentials(request, credentials, context, template):
    response = HttpResponse(template.render(context, request))
    if ('token' in credentials and 'auth_token' in credentials):
        response.set_cookie('id', credentials['id'])
        response.set_cookie('token', credentials['token'])
        response.set_cookie('auth_token', credentials['auth_token'])
        response.set_cookie('deconnect_option', 'true')
    return response

def index(request, exception=None):
    """Display main screen for the members space"""

    credentials = CagetteMember.get_credentials(request)

    context = {
        'title': 'Espace Membre',
        'COMPANY_LOGO': getattr(settings, 'COMPANY_LOGO', None),
        'block_actions_for_attached_people' : getattr(settings, 'BLOCK_ACTIONS_FOR_ATTACHED_PEOPLE', True),
        'permanent_message': getattr(settings, 'PERMANENT_MESSAGE_BELOW_CONNECTION_FIELDS', None),
        'block_service_exchange_24h_before' : getattr(settings, 'BLOCK_SERVICE_EXCHANGE_24H_BEFORE', True),
    }

    template = loader.get_template('members_space/index.html')

    if ('failure' in credentials):
        # Bad credentials (or none)
        template = loader.get_template('website/connect.html')
        context['msg'] = ''
        if 'msg' in credentials:
            context['msg'] = credentials['msg']
        context['password_placeholder'] = 'Naissance (jjmmaaaa)'
        context['is_member_space'] = True
    elif ('validation_state' in credentials) and credentials['validation_state'] == 'waiting_validation_member':
        # First connection, until the member validated his account
        template = loader.get_template('members/validation_coop.html')

        referer = request.META.get('HTTP_REFERER')

        doc = CagetteMember.get_couchdb_data(credentials['login'])

        if len(doc) > 1:
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
                       'em_url': settings.EM_URL,
                       'WELCOME_ENTRANCE_MSG': settings.WELCOME_ENTRANCE_MSG,
                       'WELCOME_SUBTITLE_ENTRANCE_MSG': getattr(settings, 'WELCOME_SUBTITLE_ENTRANCE_MSG', '')}
            if hasattr(settings, 'SUBSCRIPTION_ASK_FOR_SEX'):
                context['ask_for_sex'] = settings.SUBSCRIPTION_ASK_FOR_SEX
            if hasattr(settings, 'SUBSCRIPTION_ADD_STREET2'):
                context['ask_for_street2'] = settings.SUBSCRIPTION_ADD_STREET2
            if hasattr(settings, 'SUBSCRIPTION_ADD_SECOND_PHONE'):
                context['ask_for_second_phone'] = settings.SUBSCRIPTION_ADD_SECOND_PHONE
    else:
        # Members space
        if 'id' in request.COOKIES:
            partner_id = request.COOKIES['id']
        else:
            partner_id = credentials['id']

        cs = CagetteShift()

        partnerData = cs.get_data_partner(partner_id)

        if 'create_date' in partnerData:
            md5_calc = hashlib.md5(partnerData['create_date'].encode('utf-8')).hexdigest()
            partnerData['verif_token'] = md5_calc

            # Error case encountered from Odoo: member in delay state and last extension is over -> member is suspended
            try:
                if partnerData['cooperative_state'] == "delay" and datetime.datetime.strptime(partnerData['date_delay_stop'], '%Y-%m-%d') < datetime.datetime.now():
                    partnerData['cooperative_state'] = "suspended"
            except:
                pass

            # look for parent for associated partner
            if partnerData["parent_id"] is not False:
                partnerData["parent_name"] = partnerData["parent_id"][1]
                partnerData["parent_id"] = partnerData["parent_id"][0]
                md5_calc = hashlib.md5(partnerData['parent_create_date'].encode('utf-8')).hexdigest()
                partnerData['parent_verif_token'] = md5_calc
                partnerData['makeups_to_do'] = partnerData['parent_makeups_to_do']
                partnerData['date_delay_stop'] = partnerData['parent_date_delay_stop']
                partnerData['can_have_delay'] = cs.member_can_have_delay(int(partnerData["parent_id"]))
                partnerData['extra_shift_done'] = partnerData["parent_extra_shift_done"]

            else:
                partnerData["parent_name"] = False
                partnerData['can_have_delay'] = cs.member_can_have_delay(int(partner_id))

            # look for associated partner for parents
            cm = CagetteMember(partner_id)
            associated_partner = cm.search_associated_people()

            partnerData["associated_partner_id"] = False if associated_partner is None else associated_partner["id"]
            partnerData["associated_partner_name"] = False if associated_partner is None else associated_partner["name"]

            if (associated_partner is not None and partnerData["associated_partner_name"].find(str(associated_partner["barcode_base"])) == -1):
                partnerData["associated_partner_name"] = str(associated_partner["barcode_base"]) + ' - ' + partnerData["associated_partner_name"]

            m = CagetteMembersSpace()
            context['show_faq'] = getattr(settings, 'MEMBERS_SPACE_FAQ_TEMPLATE', 'members_space/faq.html')
            context['show_abcd_calendar'] = getattr(settings, 'SHOW_ABCD_CALENDAR_TAB', True)
            partnerData["comite"] = m.is_comite(partner_id)

            context['partnerData'] = partnerData

            # Days to hide in the calendar
            days_to_hide = "0"
            context['ADDITIONAL_INFO_SHIFT_PAGE'] = getattr(settings, 'ADDITIONAL_INFO_SHIFT_PAGE', '')
            if hasattr(settings, 'SHIFT_EXCHANGE_DAYS_TO_HIDE'):
                days_to_hide = settings.SHIFT_EXCHANGE_DAYS_TO_HIDE
            context['daysToHide'] = days_to_hide
            can_add_shift = getattr(settings, 'CAN_ADD_SHIFT', False)
            context['canAddShift'] = "true" if can_add_shift is True else "false"

            msettings = MConfig.get_settings('members')
            context['forms_link'] = msettings['forms_link']['value'] if 'forms_link' in msettings else ''
            context['unsuscribe_form_link'] = ( msettings['unsuscribe_form_link']['value'] 
                if 'unsuscribe_form_link' in msettings 
                else '')
            context['member_cant_have_delay_form_link'] = ( msettings['member_cant_have_delay_form_link']['value'] 
                if 'member_cant_have_delay_form_link' in msettings 
                else '')
            context['abcd_calendar_link'] = ( msettings['abcd_calendar_link']['value'] 
                if 'abcd_calendar_link' in msettings 
                else '')
            context['request_form_link'] = msettings['request_form_link']['value'] if 'request_form_link' in msettings else ''
            context['late_service_form_link'] = msettings['late_service_form_link']['value'] if 'late_service_form_link' in msettings else ''
            context['change_template_form_link'] = msettings['change_template_form_link']['value'] if 'change_template_form_link' in msettings else ''
            context['associated_subscribe_form_link'] = msettings['associated_subscribe_form_link']['value'] if 'associated_subscribe_form_link' in msettings else ''
            context['associated_unsubscribe_form_link'] = msettings['associated_unsubscribe_form_link']['value'] if 'associated_unsubscribe_form_link' in msettings else ''
            context['template_unsubscribe_form_link'] = msettings['template_unsubscribe_form_link']['value'] if 'template_unsubscribe_form_link' in msettings else ''
            context['change_email_form_link'] = msettings['change_email_form_link']['value'] if 'change_email_form_link' in msettings else ''
            context['coop_unsubscribe_form_link'] = msettings['coop_unsubscribe_form_link']['value'] if 'coop_unsubscribe_form_link' in msettings else ''
            context['sick_leave_form_link'] = msettings['sick_leave_form_link']['value'] if 'sick_leave_form_link' in msettings else ''
            context['underage_subscribe_form_link'] = msettings['underage_subscribe_form_link']['value'] if 'underage_subscribe_form_link' in msettings else ''
            context['helper_subscribe_form_link'] = msettings['helper_subscribe_form_link']['value'] if 'helper_subscribe_form_link' in msettings else ''
            context['helper_unsubscribe_form_link'] = msettings['helper_unsubscribe_form_link']['value'] if 'helper_unsubscribe_form_link' in msettings else ''
            context['covid_form_link'] = msettings['covid_form_link']['value'] if 'covid_form_link' in msettings else ''
            context['covid_end_form_link'] = msettings['covid_end_form_link']['value'] if 'covid_end_form_link' in msettings else ''
        else:
            # may arrive when switching database without cleaning cookie
            return redirect('/website/deconnect')

    return _get_response_according_to_credentials(request, credentials, context, template)

def home(request):
    """ 
        Endpoint the front-end will call to load the "home" page. 

        Consequently, the front-end url should be unknown from the server so the user is redirected to the index,
        then the front-end index will call this endpoint to load the home page
    """
    template = loader.get_template(getattr(settings, 'MEMBERS_SPACE_HOME_TEMPLATE', 'members_space/home.html'))
    coop_can_change_shift_template = getattr(settings, 'COOP_CAN_CHANGE_SHIFT_TEMPLATE', False)
    if coop_can_change_shift_template is True:
        # make further investigation only if COOP_CAN_CHANGE_SHIFT_TEMPLATE is True
        if 'id' in request.COOKIES:
            partner_id = request.COOKIES['id']
        cs = CagetteShift()
        partnerData = cs.get_data_partner(partner_id)
        if partnerData['cooperative_state'] == "unsubscribed":
            coop_can_change_shift_template = False
    context = {
        'title': 'Espace Membres',
        'coop_can_change_shift_template': coop_can_change_shift_template,
        'max_begin_hour': settings.MAX_BEGIN_HOUR,
    }
    # Get messages to display
    msettings = MConfig.get_settings('members')
    if 'msg_accueil' in msettings:
        context['msg_accueil'] = msettings['msg_accueil']['value']
    if 'shop_opening_hours' in msettings:
        context['shop_opening_hours'] = msettings['shop_opening_hours']['value']
    return HttpResponse(template.render(context, request))

def my_info(request):
    """ Endpoint the front-end will call to load the "My info" page. """
    template = loader.get_template('members_space/my_info.html')
    context = {
        'title': 'Mes Infos',
        'understand_my_status': getattr(settings, 'MEMBERS_SPACE_SHOW_UNDERSTAND_MY_STATUS', True),
        'understand_my_status_template': getattr(settings, 'MEMBERS_SPACE_UNDERSTAND_MY_STATUS_TEMPLATE', "members_space/understand_my_status.html")
    }
    return HttpResponse(template.render(context, request))

def my_shifts(request):
    """ Endpoint the front-end will call to load the "My shifts" page. """
    template = loader.get_template('members_space/my_shifts.html')
    context = {
        'title': 'Mes Services',
    }
    return HttpResponse(template.render(context, request))

def shifts_exchange(request):
    """ Endpoint the front-end will call to load the "Shifts exchange" page. """
    template = loader.get_template('members_space/shifts_exchange.html')
    context = {
        'title': 'Échange de Services',
        'canAddShift': getattr(settings, 'CAN_ADD_SHIFT', False)
    }
    return HttpResponse(template.render(context, request))

def faqBDM(request):
    template_path = getattr(settings, 'MEMBERS_SPACE_FAQ_TEMPLATE', 'members_space/faq.html')
    content = ''
    if template_path:
        template = loader.get_template(template_path)
        context = {
            'title': 'foire aux questions',
        }
        content = template.render(context, request)

    return HttpResponse(content)

def no_content(request):
    """ Endpoint the front-end will call to load the "No content" page. """
    template = loader.get_template('members_space/no_content.html')
    context = {
        'title': 'Contenu non trouvé',
    }
    return HttpResponse(template.render(context, request))

def get_shifts_history(request):
    res = {}
    partner_id = int(request.GET.get('partner_id'))

    m = CagetteMembersSpace()

    limit = int(request.GET.get('limit'))
    offset = int(request.GET.get('offset'))
    date_from = getattr(settings, 'START_DATE_FOR_SHIFTS_HISTORY', '2018-01-01')
    res["data"] = m.get_shifts_history(partner_id, limit, offset, date_from)

    return JsonResponse(res)

def offer_extra_shift(request):
    res = {}
    partner_id = int(request.POST['partner_id'])

    m = CagetteMember(partner_id)
    res = m.update_extra_shift_done(0)

    return JsonResponse(res)
