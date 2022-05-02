from django import forms

from outils.lib.MonthYearWidget import *
import datetime

class OdooEntityFieldsForm(forms.Form):
    entity = forms.CharField()

class ExportComptaForm(forms.Form):
    mois = forms.DateField(
        required=True,
        widget=MonthYearWidget(years=range(datetime.date.today().year-2,datetime.date.today().year+1))
    )
    #fichier = forms.FileField()
    # CHOICES = [('zip', '1 fichier par journal'),('compact', '1 seul fichier')]
    # pref = forms.ChoiceField(choices=CHOICES, widget=forms.RadioSelect())

class GenericExportMonthForm(forms.Form):
    mois = forms.DateField(
        required=True,
        widget=MonthYearWidget(years=range(datetime.date.today().year-2,datetime.date.today().year+1))
    )
