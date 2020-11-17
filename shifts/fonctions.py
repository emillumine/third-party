import datetime, pytz

tz = pytz.timezone("Europe/Paris")

def dateIsoUTC(myDate):

    tDate = tz.localize(datetime.datetime.strptime(myDate, '%Y-%m-%d %H:%M:%S'))
    return dDate.isoformat()
