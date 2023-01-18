"""Admin views."""
from outils.common_imports import *
from outils.for_view_imports import *
from administration.models import ThirdPartyAdmin

from members.models import CagetteUser


def index(request):
    """Main third-party admin page."""
    
    template = loader.get_template('admin/index.html')

    context = {
        'title': 'Admin'
    }
    if CagetteUser.are_credentials_ok(request):
    	context['is_connected'] = True
    	if CagetteUser.isAllowedToAdmin(request):
    		context['is_admin'] = True
       	

    return HttpResponse(template.render(context, request))

def inventory_backups(request):
    """Manage inventory backups."""
    if CagetteUser.are_credentials_ok(request) and CagetteUser.isAllowedToAdmin(request):
        template = loader.get_template('admin/inventory_backups.html')
        context = {
            'title': "Sauvegardes saisies d'inventaire",
        }
        response = HttpResponse(template.render(context, request))
    else:
        response = HttpResponse('Not allowed', status=403)
    return response

def django_logs(request):
    """ Administration des créneaux des membres """
    if CagetteUser.are_credentials_ok(request) and CagetteUser.isAllowedToAdmin(request):
        template = loader.get_template('admin/django_logs.html')
        
        context = {
            'title': 'Logs Django',
        }
        response = HttpResponse(template.render(context, request))
    else:
        response = HttpResponse('Not allowed', status=403)
    return response


def odoo_logs(request):
    """ Administration des créneaux des membres """
    if CagetteUser.are_credentials_ok(request) and CagetteUser.isAllowedToAdmin(request):
        template = loader.get_template('admin/odoo_logs.html')

        context = {
            'title': 'Logs Odoo',
        }
        response = HttpResponse(template.render(context, request))
    else:
        response = HttpResponse('Not allowed', status=403)

def retrieve_django_logs(request):
    if CagetteUser.are_credentials_ok(request) and CagetteUser.isAllowedToAdmin(request):
        response = JsonResponse({'content': ThirdPartyAdmin.get_django_logs()})
    else:
        response = JsonResponse({}, status=403)
    return response

def retrieve_inventory_backups(request):
    if CagetteUser.are_credentials_ok(request) and CagetteUser.isAllowedToAdmin(request):
        response = JsonResponse({'content': ThirdPartyAdmin.get_inventory_backups()})
    else:
        response = JsonResponse({}, status=403)
    return response

def retrieve_inventory_backup(request, files):
    if CagetteUser.are_credentials_ok(request) and CagetteUser.isAllowedToAdmin(request):
        response = JsonResponse({'content': ThirdPartyAdmin.get_inventory_backup(files)})
    else:
        response = JsonResponse({}, status=403)
    return response