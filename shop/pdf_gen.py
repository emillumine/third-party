from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.platypus import Table, TableStyle, PageBreak
from reportlab.platypus.doctemplate import Indenter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import mm
from reportlab.lib import colors
from datetime import datetime

import io

MAX_NAME_LENGTH = 60

def draw_page(p_name, cart, colwidths, p1_style, p2_style, t_style):
    elements = []
    if 'submitted_time' in cart:
        c_date = datetime.fromtimestamp(cart['submitted_time'])
    else:
        c_date = 'Date de validation inconnue'
    title = 'Commande de ' + cart['partner']['display_name']
    if (len(p_name) > 0):
        title += ' (' + p_name + ')'
    elements.append(Paragraph(title, p1_style))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph(str(c_date), p2_style))
    if ('comment' in cart) and (len(cart['comment'])) > 0:
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(cart['comment'], p1_style))
    data = [('Ray.', 'Nom article', 'Quantité', 'Prix', 'Stock')]

    for p in cart['products']:
        name = p['name']
        if (len(name) > MAX_NAME_LENGTH):
            name = name[:MAX_NAME_LENGTH] + "\n" + name[MAX_NAME_LENGTH:]
        row = (p['shelf'], name, p['qty'], p['price'], p['stock'])
        data.append(row)
    table = Table(data, colwidths, spaceBefore=5 * mm, spaceAfter=5 * mm)
    table.setStyle(t_style)
    elements.append(Indenter(left=11 * mm))
    elements.append(table)
    elements.append(Indenter(left=-11 * mm))
    if ('accept_substitution' in cart) and (cart['accept_substitution'] is True):
        elements.append(Paragraph("ACCEPTE LES SUBSTITUTIONS", p1_style))
        elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Info. récupération : " + cart['best_date'], p1_style))
    return elements

def draw_pages(buffer, cart):
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=15 * mm, topMargin=15 * mm, hAlign='LEFT')
    colwidths = [10 * mm, 115 * mm, 17 * mm, 17 * mm, 17 * mm]

    p1_style = ParagraphStyle('nom', fontSize=14, alignment=TA_LEFT)
    p2_style = ParagraphStyle('date', fontSize=10, alignment=TA_LEFT)
    t_style = TableStyle([('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                          ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                          ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                          ('BOX', (0, 0), (-1, -1), 0.25, colors.black)])
    story = []
    # Here consider remove FL_SHELFS and VRAC_SHELFS shelfs to be put in a second part
    # And products with no shelf to put in a third part
    pdts = {'0_with_shelf': [], '1_flv': [], '2_no_shelf': []}  # 0_ 1_ 2_ for page order
    for p in cart['products']:
        if (str(p['shelf']) in list(map(str, settings.FL_SHELFS + settings.VRAC_SHELFS))):
            pdts['1_flv'].append(p)
        elif len(str(p['shelf'])) > 0:
            pdts['0_with_shelf'].append(p)
        else:
            pdts['2_no_shelf'].append(p)
    for key in sorted(pdts.keys()):
        p_name = ''
        if key == '1_flv':
            p_name = "FL + VRAC"
        cart['products'] = pdts[key]
        if len(cart['products']) > 0:
            story += draw_page(p_name, cart, colwidths, p1_style, p2_style, t_style)
            story.append(PageBreak())
    doc.build(story)

def create_cart_pdf(cart):
    # Create a file-like buffer to receive PDF data.
    buffer = io.BytesIO()
    draw_pages(buffer, cart)
    buffer.seek(0)
    return buffer
