# -*- coding: utf-8 -*-
"""Import which are used in most of modules view files."""

from django.http import HttpResponse
from django.http import JsonResponse
from django.http import HttpResponseNotFound
from django.http import HttpResponseForbidden
from django.http import HttpResponseServerError
from django.http import HttpResponseBadRequest
from django.template import loader
from django.shortcuts import render
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt