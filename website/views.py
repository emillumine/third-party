# -*- coding: utf-8 -*-
"""Public access (need identification for data access)."""


from outils.common_imports import *
from outils.for_view_imports import *
from outils.images_imports import *

from members.models import CagetteMember
from shifts.models import CagetteShift

from django.contrib.auth.hashers import check_password, make_password


state_shift_allowed = ["up_to_date", "alert", "delay"]

def _get_response_according_credentials(request, credentials, context, template):
    response = HttpResponse(template.render(context, request))
    if ('token' in credentials and 'auth_token' in credentials):
        response.set_cookie('id', credentials['id'])
        response.set_cookie('token', credentials['token'])
        response.set_cookie('auth_token', credentials['auth_token'])
        response.set_cookie('deconnect_option', 'true')
    return response

def index(request):
    """Render main."""
    template = loader.get_template('shifts/shift_exchange.html')
    # print (make_password(request.POST.get('password')))
    # print (check_password('06101998', 'argon2$argon2i$v=19$m=512,t=2,p=2$bTBrSHFoS0JjSGUw$DvhMOtwbYW/qlhkYjW1k0g'))
    credentials = CagetteMember.get_credentials(request)
    context = {'title': 'Espace Coopérateurs',
               'SHIFT_INFO': settings.SHIFT_INFO,
               'PB_INSTRUCTIONS': settings.PB_INSTRUCTIONS,
               }

    context['with_website_menu'] = getattr(settings, 'WITH_WEBSITE_MENU', None)
    if ('failure' in credentials):
        template = loader.get_template('website/connect.html')
        context['msg'] = ''
        if 'msg' in credentials:
            context['msg'] = credentials['msg']
        context['password_placeholder'] = 'Naissance (jjmmaaaa)'
    elif ('validation_state' in credentials) and credentials['validation_state'] == 'waiting_validation_member':
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
                       'WELCOME_ENTRANCE_MSG': settings.WELCOME_ENTRANCE_MSG}
            if hasattr(settings, 'SUBSCRIPTION_ASK_FOR_SEX'):
                context['ask_for_sex'] = settings.SUBSCRIPTION_ASK_FOR_SEX
            if hasattr(settings, 'SUBSCRIPTION_ADD_STREET2'):
                context['ask_for_street2'] = settings.SUBSCRIPTION_ADD_STREET2
            if hasattr(settings, 'SUBSCRIPTION_ADD_SECOND_PHONE'):
                context['ask_for_second_phone'] = settings.SUBSCRIPTION_ADD_SECOND_PHONE

    else:
        import hashlib
        cs = CagetteShift()
        if 'id' in request.COOKIES:
            partner_id = request.COOKIES['id']
        else:
            partner_id = credentials['id']
        partnerData = cs.get_data_partner(partner_id)

        if 'create_date' in partnerData:
            md5_calc = hashlib.md5(partnerData['create_date'].encode('utf-8')).hexdigest()
            partnerData['verif_token'] = md5_calc
            # coop_logger.info(partnerData)
            # Error case encountered from Odoo: member in delay state and last extension is over -> member is suspended
            try:
                if partnerData['cooperative_state'] == "delay" and datetime.datetime.strptime(partnerData['date_delay_stop'], '%Y-%m-%d') < datetime.datetime.now():
                    partnerData['cooperative_state'] = "suspended"
            except:
                pass
            #  Following part is a copy of shifts/views.py (def home)
            context['partnerData'] = partnerData
            days_to_hide = "0"
            if hasattr(settings, 'SHIFT_EXCHANGE_DAYS_TO_HIDE'):
                days_to_hide = settings.SHIFT_EXCHANGE_DAYS_TO_HIDE
            context['daysToHide'] = days_to_hide
            if hasattr(settings, 'CALENDAR_NO_MORE_LINK'):
                if settings.CALENDAR_NO_MORE_LINK is True:
                    context['calendarEventNoMoreLinks'] = True
            if hasattr(settings, 'CAL_INITIAL_VIEW'):
                    context['calInitialView'] = settings.CAL_INITIAL_VIEW
            if not (partnerData['cooperative_state'] in state_shift_allowed):
                if hasattr(settings, 'UNSUBSCRIBED_MSG'):
                        context['UNSUBSCRIBED_MSG'] = settings.UNSUBSCRIBED_MSG
                template = loader.get_template('shifts/shift_states_not_allowed.html')
        else:
            # may arrive when switching database without cleaning cookie
            return redirect('/website/deconnect')
    return _get_response_according_credentials(request, credentials, context, template)

def info_perso(request):
    from outils.functions import extract_firstname_lastname
    # coop_logger.info('On cherche à accéder à la page info perso')
    context = {'title': 'Informations Personnelles',
               'info_perso': True}
    if hasattr(settings, 'WITH_WEBSITE_MENU'):
        context['with_website_menu'] = settings.WITH_WEBSITE_MENU
    template = loader.get_template('website/personnal_data.html')
    credentials = CagetteMember.get_credentials(request)

    if ('failure' in credentials):
        template = loader.get_template('website/connect.html')
        context['msg'] = ''
        if 'msg' in credentials:
            context['msg'] = credentials['msg']
        context['password_placeholder'] = 'Naissance (jjmmaaaa)'
    else:
        from datetime import datetime
        if 'id' in request.COOKIES:
            partner_id = request.COOKIES['id']
        else:
            partner_id = credentials['id']
        m = CagetteMember(partner_id)
        m_data = m.get_data(full=True)
        # recupérer 'partner_owned_share_ids'
        if len(m_data) > 0:
            template_data = m_data[0]
            img_src = ''
            if template_data['image_medium']:
                try:
                    img_code = base64.b64decode(template_data['image_medium'])
                    extension = imghdr.what('', img_code)
                    img_src = 'data:image/'+extension+';base64,'+template_data['image_medium']
                except:
                    pass
            else:
                # empty picture with instructions
                img_full_path = 'outils/static/img/empty_coop_picture_130.png'
                if hasattr(settings, 'EMPTY_COOP_PICTURE'):
                    img_full_path = settings.EMPTY_COOP_PICTURE
                with open(img_full_path, 'rb') as imgFile:
                    image = base64.b64encode(imgFile.read())
                    img_src = 'data:image/png;base64,' + image.decode('utf-8')
            template_data['img_src'] = img_src
            name_sep = ' '
            if hasattr(settings, 'SUBSCRIPTION_NAME_SEP'):
                name_sep = settings.SUBSCRIPTION_NAME_SEP
            template_data['name_sep'] = name_sep
            name_elts = extract_firstname_lastname(template_data['name'], name_sep)
            template_data['lastname'] = name_elts['lastname']
            if name_elts['firstname'] != name_elts['lastname']:
                template_data['firstname'] = name_elts['firstname']
            else:
                template_data['firstname'] = ''
            template_data['cooperative_state'] = CagetteMember.get_state_fr(template_data['cooperative_state'])
            try:
                template_data['create_date'] = datetime.strptime(template_data['create_date'], '%Y-%m-%d %H:%M:%S')
                if template_data['date_alert_stop']:
                    template_data['date_alert_stop'] = datetime.strptime(template_data['date_alert_stop'], '%Y-%m-%d')
                if template_data['date_delay_stop']:
                    template_data['date_delay_stop'] = datetime.strptime(template_data['date_delay_stop'], '%Y-%m-%d')
            except:
                pass

            context['data'] = template_data
        else: # no member found corresponding to partner_id
            return redirect('/website/deconnect')
        #  print(str(context['data']))
    return _get_response_according_credentials(request, credentials, context, template)

def update_info_perso(request):
    result = {}
    credentials = CagetteMember.get_credentials(request)

    if ('failure' in credentials):
        result['error'] = 'forbidden'
    else:
        if 'id' in request.COOKIES:
            partner_id = request.COOKIES['id']
        else:
            partner_id = credentials['id']
        m = CagetteMember(partner_id)
        result['process'] = m.update_from_ajax(request)

    return JsonResponse({'res': result})

def deconnect(request):
    referer = request.META.get('HTTP_REFERER')
    redirect_url = '/'
    if referer and len(referer) > 0:
        redirect_url = referer
    response = redirect(redirect_url)
    response.delete_cookie('id', '/')
    response.delete_cookie('token', '/')
    response.delete_cookie('auth_token', '/')
    response.delete_cookie('deconnect_option', '/')
    return response

def forgotten_pwd(request):
    if request.method == 'GET':
        template = loader.get_template('website/get_email.html')
        context = {'email_placeholder': 'Votre email',
                   'title': 'Mot de passe oublié'}
        response = HttpResponse(template.render(context, request))
    else:
        send_res = CagetteMember.send_new_password_link(request)
        response = JsonResponse({'res': send_res})

    return response

def change_pwd(request):
    if request.method == 'GET':
        template = loader.get_template('website/change_pwd.html')
        context = {'password_placeholder': 'Nouveau mot de passe',
                   'title': 'Changer de mot de passe'}
        response = HttpResponse(template.render(context, request))
    else:
        #  TODO
        return JsonResponse({}, safe=False)
    return response
