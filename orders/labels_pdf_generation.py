"""
https://gist.github.com/lkrone/04ca0e3ae3a78f434e5ac84cfd9ca6b1
https://docs.djangoproject.com/fr/3.0/howto/outputting-pdf/
"""
from reportlab.lib.pagesizes import A4
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.barcode.eanbc import Ean13BarcodeWidget
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.units import mm
import io

PAGESIZE = A4
SHEET_TOP = PAGESIZE[1]

NUM_LABELS_X = 5
NUM_LABELS_Y = 13

TEXT_Y = 13 * mm
BARCODE_Y = 0

MM_LABEL_WIDTH = 38.1 + 1.95  # adjusted with actual printer and sheet
MM_LABEL_HEIGHT = 21.2 + 1.1  # adjusted with actual printer and sheet
MM_X_LABEL_PADDING = 2
MM_X_MARGIN = 19.5 / 2 - 4  # adjusted with actual printer and sheet
MM_Y_MARGIN = 21.4 / 2 - 10  # adjusted with actual printer and sheet
BAR_HEIGHT = 30.0

LABEL_WIDTH = MM_LABEL_WIDTH * mm
LABEL_HEIGHT = MM_LABEL_HEIGHT * mm

MAX_TEXT_WIDTH = LABEL_WIDTH - 1.5 * MM_X_LABEL_PADDING * mm

LABEL_FONT = "Helvetica"
FONT_SIZE = 7

def label(ean13, name):
    """
    Generate a drawing with EAN-13 barcode and descriptive text.
    :param ean13: The EAN-13 Code.
    :param name: Product name
    :return: Drawing with barcode and name
    """
    name_part2 = ''

    textWidth = stringWidth(name, LABEL_FONT, FONT_SIZE)
    if textWidth > MAX_TEXT_WIDTH:
        max_char = int(MAX_TEXT_WIDTH/textWidth * len(name))
        if textWidth > 2 * MAX_TEXT_WIDTH:
            name_part2 = name[max_char-1:max_char*2+1]
            name = name[0:max_char-1]
        else:
            last_sp_idx = name.rindex(" ")
            name_part2 = name[last_sp_idx+1:]
            name = name[0:last_sp_idx]
            if last_sp_idx > max_char:
                #transfer some part of name to name_part2
                while (name.rindex(" ") > 0 and len(name) > max_char):
                    last_sp_idx = name.rindex(" ")
                    name_part2 = name[last_sp_idx+1:] + ' ' + name_part2
                    name = name[0:last_sp_idx]
        # truncate name
        

    text1 = String(0, TEXT_Y, name, fontName=LABEL_FONT, fontSize=FONT_SIZE, textAnchor="start")
    text1.x = 0
    text2 = String(0, TEXT_Y - 2 *mm, name_part2, fontName=LABEL_FONT, fontSize=FONT_SIZE, textAnchor="start")
    text2.x = 0
    barcode = Ean13BarcodeWidget(ean13)
    # bounds = barcode.getBounds()
    # width = bounds[2] - bounds[0]
    #height = bounds[3] - bounds[1]
    # barcode.barWidth = BAR_WIDTH
    barcode.barHeight = BAR_HEIGHT
    barcode.x = 0
    barcode.y = BARCODE_Y  # spacing from label bottom (pt)

    label_drawing = Drawing(LABEL_WIDTH, LABEL_HEIGHT)
    label_drawing.add(text1)
    label_drawing.add(text2)
    label_drawing.add(barcode)
    return label_drawing

def draw_page(c,sheet_data):
    """Exemple  
       {'qty': 18.0, 'ean13': '0490010003694', 'name': 'Bière Blonde Brasserie Aveze 75cl'}
       {'qty': 18.0, 'ean13': '0490010003243', 'name': 'Bière IPA Brasserie Aveze 75cl'}
        {'qty': 12.0, 'ean13': '0490010003236', 'name': 'Bière IPA Brasserie Aveze 33cl'}
       {'qty': 6.0, 'ean13': '0490010003267', 'name': 'Bière Rousse Brasserie Aveze 75cl'}
    """
    labels_to_draw = []
    for l in sheet_data:
        for k in range(0,int(l['qty'])):
            labels_to_draw.append(label(l['ean13'],l['name']))
    i = 0
    y0 = SHEET_TOP - LABEL_HEIGHT - (MM_Y_MARGIN * mm)
    for l2d in labels_to_draw:
        x = MM_X_MARGIN * mm + (i%NUM_LABELS_X) * LABEL_WIDTH
        y = y0 - int(i/NUM_LABELS_X)*LABEL_HEIGHT
        renderPDF.draw(l2d, c, x, y)
        i+=1
    c.showPage() #  stop drawing on the current page and any further operations will draw on a subsequent page


def pdf_generate(sheets):
    # Create a file-like buffer to receive PDF data.
    buffer = io.BytesIO()

    # Create the PDF object, using the buffer as its "file."
    p = canvas.Canvas(buffer)
    for s in sheets:
        draw_page(p, s)
    p.save()

    # FileResponse sets the Content-Disposition header so that browsers
    # present the option to save the file.
    buffer.seek(0)
    return buffer
