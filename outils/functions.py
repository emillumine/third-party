"""commons computation functions ."""
import logging

coop_logger = logging.getLogger("coop.framework")

def computeEAN13Check(s12):
    odd_sum = 0
    even_sum = 0

    for i, char in enumerate(s12):
        if i % 2 == 0:
            even_sum += int(char)
        else:
            odd_sum += int(char)

    total_sum = (odd_sum * 3) + even_sum
    mod = total_sum % 10

    if mod == 0:
        computed_check = 0
    else:
        computed_check = 10 - mod
    return computed_check

def checkEAN13(bc):
    bc = str(bc)
    if (len(bc) != 13):
        raise Exception("Invalid length")

    code = bc[:-1]
    check = bc[-1:]

    computed_check = computeEAN13Check(code)

    return (computed_check == int(check))

def getMonthFromRequestForm(request):
    month = request.POST.get('mois_month')
    year = request.POST.get('mois_year')
    res = {}
    try:
        m = int(month)
        y = int(year)
        if (m < 10):
            month = '0' + month
        if (m > 0 and y > 0):
            res['month'] = year + '-' + month
        else:
            today = datetime.date.today()
            year = str(today.year)
            month = str(today.month)
            if (len(month) == 1):
                month = '0' + month
            res['month'] = year + '-' + month
    except Exception as e:
        res['error'] = str(e)
    return res

def extract_firstname_lastname(fullname, sep):
    firstname = lastname = fullname
    try:
        elts = fullname.split(sep)
        if len(elts) > 1:
            firstname = elts[0]
            lastname = ' '.join(elts[1:])
    except Exception as e:
        coop_logger.error('extract_firstname_lastname : %s', str(e))

    return {'firstname': firstname, 'lastname': lastname}


def is_present_period(d1, d2, dformat='%Y-%m-%d'):
    """Is present included between the two datetime objects

    Parameters:
    d1 (string): start of period
    d2 (string): end of period
    dformat (string): Needed to create datetime object using

    Returns:
    boolean : If True, the present is included in the period
    """
    from datetime import datetime
    now = dt1 = dt2 = datetime.now()
    try:
        dt1 = datetime.strptime(d1, dformat)
    except:
        pass
    try:
        dt2 = datetime.strptime(d2, dformat)
    except:
        pass
    return (now - dt1).total_seconds() > 0 and (now - dt2).total_seconds() <= 0