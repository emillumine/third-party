from django.conf import settings
import os
from os import path

def custom_css(request):
    css_files = {}
    if hasattr(settings, 'CUSTOM_CSS_FILES'):
        for module_name, files in settings.CUSTOM_CSS_FILES.items():
            module_key = module_name
            if module_name == 'all':
                module_name = 'outils'
            for fn in files:
                module_relative_path = '/static/css/' + fn
                fpath = settings.BASE_DIR + '/' + module_name + module_relative_path
                if path.exists(fpath) is True:
                    if not (module_key in css_files):
                        css_files[module_key] = []
                    css_files[module_key].append(module_relative_path.replace('/static',''))

    return {'custom_css': css_files}

def context_setting(request):
    """adding settings variable to context (can be overloaded in views)."""
    context = {'odoo': settings.ODOO['url'], 
               'app_env': getattr(settings, 'APP_ENV', "prod"),
               'company_code': getattr(settings, 'COMPANY_CODE', ''),
               'favicon_url': getattr(settings, 'FAVICON_URL', '/static/favicon.ico')}
    return context