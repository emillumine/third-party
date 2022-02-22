from outils.common_imports import *
from outils.for_view_imports import *


from envelops.models import CagetteEnvelops
from members.models import CagetteMember

def index(request):
    """Display envelops"""
    must_identify = False

    must_identify = getattr(settings, 'BRINKS_MUST_IDENTIFY', False)

    context = {'title': 'Enveloppes',
               'couchdb_server': settings.COUCHDB['url'],
               'must_identify': must_identify,
               'db': settings.COUCHDB['dbs']['envelops']}

    template = loader.get_template('envelops/index.html')

    return HttpResponse(template.render(context, request))

def archive_envelop(request):
    """Save members payment and destroy the envelop"""
    m = CagetteEnvelops()
    res_payments = []
    res_envelop = ""

    envelop = json.loads(request.body.decode())
    
    # save each partner payment
    for partner_id in envelop['envelop_content']:
        # If payment_id in payment details: payment already saved. Skip saving.
        if not ('payment_id' in envelop['envelop_content'][partner_id]):
            try:    #Additionnal security to ensure process
                data = {
                    'partner_id' : int(partner_id),
                    'partner_name' : envelop['envelop_content'][partner_id]['partner_name'],
                    'amount' : envelop['envelop_content'][partner_id]['amount'],
                    'type' : envelop['type']
                }

                if 'invoice_id' in envelop['envelop_content'][partner_id]:
                    data['invoice_id'] = int(envelop['envelop_content'][partner_id]['invoice_id'])

                res = m.save_payment(data)
            except Exception as e:
                res = {
                    "done": False,
                    "error": repr(e)
                }
                coop_logger.error("Payment error : %s \n %s", str(data), str(e))

            if res['done']:
                # Immediately save a token than this payment has been saved
                #   If an error occurs, this payment won't be saved again
                envelop['envelop_content'][partner_id]['payment_id'] = res['payment_id']
                updated_envelop = m.c_db.updateDoc(envelop)
                envelop['_rev'] = updated_envelop['_rev']
            else:
                # Handling error when saving payment, return data to display error message
                res['partner_id'] = partner_id
                try:
                    res['partner_name'] = envelop['envelop_content'][partner_id]['partner_name']
                    res['amount'] = envelop['envelop_content'][partner_id]['amount']
                except Exception as e:
                    res['error'] = "Wrong envelop structure"
                    coop_logger.error("Wrong envelop structure : %s",  str(e))
                res_payments.append(res)

                try:
                    # Log the error
                    msg = 'Erreur lors de l\'enregistrement du paiement ' + envelop['type']
                    msg += ' ' + str(envelop['envelop_content'][partner_id]['amount']) + ' euros '
                    msg += ' (' + res['error'] + ')'
                    CagetteMember(int(partner_id)).attach_message(msg)
                except Exception as e:
                    coop_logger.error("Cannot attach payment error message to member : %s",  str(e))

    try:
        # archive envelop in couchdb
        res_envelop = m.archive_envelop(envelop)
    except Exception as e:
        res_envelop = "error"

    return JsonResponse({'error_payments': res_payments, 'envelop': res_envelop})
