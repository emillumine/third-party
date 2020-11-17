# coding: utf-8
"""Interact with Odoo by python code
Before launching script, launch the following command:
export DJANGO_SETTINGS_MODULE='scripts_settings'
(a file named scripts_settings.py is present in this directory)
"""
#
import sys, getopt, os
sys.path.append(os.path.abspath('../..'))
from outils.common import OdooAPI



def main():
    api = OdooAPI()
    # etc.....

if __name__ == "__main__":
    main()