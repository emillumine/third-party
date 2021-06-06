# -*- coding: utf-8 -*-
"""Import which are used in most of modules files."""

from django.conf import settings
from .common_functions import *
import json, time, datetime, pytz
import logging

"""
Following declaration needs to be inserted in settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'filters': {
        'special': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': custom_process_error
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filters': ['require_debug_true'],
            'filename': os.path.join(BASE_DIR, 'log/debug.log'),
            'formatter': 'simple'
        },
        'errors_file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'log/errors.log'),
            'formatter': 'simple'
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['special']
        }
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'propagate': True,
        },
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'coop.trace': {
            'handlers': ['file', 'errors_file'],
            'level': 'INFO'
        },
        'coop.framework': {
            'handlers': ['file', 'mail_admins'],
            'level': 'INFO',
            'filters': ['special']
        }
    }
}
"""
coop_logger = logging.getLogger("coop.framework")

