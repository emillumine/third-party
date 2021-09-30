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
    }

    template = loader.get_template('members_space/index.html')

    if ('failure' in credentials):
        # Bad credentials (or none)
        template = loader.get_template('website/connect.html')
        context['msg'] = ''
        if 'msg' in credentials:
            context['msg'] = credentials['msg']
        context['password_placeholder'] = 'Naissance (jjmmaaaa)'
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

            if partnerData["parent_id"] is not False:
                partnerData["parent_name"] = partnerData["parent_id"][1]
                partnerData["parent_id"] = partnerData["parent_id"][0]
            else:
                partnerData["parent_name"] = False

            partnerData['can_have_delay'] = cs.member_can_have_delay(int(partner_id))

            context['partnerData'] = partnerData

            # Days to hide in the calendar
            days_to_hide = "0"
            context['ADDITIONAL_INFO_SHIFT_PAGE'] = getattr(settings, 'ADDITIONAL_INFO_SHIFT_PAGE', '')
            if hasattr(settings, 'SHIFT_EXCHANGE_DAYS_TO_HIDE'):
                days_to_hide = settings.SHIFT_EXCHANGE_DAYS_TO_HIDE
            context['daysToHide'] = days_to_hide

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

        else:
            # may arrive when switching database without cleaning cookie
            return redirect('/website/deconnect')

    return _get_response_according_to_credentials(request, credentials, context, template)

def home(request):
    template = loader.get_template('members_space/home.html')
    context = {
        'title': 'Espace Membres',
    }
    # Get messages to display
    msettings = MConfig.get_settings('members')
    if 'msg_accueil' in msettings:
        context['msg_accueil'] = msettings['msg_accueil']['value']
    if 'shop_opening_hours' in msettings:
        context['shop_opening_hours'] = msettings['shop_opening_hours']['value']
    return HttpResponse(template.render(context, request))

def my_info(request):
    template = loader.get_template('members_space/my_info.html')
    context = {
        'title': 'Mes Infos',
    }
    return HttpResponse(template.render(context, request))

def my_shifts(request):
    template = loader.get_template('members_space/my_shifts.html')
    context = {
        'title': 'Mes Services',
    }
    return HttpResponse(template.render(context, request))

def shifts_exchange(request):
    template = loader.get_template('members_space/shifts_exchange.html')
    context = {
        'title': 'Échange de Services',
    }
    return HttpResponse(template.render(context, request))

def no_content(request):
    template = loader.get_template('members_space/no_content.html')
    context = {
        'title': 'Contenu non trouvé',
    }
    return HttpResponse(template.render(context, request))

def get_points_history(request):
    res = {}
    partner_id = int(request.GET.get('partner_id'))

    m = CagetteMembersSpace()

    limit = int(request.GET.get('limit'))
    offset = int(request.GET.get('offset'))
    shift_type = request.GET.get('shift_type')
    date_from = getattr(settings, 'START_DATE_FOR_POINTS_HISTORY', '2018-01-01')
    res["data"] = m.get_points_history(partner_id, limit, offset, date_from, shift_type)

    return JsonResponse(res)