# -*- coding: utf-8 -*-
"""commons apps functions ."""
from django.conf import settings

default_input_phone_pattern = "^((\+33(-| )\d{1})|\d{2})(\.| )\d{2}(\.| )\d{2}(\.| )\d{2}(\.| )\d{2}$"


def format_phone_number(phone_string):
    """Format phone number for DB insertion (french format)"""
    try:
        import re
        # keep only figures
        figures = re.sub(r'[^0-9]', '', phone_string)
        international_prefix = ''

        if len(figures) > 10:
            international_prefix = figures[:len(figures) -9]
            figures = figures[-9:]

        # for the moment, international prefix is omitted, since only french format is processed
        if len(figures) == 9:
            figures = '0' + figures

        if len(figures) == 10:
            number_pairs = [figures[:2]] 
            for i in range(1,5):
                idx = i*2
                number_pairs.append(figures[idx:idx + 2])
            phone_pairs_separator = getattr(settings, 'PHONE_PAIRS_SEPARATOR', ' ')
            output_phone_number = phone_pairs_separator.join(number_pairs)
        else:
            output_phone_number = phone_string
    except:
        output_phone_number = phone_string

    return output_phone_number
