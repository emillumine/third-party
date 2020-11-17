from django.conf import settings


class CagetteMail:

    @staticmethod
    def sendWelcome(email):
        from django.core.mail import send_mail
        import re
        from django.utils.html import strip_tags
        from django.template.loader import render_to_string
        html_msg = render_to_string(settings.WELCOME_MAIL_TEMPLATE, {})
        msg = re.sub('[ \t]+', ' ', strip_tags(html_msg))
        msg = msg.replace('\n ', '\n').strip()

        send_mail(settings.WELCOME_MAIL_SUBJECT,
                  msg,
                  settings.DEFAULT_FROM_EMAIL,
                  [email],
                  fail_silently=False,
                  html_message=html_msg)
    @staticmethod
    def sendCartValidation(email, cart):
        from django.core.mail import send_mail
        from django.utils.html import strip_tags
        from django.template.loader import render_to_string
        from datetime import datetime
        import pytz


        tz = pytz.timezone("Europe/Paris")
        d_obj = datetime.fromtimestamp(cart['submitted_time'], tz)
        if ('comment' in cart) and len(cart['comment']) == 0:
            del cart['comment']
        ctx = {'mag': settings.COMPANY_NAME,
               'cart': cart,
               'order_date': d_obj.strftime('%d/%m/%Y à  %Hh%S (UTC)')}
        try:
            ctx['survey_link'] = settings.SHOP_SURVEY_LINK
        except:
            pass
        mail_template = 'shop/cart_validation_email.html'
        try:
            mail_template = settings.VALIDATION_ORDER_MAIL_TEMPLATE
        except:
            pass
        html_msg = render_to_string(mail_template, ctx)
        msg = strip_tags(html_msg)
        send_mail("Votre commande en ligne à " + settings.COMPANY_NAME ,
                  msg,
                  settings.DEFAULT_FROM_EMAIL,
                  [email],
                  fail_silently=False,
                  html_message=html_msg)
