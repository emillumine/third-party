from outils.common_imports import *
from outils.for_view_imports import *

from sales.models import CagetteSales


def index(request):
    """Display sales export screen"""

    context = {'title': 'Export de ventes'}
    template = loader.get_template('sales/index.html')

    return HttpResponse(template.render(context, request))

def get_sales(request):
    res = {}

    date_from = request.GET.get('from', '')
    date_to = request.GET.get('to', '')

    m = CagetteSales()
    res = m.get_sales(date_from, date_to)

    if 'errors' in res and res['errors']:
        return JsonResponse(res, status=500)
    else:
        return JsonResponse({'res': res})