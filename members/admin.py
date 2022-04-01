from django.contrib import admin
from outils.common_imports import *
from outils.for_view_imports import *
from outils.common import OdooAPI
from members.models import CagetteUser
from members.models import CagetteMembers
from members.models import CagetteMember
from shifts.models import CagetteShift
from outils.common import MConfig
from datetime import datetime

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
                       'request_form_link': {
                                                'title': 'Faire une demande au Bureau Des Membres',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 7
                       },
                       'late_service_form_link': {
                                                'title': 'Retard à mon service ou oubli validation',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 8
                       },
                       'change_template_form_link': {
                                                'title': 'Demande de changement de créneau',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 9
                       },
                       #TODO vérifier le nom d'un "binome"
                       'associated_subscribe_form_link': {
                                                'title': 'Demande de création de binôme',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 10
                       },
                       #TODO vérifier le nom d'un "binome"
                       'associated_unsubscribe_form_link': {
                                                'title': 'Se désolidariser de son binôme',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 11
                       },
                       'template_unsubscribe_form_link': {
                                                'title': 'Se désinscrire de son créneau',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 12
                       },
                       'change_email_form_link': {
                                                'title': 'Changer d\'adresse mail',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 13
                       },
                       'coop_unsubscribe_form_link': {
                                                'title': 'Demande de démission de la coopérative et/ou de remboursement de mes parts sociales',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 14
                       },
                       'sick_leave_form_link': {
                                                'title': 'Demande de congé maladie ou parental',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 15
                       },
                       'underage_subscribe_form_link': {
                                                'title': 'Demande de création d’un compte mineur rattaché',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 16
                       },
                       'member_cant_have_delay_form_link': {
                                                'title': 'Lien vers le formulaire pour les membres n\'ayant pas rattrapé leur service après 6 mois',
                                                'type': 'text',
                                                'value': '',
                                                'class': 'link',
                                                'sort_order': 21
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
            fields = ['shift_type']
            cond = [['is_member', '=', True]]
            all_members = CagetteMembers.get(cond, fields)
            if all_members and len(all_members) > 0:
                ftop_ids = []
                standard_ids = []
                for m in all_members:
                    if m['shift_type'] == 'ftop':
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

def manage_makeups(request):
    """ Administration des membres """
    template = loader.get_template('members/admin/manage_makeups.html')
    context = {'title': 'BDM - Rattrapages',
               'module': 'Membres'}
    return HttpResponse(template.render(context, request))

def manage_shift_registrations(request):
    """ Administration des services des membres """
    template = loader.get_template('members/admin/manage_shift_registrations.html')
    context = {'title': 'BDM - Services',
               'module': 'Membres'}
    return HttpResponse(template.render(context, request))

def manage_attached(request):
    """ Administration des binômes membres """
    template = loader.get_template('members/admin/manage_attached.html')
    context = {'title': 'BDM - Binômes',
               'module': 'Membres'}
    return HttpResponse(template.render(context, request))

def manage_regular_shifts(request):
    """ Administration des créneaux des membres """
    template = loader.get_template('members/admin/manage_regular_shifts.html')
    context = {'title': 'BDM - Créneaux',
               'module': 'Membres'}
    return HttpResponse(template.render(context, request))

def get_makeups_members(request):
    """ Récupération des membres qui doivent faire des rattrapages """
    res = CagetteMembers.get_makeups_members()
    return JsonResponse({ 'res' : res })

def get_attached_members(request):
    """ Récupération des membres en binôme """
    res = CagetteMembers.get_attached_members()
    return JsonResponse({ 'res' : res })

def update_members_makeups(request):
    """ Met à jour les rattrapages des membres passés dans la requête """
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        members_data = json.loads(request.body.decode())

        res["res"] = []
        for member_data in members_data:
            cm = CagetteMember(int(member_data["member_id"]))

            res["res"].append(cm.update_member_makeups(member_data))

            # Update member standard points, for standard members only
            if member_data["member_shift_type"] == "standard":
                # Set points to minus the number of makeups to do (limited to -2)
                target_points = - int(member_data["target_makeups_nb"])
                if (target_points < -2) :
                    target_points = -2

                member_points = cm.get_member_points("standard")
                points_diff = abs(member_points - target_points)

                # Don't update if no change
                if points_diff == 0:
                    continue

                if member_points > target_points:
                    points_update = - points_diff
                else:
                    points_update = points_diff

                data = {
                    'name': "Modif manuelle des rattrapages depuis l'admin BDM",
                    'shift_id': False,
                    'type': member_data["member_shift_type"],
                    'partner_id': int(member_data["member_id"]),
                    'point_qty': points_update
                }

                cm.update_member_points(data)

        response = JsonResponse(res)
    else:
        res["message"] = "Unauthorized"
        response = JsonResponse(res, status=403)
    return response

def delete_shift_registration(request):
    """ From BDM admin, delete (cancel) a member shift registration """
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        data = json.loads(request.body.decode())
        member_id = int(data["member_id"])
        shift_registration_id = int(data["shift_registration_id"])
        shift_is_makeup = data["shift_is_makeup"]

        # Note: 'upcoming_registration_count' in res.partner won't change because the _compute method
        #       in odoo counts canceled shift registrations.
        m = CagetteShift()
        res["cancel_shift"] = m.cancel_shift([shift_registration_id])

        if shift_is_makeup is True:
            fields = {
                'name': "Admin BDM - Suppression d'un rattrapage",
                'shift_id': False,
                'type': data["member_shift_type"],
                'partner_id': member_id,
                'point_qty': 1
            }
            res["update_counter"] = m.update_counter_event(fields)

        response = JsonResponse(res, safe=False)
    else:
        res["message"] = "Unauthorized"
        response = JsonResponse(res, status=403)
    return response

def delete_shift_template_registration(request):
    """ From BDM admin, delete a member shift template registration """
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        try:
            data = json.loads(request.body.decode())
            partner_id = int(data["partner_id"])
            shift_template_id = int(data["shift_template_id"])
            makeups_to_do = int(data["makeups_to_do"])
            permanent_unsuscribe = data["permanent_unsuscribe"]

            cm = CagetteMember(partner_id)

            # Get partner nb of future makeup shifts
            partner_makeups = cm.get_member_selected_makeups()

            target_makeup = makeups_to_do + len(partner_makeups)
            if target_makeup > 2:
                target_makeup = 2

            # Update partner makeups to do
            res["update_makeups"] = cm.update_member_makeups({'target_makeups_nb': target_makeup})

            # Delete all shift registrations & shift template registration
            res["unsuscribe_member"] = cm.unsuscribe_member()

            if permanent_unsuscribe is True:
                res["set_done"] = cm.set_cooperative_state("gone")

        except Exception as e:
            res["error"] = str(e)

        response = JsonResponse(res, safe=False)
    else:
        res["message"] = "Unauthorized"
        response = JsonResponse(res, status=403)
    return response

# Gestion des binômes

def get_member_info(request, id):
    """Retrieve information about a member."""
    res = {}
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user:
        api = OdooAPI()
        fields = [
            'id',
            'name',
            'sex',
            'cooperative_state',
            'email',
            'street',
            'street2',
            'zip',
            'city',
            'current_template_name',
            'shift_type',
            'parent_id',
            'is_associated_people',
            'parent_name',
            "makeups_to_do",
            "barcode_base"
        ]
        cond = [['id', '=', id]]
        member = api.search_read('res.partner', cond, fields)
        if member:
            member = member[0]
            parent = None
            if member['parent_id']:
                parent = api.search_read('res.partner', [['id', '=', int(member['parent_id'][0])]], ['barcode_base'])[0]
                member['parent_barcode_base'] = parent['barcode_base']
            res['member'] = member
            response = JsonResponse(res)
        else:
            response = JsonResponse({"message": "Not found"}, status=404)
    else:
        res['message'] = "Unauthorized"
        response = JsonResponse(res, status=403)
    return response

def create_pair(request):
    """Create pair

    payload example:
    {
        "parent": {"id": 3075},
        "child": {"id": 3067}
    }
    """
    if request.method == 'GET':
        template = loader.get_template('members/admin/manage_attached_create_pair.html')
        context = {'title': 'BDM - Binômes',
                   'module': 'Membres'}
        return HttpResponse(template.render(context, request))

    if request.method == 'POST':
        if CagetteUser.are_credentials_ok(request):
            api = OdooAPI()
            data = json.loads(request.body.decode())
            parent_id = data['parent']['id']
            child_id = data['child']['id']
            # create attached account for child
            fields = [
                "birthdate",
                "city",
                "commercial_partner_id",
                "company_id",
                "company_type",
                "cooperative_state",
                "barcode_rule_id",
                "country_id",
                "customer",
                "department_id",
                "email",
                "employee",
                "image",
                "image_medium",
                "image_small",
                "mobile",
                "name",
                "phone",
                "sex",
                "street",
                "street2",
                "zip",
                "nb_associated_people",
                "current_template_name",
                "parent_id",
                "is_associated_people",
                "makeups_to_do",
                "final_standard_points",
                "final_ftop_points",
                "shift_type"
            ]
            child = api.search_read('res.partner', [['id', '=', child_id]], fields)[0]
            parent = api.search_read('res.partner', [['id', '=', parent_id]],
                                                    ['commercial_partner_id',
                                                     'nb_associated_people',
                                                     'current_template_name',
                                                     'makeups_to_do',
                                                     "final_standard_points",
                                                     "final_ftop_points",
                                                     'shift_type'
                                                     'parent_id'])[0]
            errors = []
            if child['nb_associated_people'] > 0:
                # le membre est déjà titulaire d'un binôme
                errors.append("Le membre suppléant sélectionné est titulaire d'un bînome")
            # le membre suppléant fait parti du commité?
            if child['current_template_name'] == "Services des comités":
                errors.append("Le membre suppléant séléctionné fait parti du comité")
            # Verifier que le suppléant n'est pas déjà en binôme soit titulaire soit suppléant
            for m in api.search_read('res.partner', [['email', '=', child['email']]]):
                if m['is_associated_people']:
                    errors.append('Le membre suppléant est déjà en bînome')
                if m['child_ids']:
                    errors.append("Le membre suppléant sélectionné est titulaire d'un binôme")
            # le membre titulaire a déjà un/des suppléants?
            if parent['nb_associated_people'] >= 1:
                # On récupère le/s suppléant(s)
                associated_members = api.search_read('res.partner', [['parent_id', '=', parent_id]], ['id', 'age'])
                # le suppléant est un mineur?
                for m in associated_members:
                    if m['age'] > 18:
                        errors.append("Le membre titulaire sélectionné a déjà un suppléant")
            if errors:
                return JsonResponse({"errors": errors}, status=409)

            del child["id"]
            for field in child.keys():
                if field.endswith("_id"):
                    try:
                        child[field] = child[field][0]
                    except TypeError:
                        child[field] = False
            child['is_associated_people'] = True
            child['parent_id'] = parent['id']
            # fusion des rattrapages
            child_makeups = child['makeups_to_do']
            parent_makeups = parent['makeups_to_do']

            child_scheduled_makeups = api.search_read('shift.registration', [['partner_id', '=', child_id],
                                                                             ['is_makeup', '=', True],
                                                                             ['state', '=', 'open'],
                                                                             ['date_begin', '>', datetime.now().isoformat()]])
            parent_scheduled_makeups = api.search_read('shift.registration', [['partner_id', '=', parent_id],
                                                                             ['is_makeup', '=', True],
                                                                             ['state', '=', 'open'],
                                                                             ['date_begin', '>', datetime.now().isoformat()]])
            child_makeups += len(child_scheduled_makeups)
            parent_makeups += len(parent_scheduled_makeups)

            if child_makeups:
                # le suppléant a des rattrapages
                if child_makeups + parent_makeups <=2:
                    # on transfert les rattrapages sur le parent
                    api.update("res.partner", [parent_id], {"makeups_to_do": parent['makeups_to_do'] + child['makeups_to_do']})
                    # On annule les rattrapages du child
                    api.update('res.partner', [child_id], {"makeups_to_do": 0})
                    if not 'shift_type' in parent:
                        parent['shift_type'] = child['shift_type']
                    for makeup in range(child_makeups):
                        # reset du compteur du suppléant
                        api.create('shift.counter.event', {"name": 'passage en binôme',
                                                           "shift_id": False,
                                                           "type": child['shift_type'],
                                                           "partner_id": child_id,
                                                           "point_qty": 1})
                        # on retire les points au titulaire
                        api.create('shift.counter.event', {"name": 'passage en binôme',
                                                           "shift_id": False,
                                                           "type": parent['shift_type'],
                                                           "partner_id": parent_id,
                                                           "point_qty": -1})
                elif child_makeups + parent_makeups > 2:
                    # on annule les rattrapages du suppléant et on met 2 rattrapages sur le titulaire
                    api.update('res.partner', [parent_id], {"makeups_to_do": 2})
                    api.update('res.partner', [child_id], {"makeups_to_do": 0})
                    for makeup in range(child_makeups):
                        # reset du compteur du suppléant
                        api.create('shift.counter.event', {"name": 'passage en binôme',
                                                           "shift_id": False,
                                                           "type": child['shift_type'],
                                                           "partner_id": child_id,
                                                           "point_qty": 1})
                    for i in range((parent_makeups + child_makeups) - 2):
                        # màj du compteur du titulaire
                        api.create('shift.counter.event', {"name": "passage en binôme",
                                                           "shift_id": False,
                                                           "type": parent['shift_type'],
                                                           "partner_id": parent_id,
                                                           "point_qty": -1})

                api.execute('res.partner', 'run_process_target_status', [])

            
            m = CagetteMember(child_id).unsuscribe_member()
            # update child base account state
            api.update("res.partner", [child_id], {'cooperative_state': "associated"})

            # get barcode rule id
            bbcode_rule = api.search_read("barcode.rule", [['for_associated_people', "=", True]], ['id'])[0]
            child['barcode_rule_id'] = bbcode_rule["id"]
            child['cooperative_state'] = 'associated'
            for field in ["nb_associated_people",
                          "current_template_name",
                          "makeups_to_do",
                          "final_standard_points",
                          "final_ftop_points",
                          "shift_type"]:
                try:
                    del child[field]
                except KeyError:
                    pass
            attached_account = api.create('res.partner', child)
            # generate_base
            api.execute('res.partner', 'generate_base', [attached_account])
            response = JsonResponse({"message": "Succesfuly paired members"}, status=200)
        else:
            response = JsonResponse({"message": "Unauthorized"}, status=403)
        return response
    else:
        return JsonResponse({"message": "Method Not Allowed"}, status=405)


def delete_pair(request):
    """
    Administration des binômes membres
        Delete pair
    GET:
        Return template
    POST:
        payload example:
        {
            "child": {"id": 3075}
        }
    """
    if request.method == 'GET':
        template = loader.get_template('members/admin/manage_attached_delete_pair.html')
        context = {'title': 'BDM - Binômes',
                   'module': 'Membres'}
        return HttpResponse(template.render(context, request))
    elif request.method == 'POST':
        if CagetteUser.are_credentials_ok(request):
            api = OdooAPI()
            data = json.loads(request.body.decode())
            child_id = int(data['child']['id'])
            child = api.search_read('res.partner', [['id', '=', child_id]], ['email', 'id', 'parent_id'])[0]
            child_accounts = api.search_read('res.partner', [['email', '=', child['email']]], ['id', 'email'])
            prev_child = [x['id'] for x in child_accounts if x['id'] != child_id]
            parent = api.search_read('res.partner', [['id', '=', child['parent_id'][0]]], ['cooperative_state'])[0]
            api.update('res.partner', [child_id], {"parent_id": False, "is_associated_people": False})
            api.delete('res.partner', [child_id])
            for id in prev_child:
                api.update("res.partner", [id], {'cooperative_state': "unsubscribed"})

            response = JsonResponse({"message": "Succesfuly unpaired members"}, status=200)

        else:
            response = JsonResponse({"message": "Unauthorized"}, status=403)
        return response
    else:
        return JsonResponse({"message": "Method Not Allowed"}, status=405)

def get_attached_members(request):
    """ Récupération des membres qui doivent faire des rattrapages """
    res = CagetteMembers.get_attached_members()
    return JsonResponse({ 'res' : res })
