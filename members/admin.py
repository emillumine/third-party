from django.contrib import admin
from outils.common_imports import *
from outils.for_view_imports import *
from members.models import CagetteUser
from members.models import CagetteMembers
from members.models import CagetteMember
from outils.common import MConfig


default_msettings = {'msg_accueil': {'title': 'Message borne accueil',
                                             'type': 'textarea',
                                             'value': '',
                                             'sort_order': 1
                                            },
                     'no_picture_member_advice': {'title': 'Message avertissement membre sans photo',
                                             'type': 'textarea',
                                             'value': '',
                                             'sort_order': 2
                                      },
                     'shop_opening_hours': {
                                                'title': 'Horaires ouverture magasin',
                                                'type': 'textarea',
                                                'value': '',
                                                'sort_order': 3
                                            },
                      'abcd_calendar_link': {
                                                'title': 'Lien vers le calendrier ABCD',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 4
                       },
                       'forms_link': {
                                                'title': 'Lien vers la page des formulaires',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 5
                       },
                       'unsuscribe_form_link': {
                                                'title': 'Lien vers le formulaire de ré-inscription',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 6
                       },
                       'member_cant_have_delay_form_link': {
                                                'title': 'Lien vers le formulaire pour les membres n\'ayant pas rattrapé leur service après 6 mois',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 7
                       }
                    }

def config(request):
    """Page de configuration."""
    template = loader.get_template('outils/config.html')
    context = {'title': 'Configuration module Membres',
               'module': 'Membres'}
    return HttpResponse(template.render(context, request))



def get_settings(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            msettings = MConfig.get_settings('members')
            if len(msettings) == 0:
                msettings = default_msettings
            # take care that every params will be shown (consider newly added params)
            for k, v in default_msettings.items():
                if not (k in msettings):
                    msettings[k] = v

            result['settings'] = dict(sorted(msettings.items(), key=lambda k_v: k_v[1]['sort_order']))
            # on preprod server, dict order (through JsonResponse ??) is not respected !!
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"

    return JsonResponse({"res": result}, safe=False)

def save_settings(request):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            params = json.loads(request.POST.get('params'))
            result['save'] = MConfig.save_settings('members', params)
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"

    return JsonResponse({"res": result}, safe=False)

def module_settings(request):
    if request.method == 'GET':
        return get_settings(request)
    else:
        return save_settings(request)

def add_pts_to_everybody(request, pts, reason):
    result = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            fields = ['in_ftop_team']
            cond = [['is_member', '=', True]]
            all_members = CagetteMembers.get(cond, fields)
            if all_members and len(all_members) > 0:
                ftop_ids = []
                standard_ids = []
                for m in all_members:
                    if m['in_ftop_team'] is True:
                        ftop_ids.append(m['id'])
                    else:
                        standard_ids.append(m['id'])
                if len(standard_ids) > 0:
                    result['standard'] = CagetteMembers.add_pts_to_everyone('standard', standard_ids, pts, reason)
                else:
                    result['standard'] = 'No standard found ! '
                if len(ftop_ids) > 0:
                    result['ftop'] = CagetteMembers.add_pts_to_everyone('ftop', ftop_ids, pts, reason)
                else:
                    result['ftop'] = 'No FTOP found !'
                # result['ftop'] = ftop_ids
                # result['standard'] = standard_ids
        except Exception as e:
            result['error'] = str(e)
    else:
        result['error'] = "Forbidden"
    return JsonResponse({'res': result})

def manage_mess(request):
    """Admin part to manage mess - uncomplete subscription"""
    is_connected_user = CagetteUser.are_credentials_ok(request)
    template = loader.get_template('members/manage_mess.html')

    context = {'title': 'Gestion des inscriptions problématiques',
               'couchdb_server': settings.COUCHDB['url'],
               'db': settings.COUCHDB['dbs']['member_mess'],
               'is_connected_user': is_connected_user}
    return HttpResponse(template.render(context, request))
    # JsonResponse({'error' : str(e)}, status=500)

def raw_search(request):
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            needle = str(request.GET.get('needle'))
            members = CagetteMembers.raw_search(needle)
            res = {'members': members}
        except Exception as e:
            res['error'] = str(e)
        response = JsonResponse(res)
    else:
        response = JsonResponse(res, status=403)
    return response

def problematic_members(request):
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            members = CagetteMembers.get_problematic_members()
            res = {'members': members}
        except Exception as e:
            res['error'] = str(e)
        response = JsonResponse(res)
    else:
        response = JsonResponse(res, status=403)
    return response

def remove_member_from_mess_list(request):
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            res = CagetteMember.remove_from_mess_list(request)
        except Exception as e:
            res['error'] = str(e)
        response = JsonResponse(res)
    else:
        response = JsonResponse(res, status=403)
    return response

def generate_barcode(request, member_id):
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            res['done'] = CagetteMember(member_id).generate_barcode()
        except Exception as e:
            res['error'] = str(e)
        response = JsonResponse(res, safe=False)
    else:
        response = JsonResponse(res, status=403)
    return response

def generate_base_and_barcode(request, member_id):
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            res['done'] = CagetteMember(member_id).generate_base_and_barcode()
        except Exception as e:
            res['error'] = str(e)
        response = JsonResponse(res, safe=False)
    else:
        response = JsonResponse(res, status=403)
    return response

def create_envelops(request):
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            res['result'] = CagetteMember.standalone_create_envelops(request)
        except Exception as e:
            res['error'] = str(e)
        response = JsonResponse(res, safe=False)
    else:
        response = JsonResponse(res, status=403)
    return response

# # # ADMIN / BDM # # #

def admin(request):
    """ Administration des membres """
    template = loader.get_template('members/admin/index.html')
    context = {'title': 'BDM',
               'module': 'Membres'}
    return HttpResponse(template.render(context, request))

def get_makeups_members(request):
    """ Récupération des membres qui doivent faire des rattrapages """
    res = CagetteMembers.get_makeups_members()
    return JsonResponse({ 'res' : res })

def update_members_makeups(request):
    """ Met à jour les rattrapages des membres passés dans la requête """
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        members_data = json.loads(request.body.decode())
        res["res"] = CagetteMembers.update_members_makeups(members_data)

        response = JsonResponse(res)
    else:
        res["message"] = "Unauthorized"
        response = JsonResponse(res, status=403)
    return response
