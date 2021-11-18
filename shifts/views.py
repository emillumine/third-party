from outils.common_imports import *
from outils.for_view_imports import *
from outils.common import Verification

from shifts.models import CagetteShift
from members.models import CagetteMember

# working_state = ['up_to_date', 'alert', 'exempted', 'delay', 'suspended']
state_shift_allowed = ["up_to_date", "alert", "delay"]

tz = pytz.timezone("Europe/Paris")

def dateIsoUTC(myDate):
    tDate = tz.localize(datetime.datetime.strptime(myDate, '%Y-%m-%d %H:%M:%S'))
    return tDate.isoformat()

def home(request, partner_id, hashed_date):
    import hashlib
    cs = CagetteShift()
    partnerData = cs.get_data_partner(partner_id)

    md5_calc = hashlib.md5(partnerData['create_date'].encode('utf-8')).hexdigest()
    if (md5_calc == hashed_date):
        # if not request.session.get('odoo_token', False):
        #     import uuid
        #     request.session['odoo_token'] = uuid.uuid4().hex
        #     request.session.modified = True
        # Ne fonctionne pas !!! Les données de sessions sont perdues à la connexion suivante (ajax : voir cross domain cookies
        if len(partnerData) > 0:
            partnerData['verif_token'] = md5_calc
            if len(partnerData['leave_ids']) > 0:
                listLeave = cs.get_leave(int(partner_id))
                if len(listLeave) > 0:
                    partnerData["is_leave"] = True
                    partnerData["leave_start_date"] = listLeave[0]["start_date"]
                    partnerData["leave_stop_date"] = listLeave[0]["stop_date"]

            # Error case encountered from Odoo: member in delay state and last extension is over -> member is suspended
            try:
                if partnerData['cooperative_state'] == "delay" and datetime.datetime.strptime(partnerData['date_delay_stop'], '%Y-%m-%d') < datetime.datetime.now():
                    partnerData['cooperative_state'] = "suspended"
            except:
                pass

            if partnerData['cooperative_state'] in state_shift_allowed:
                # domain = "127.0.0.1"
                domain = getattr(settings, 'EMAIL_DOMAIN', 'lacagette-coop.fr')
                days_to_hide = "0"
                if hasattr(settings, 'SHIFT_EXCHANGE_DAYS_TO_HIDE'):
                    days_to_hide = settings.SHIFT_EXCHANGE_DAYS_TO_HIDE
                context = {'title': 'Calendrier', "partnerData": partnerData,
                           'daysToHide': days_to_hide,
                           'SHIFT_INFO': settings.SHIFT_INFO,
                           'PB_INSTRUCTIONS': settings.PB_INSTRUCTIONS,
                           'domain': domain}
                context['ADDITIONAL_INFO_SHIFT_PAGE'] = getattr(settings, 'ADDITIONAL_INFO_SHIFT_PAGE', '')
                if hasattr(settings, 'CALENDAR_NO_MORE_LINK'):
                    if settings.CALENDAR_NO_MORE_LINK is True:
                        context['calendarEventNoMoreLinks'] = True
                if hasattr(settings, 'CAL_INITIAL_VIEW'):
                    context['calInitialView'] = settings.CAL_INITIAL_VIEW
                    #  No effect with 3.9 version : TODO upgrade fullCalendar lib
                    #  Needs init calendar rewriting
                response = render(request, 'shifts/shift_exchange.html', context)
            else:
                context = {'title': 'Invitation', "partnerData": partnerData}
                if hasattr(settings, 'UNSUBSCRIBED_MSG'):
                    context['UNSUBSCRIBED_MSG'] = settings.UNSUBSCRIBED_MSG
                response = render(request, 'shifts/shift_states_not_allowed.html', context)

            # response.set_cookie('odoo_token', request.session.get('odoo_token', False) )
            return response
        else:
            return HttpResponseNotFound('<h1>Nothing to show !</h1>')
    else:
        return HttpResponseForbidden()


def _is_middled_filled_considered(reserved, max):
    """Added to fit with new LaCagette need. (based on num rather than %)."""
    answer = False
    toggle_num = 0
    try:
        toggle_num = int(getattr(settings, 'SHIFT_COLOR_TOGGLE_NUM', 0))
    except:
        coop_logger.warning("Wrong value for SHIFT_COLOR_TOGGLE_NUM : %s",
                            str(getattr(settings, 'SHIFT_COLOR_TOGGLE_NUM', 0))
                            )
    if toggle_num == 0:
        if int(reserved) / int(max) < 0.5:
            answer = True
    else:
        answer = int(reserved) <= toggle_num
    return answer


def get_list_shift_calendar(request, partner_id):
    cs = CagetteShift()
    registerPartner = cs.get_shift_partner(partner_id)

    use_new_members_space = getattr(settings, 'USE_NEW_MEMBERS_SPACE', False) 

    listRegisterPartner = []
    for v in registerPartner:
        listRegisterPartner.append(v['id'])

    start = request.GET.get('start')
    end = request.GET.get('end')
    listService = cs.get_shift_calendar(partner_id, start, end)

    events = []
    for value in listService:
        events.append(value)
        if value['shift_type_id'][0] == 1 or getattr(settings, 'USE_STANDARD_SHIFT', True) is False:
            l = set(value['registration_ids']) & set(listRegisterPartner)
            # if (int(value['seats_reserved']) == int(value['seats_max']) and len(l) > 0 ) or (int(value['seats_reserved']) < int(value['seats_max'])):
            if (int(value['seats_available']) > 0 or len(l) > 0 ):
                event = {}
                event["id"] = value['id']
                smax = int(value['seats_available']) + int(value['seats_reserved'])
 
                company_code = getattr(settings, 'COMPANY_CODE', '')
                title_prefix = ''
                if company_code != "lacagette" and len(value['address_id']) == 2 and ',' in value['address_id'][1]:
                    title_prefix = str(value['address_id'][1]).split(",")[1] + " --"
                elif company_code == "lacagette":
                    title_prefix = " -- "

                event["title"] = title_prefix + str(value['seats_reserved']) + "/" + str(smax)


                event["start"] = dateIsoUTC(value['date_begin_tz'])

                datetime_object = datetime.datetime.strptime(value['date_end_tz'], "%Y-%m-%d %H:%M:%S") - datetime.timedelta(minutes=15)
                event["end"] = dateIsoUTC(datetime_object.strftime("%Y-%m-%d %H:%M:%S"))

                if len(l) > 0:
                    if use_new_members_space is True:
                        event["classNames"] = ["shift_booked"]
                    else:
                        event["className"] = "shift_booked"
                    event["changed"] = False
                # elif int(value['seats_reserved']) == int(value['seats_max']):
                #     event["className"] = "shift_full"
                #     event["changed"] = False
                elif int(value['seats_reserved']) == 0:
                    if use_new_members_space is True:
                        event["classNames"] = ["shift_empty"]
                    else:
                        event["className"] = "shift_empty"
                    event["changed"] = True
                elif _is_middled_filled_considered(value['seats_reserved'], smax) is True:
                    if use_new_members_space is True:
                        event["classNames"] = ["shift_less_alf"]
                    else:
                        event["className"] = "shift_less_alf"
                    event["changed"] = True
                else:
                    if use_new_members_space is True:
                        event["classNames"] = ["shift_other"]
                    else:
                        event["className"] = "shift_other"
                    event["changed"] = True

                event["registration_ids"] = value['registration_ids']
                events.append(event)

    response = JsonResponse(events, safe=False)
    return response

def get_list_shift_partner(request, partner_id):
    cs = CagetteShift()
    shiftData = cs.get_shift_partner(partner_id)
    for value in shiftData:
        value['date_begin'] = value['date_begin'] + "Z"
        value['date_end'] = value['date_end'] + "Z"
    return JsonResponse(shiftData, safe=False)

def change_shift(request):
    if 'verif_token' in request.POST:
        if Verification.verif_token(request.POST.get('verif_token'), int(request.POST.get('idPartner'))) is True:

            cs = CagetteShift()

            if 'idNewShift' in request.POST and 'idOldShift' in request.POST:
                idOldShift = request.POST['idOldShift']
                listRegister = [int(request.POST['idRegister'])]
                data = {
                    "idPartner": int(request.POST['idPartner']),
                    "idShift": int(request.POST['idNewShift']),
                    "shift_type": request.POST['shift_type'],
                    "is_makeup": cs.shift_is_makeup(idOldShift)
                }
                
                should_block_service_exchange = getattr(settings, 'BLOCK_SERVICE_EXCHANGE_24H_BEFORE', False)
                if should_block_service_exchange:
                    # Block change if old shift is to happen in less than 24 hours
                    now = datetime.datetime.now(tz)

                    old_shift = cs.get_shift(idOldShift)
                    day_before_old_shift_date_start = tz.localize(datetime.datetime.strptime(old_shift['date_begin_tz'], '%Y-%m-%d %H:%M:%S') - datetime.timedelta(hours=24))

                    if now > day_before_old_shift_date_start:
                        response = {'msg': "Old service in less than 24hours."}
                        return JsonResponse(response, status=400)

                st_r_id = False
                #Insertion du nouveau shift
                try:
                    st_r_id = cs.set_shift(data)
                except Exception as e:
                    coop_logger.error("Change shift : %s, %s", str(e), str(data))
                if st_r_id:
                    listRegister = [int(request.POST['idRegister'])]

                    # Annule l'ancien shift
                    response = cs.cancel_shift(listRegister)

                    response = {'result': True}
                else:
                    response = {'result': False}
            else:
                response = {'result': False}
            return JsonResponse(response)
        else:
            return HttpResponseForbidden()
    else:
        return HttpResponseForbidden()

def add_shift(request):
    if 'verif_token' in request.POST:
        if Verification.verif_token(request.POST.get('verif_token'), int(request.POST.get('idPartner'))) is True:
            cs = CagetteShift()

            if 'idNewShift' in request.POST and 'idPartner' in request.POST:
                data = {
                    "idPartner": int(request.POST['idPartner']), 
                    "idShift":int(request.POST['idNewShift']), 
                    "shift_type":request.POST['shift_type'],
                    "is_makeup":True
                }
                
                #Insertion du nouveau shift
                st_r_id = False
                try:
                    st_r_id = cs.set_shift(data)
                except Exception as e:
                    coop_logger.error("Add shift : %s, %s", str(e), str(data))

                if st_r_id:
                    response = {'result': True}
                else:
                    response = {'result': False}

                # decrement makeups_to_do
                res_decrement = False
                try:
                    res_decrement = cs.decrement_makeups_to_do(int(request.POST['idPartner']))
                except Exception as e:
                    coop_logger.error("Decrement makeups to do : %s, %s", str(e), str(data))

                if res_decrement:
                    response["decrement_makeups"] = res_decrement
                else:
                    response["decrement_makeups"] = False

            else:
                response = {'result': False}
            return JsonResponse(response)
        else:
            return HttpResponseForbidden()
    else:
        return HttpResponseForbidden()

def request_delay(request):
    if 'verif_token' in request.POST:
        if Verification.verif_token(request.POST.get('verif_token'), int(request.POST.get('idPartner'))) is True:
            cs = CagetteShift()

            use_new_members_space = getattr(settings, 'USE_NEW_MEMBERS_SPACE', False) 
            if use_new_members_space is True:
                member_can_have_delay = cs.member_can_have_delay(int(request.POST.get('idPartner')))
                if member_can_have_delay is False:
                    res = { 'message' : 'delays limit reached'}
                    return JsonResponse(res, status=403)
            
            data = {
                "idPartner": int(request.POST['idPartner']),
                "start_date" : request.POST['start_date']
            }
            if ('extension_beginning' in request.POST):
                data['extension_beginning'] = request.POST['extension_beginning']
            duration = 28
            if ('duration' in request.POST):
                duration = int(request.POST['duration'])

            response = {'result': False}

            try:
                new_id = cs.create_delay(data, duration)
                if (new_id):
                    response = {'result': True}
                else:
                    coop_logger.error("request delay : %s, %s", str(new_id), str(data))
                    return HttpResponseServerError()
            except Exception as e:
                coop_logger.error("request delay : %s, %s", str(e), str(data))
                return HttpResponseServerError()

            return JsonResponse(response)
        else:
            return HttpResponseForbidden()
    else:
        return HttpResponseForbidden()

def reset_members_positive_points(request):
    """Called by a cron script"""
    return JsonResponse({'res': CagetteShift.reset_members_positive_points()})

def get_test(request):
    cs = CagetteShift()

    fields = ['shift_ticket_ids', 'shift_type_id']  # res.partner
    cond = []
    # cond = [['partner_id','=',1522],['start_date','<',datetime.datetime.now().isoformat()],['stop_date','>',datetime.datetime.now().isoformat()]]
    # registerPartner = cs.get_test('shift.shift',cond,fields)
    registerPartner =  cs.get_shift_calendar(1018)  # cs.get_data_partner(1538)

    response = JsonResponse(registerPartner, safe=False)
    return response
    #return  HttpResponse(shiftData)

def get_list(request):
    cs = CagetteShift()

    fields = ['cooperative_state']  # res.partner
    cond = []
    registerPartner = cs.get_test('res.partner', cond, fields)
    liste = []
    for val in registerPartner:
        if val[fields[0]] not in liste:
            liste.append(val[fields[0]])

    return JsonResponse(liste, safe=False)
