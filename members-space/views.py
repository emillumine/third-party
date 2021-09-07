from outils.common_imports import *
from outils.for_view_imports import *

from sales.models import CagetteSales


def index(request):
    """Display sales export screen"""

    context = {'title': 'Espace Membre'}
    template = loader.get_template('members-space/index.html')

    return HttpResponse(template.render(context, request))