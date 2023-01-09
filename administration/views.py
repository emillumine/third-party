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

def django_logs(request):
    """ Administration des créneaux des membres """
    template = loader.get_template('admin/django_logs.html')
    
    context = {
        'title': 'Logs Django',
    }
    return HttpResponse(template.render(context, request))


def odoo_logs(request):
    """ Administration des créneaux des membres """
    template = loader.get_template('admin/odoo_logs.html')

    context = {
        'title': 'Logs Odoo',
    }
    return HttpResponse(template.render(context, request))

def retrieve_django_logs(request):
    if CagetteUser.are_credentials_ok(request) and CagetteUser.isAllowedToAdmin(request):
        response = JsonResponse({'content': ThirdPartyAdmin.get_django_logs()})
    else:
        response = JsonResponse({}, status=403)
    return response