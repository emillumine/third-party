"""Quadratus export."""

from collections import OrderedDict
import logging

coop_logger = logging.getLogger("coop.framework")
"""
https://help.eurecia.com/hc/fr/articles/360000581669-Format-CEGID-QUADRATUS-COMPTABILITE


    Fichier texte (extension TXT)
    Fichier position
    Pas de lignes d’en-tête
    Format des dates : JJMMAA

Ordre       Colonnes                Début   Longueur    Commentaires
1           Type de ligne           1       1           M
2           Compte                  2       8           6 + 2 espace
3           Code journal            10      2           VT par ex
4           Folio                   12      3           000 en dur
5           Date d’écriture         15      6           Date sélectionnée lors de l’export
6           Vide                    21      1           Vide
7           Libellé                 22      20          Description (complété par espace)
8           Sens de l’écriture      42      1           "C si crédit D si débit"
----- A partir de la, ça diffère pour SuperCafoutch ------
9           Montant                 43      12          En centimes
10          Signe                   55      1           + ou -
11          Contrepartie            56      8           Vide
12          Date d’échéance         64      6           Date de la dépense
13          ?                       72      9           Vide
14          ?                       81      1           0
15          ?                       82      27          Vide
16          ?                       109     1           0
17          Devise                  110     3           EUR
18          Code journal            113     2
19          ?                       115     1           Vide
20          ?                       116     3           N0D
21          ?                       119     32           Vide
22          Incrément               160     10           1, 2, 3..... ( complété à gauche par des vides)
23          ?                                           Vide
24          Montant                 162     12          En centimes 0 devant
25          Signe                   174     1           + ou -
26          ?                       175     24          Vide
Fin par cr / nl
------
9           Signe                   43      1           + ou -
10          Montant                 44      12          En centimes
11          Contrepartie            56      8           Vide
12          Date d’échéance         64      6           Date de la dépense
13          Lettrage                70      5           Vide
14          Numéro de pièce         75      5           Vide
15          Code analytique         80      10          Code du compte analytique sélectionné
16          Quantité                90      10          Vide
17          Numéro de pièce         100     8           Numéro de NDF
18          Devise                  108     3           Devise de l’utilisateur
19          Code journal            111     3           "NDF par défaut Configuré dans la boîte à outil du connecteur"
20          Vide                    114     3           Vide
21          Libellé de l’écriture   117     32          Description de la dépense
22          Numéro de pièce         149     10          Numéro de NDF complété par des 0 à gauche
23          Vide    1               59      73          Vide


Fichier reçu d'Odoo
[0] : Journal
[1] : Date
[2] : Libellé journal
[3] : compte
[4] : coop
[5] : Pièce compta
[6] : D (0) ou C (1)
[7] : montant


ATTENTION : Suppose modification du code de l'account_export de La Louve : ligne 381 commentée
"""
def line_generate(cpte, cj, date, libelle, sens, montant, signe, inc):
    if (len(cpte) < 8):
        while (len(cpte) < 8):
            cpte += ' '
    elif len(cpte) > 8:
        cpte = cpte[0:8]
    if len(libelle) > 20:
        libelle = libelle[0:20]
    else:
        while (len(libelle) < 20):
            libelle += ' '
    line = 'M'
    line += cpte
    line += cj
    line += '000'
    line += date
    line += ' '
    line += libelle
    line += sens
    line += '{:0>12}'.format(montant)
    line += signe
    line += '{:<8}'.format(' ')
    line += date
    line += '{:<9}'.format(' ')
    line += '0'
    line += '{:<27}'.format(' ')
    line += '0'
    line += 'EUR'
    line += cj
    line += ' '
    line += 'N0D'
    line += '{:<32}'.format(' ')
    line += '{:>10}'.format(str(inc))
    line += ' '
    line += '{:0>12}'.format(montant)
    line += signe
    line += '{:<24}'.format(' ')
    return line

def generate_quadratus_file(rows):
    try:
        #rows = sorted(rows, key=lambda x: x[0], reverse=True)
        lines = {'V': [], 'K': []}

        daily_ops = {'V': {}, 'K': {}}
        for k, data in rows.items():
            if (k in ['V', 'K']):
                for row in data:
                    [y, m, d] = row[1].split('-')
                    date = d + m + y[2:]
                    if not (date in daily_ops):
                        daily_ops[date] = []
                    libelle = row[2]
                    signe = '+'
                    if row[6] != 0:
                        sens = 'D'
                        if row[6] < 0:
                            signe = '-'
                        montant = str(row[6])
                    if row[7] != 0:
                        sens = 'C'
                        if row[7] < 0:
                            signe = '-'
                        montant = str(row[7])
                    if not (date in daily_ops[k].keys()):
                        daily_ops[k][date] = [] #  !! It creates daily_ops[k][date] AND daily_ops[date] entries !!!
                    daily_ops[k][date].append({'cpte': row[3],
                                               'cj': row[0],
                                               'date': date,
                                               'libelle': libelle,
                                               'sens': sens,
                                               'montant': montant,
                                               'signe': signe})
    except Exception as e:
        coop_logger.error("Compta, quadratus, generate_quadratus_file : %s", str(e))


    for k, daily_ops_data in daily_ops.items():
        if (k in ['V', 'K']):  #  could be date !! (see above)
            daily_ops_data = OrderedDict(sorted(daily_ops_data.items()))  # sort by date
            previous_date = ''
            inc = 1
            totaux = {'D': 0, 'C': 0}
            for d, ops in daily_ops_data.items():
                for op in ops:
                    if op['sens'] == 'D':
                        totaux['D'] += int(op['montant'])
                    else:
                        totaux['C'] += int(op['montant'])
                    line = line_generate(op['cpte'], op['cj'], op['date'], op['libelle'],
                                         op['sens'], op['montant'], op['signe'], inc)
                    lines[k].append(line)
                if previous_date != d:
                    previous_date = d
                    # let's verify if there is a corrective line to write
                    diff = totaux['D'] - totaux['C']
                    if diff != 0:
                        if diff > 0:
                            line = line_generate('758000', 'VT', d, 'correctif', 'C', diff, '+', inc)
                        else:
                            line = line_generate('658000', 'VT', d, 'correctif', 'D', abs(diff), '+', inc)
                        lines[k].append(line)
                    totaux = {'D': 0, 'C': 0}
                    inc += 1
    contents = {'V': '\r\n'.join(lines['V']).encode(encoding="ascii", errors="replace"),
                'K': '\r\n'.join(lines['K']).encode(encoding="ascii", errors="replace")}

    return contents