from django.http import HttpResponse
from django.http import JsonResponse
from django.template import loader
from django.conf import settings
from members.models import CagetteUser

import json

def index(request):
    template = loader.get_template('outils/monitor.html')
    context = {'title': 'Monitor Django',
               'couchdb_server': settings.COUCHDB['url']}

    response = HttpResponse(template.render(context, request))
    return response

def js_errors(request):
    from os import path
    is_connected_user = CagetteUser.are_credentials_ok(request)
    if is_connected_user is True:
        res = {}
        try:
            content = []
            f_path = 'outils/js_errors.log'
            if path.exists(f_path):
                with open(f_path, 'r') as file:
                    rows = file.readlines()
                    for row in rows:
                        [d, mo, a, mg] = row.split('\t')
                        content.append({'date': d,
                                        'module': mo,
                                        'agent': a,
                                        'data': json.loads(mg)
                                        })
            res['content'] = content
        except Exception as e:
            res['error'] = str(e)
        return JsonResponse({'res': res})
    return HttpResponse('ok')  # always responds 'ok' if request doesn't match inside conditions
