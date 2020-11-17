# coding=utf-8
from outils.common import OdooAPI
import base64
import logging

coop_logger = logging.getLogger("coop.framework")


def make_csv_content_from_lines (rows):

    rows = sorted(rows, key=lambda x: x[0])
    csv_headers = ['Code journal', 'Date opération', 'N° pièce',
                       'N° compte', 'Libellé', 'Vide', 'Vide',
                       'Montant débit', 'Montant crédit']
    csv_content = ";".join(csv_headers) + "\r\n"
    sells_total = 0
    vat_total = 0
    selling_accounts = ['707011', '707101', '707102', '707201', '707202', '707301', '707302', '707303',
                        '707401', '707402', '707403', '707501', '707502', '707503', '707601', '707602', '707603',
                        '707701', '707702', '707703', '707801', '707802', '707803', '707901', '707902', '707903']
    vat_accounts = ['445711', '445712', '445713', '445714']
    for row in rows:
        row.append('')
        row[8] = row[7]
        row[7] = row[6]
        row[6] = ''
        if (row[0] == 'VEN'):
            row[4] = row[5]
            if row[3] in selling_accounts:
                if len(row[7]) > 0:
                    sells_total -= (float)(row[7].replace(',', '.'))
                if len(row[8]) > 0:
                    sells_total += (float)(row[8].replace(',', '.'))
            if row[3] in vat_accounts:
                if len(row[7]) > 0:
                    vat_total -= (float)(row[7].replace(',', '.'))
                if len(row[8]) > 0:
                    vat_total += (float)(row[8].replace(',', '.'))
        row[5] = ''
        csv_content += ";".join(row) + "\r\n"

    return {'csv_content': csv_content.encode(encoding="cp1252"),
            'sells_total': sells_total, 'vat_total': vat_total}


def make_daily_sell_accounts_sum(lines):
    other_than_sells = []
    sells = {}
    summed_lines = []

    for line in lines:
        if line[0] == 'VEN':
            if not (str(line[1]) in sells.keys()):
                sells[str(line[1])] = {}
            if not (str(line[3]) in sells[str(line[1])].keys()):
                sells[str(line[1])][str(line[3])] = {'D': 0.00, 'C': 0.00}
            amount = line[6]
            atype = 'D'
            if amount == '':
                amount = float(line[7].replace(',', '.'))
                atype = 'C'
            else:
                amount = float(line[6].replace(',', '.'))

            sells[str(line[1])][str(line[3])][atype] += amount

        else:
            other_than_sells.append(line)

    for day, accounts_data in sells.items():
        for account_num, dc_amounts in accounts_data.items():
            if dc_amounts['D'] > 0:
                c = ''
                d = round(dc_amounts['D'], 2)
                newline = (['VEN', day, 'Vente ' + day, account_num, '',
                            'Vente ' + day, d, c])
                summed_lines.append(newline)
            if dc_amounts['C'] > 0:
                d = ''
                c = round(dc_amounts['C'], 2)
                newline = (['VEN', day, 'Vente ' + day, account_num, '',
                            'Vente ' + day, d, c])
                summed_lines.append(newline)

    # on remplace les . des nombres flottants par des ,.
    i = 0
    while i < len(summed_lines):
        summed_lines[i][6] = str(summed_lines[i][6]).replace('.', ',')
        summed_lines[i][7] = str(summed_lines[i][7]).replace('.', ',')
        i += 1
    return summed_lines + other_than_sells


def make_daily_full_sum_up(lines):
    """Used to prepare Quadratus export, corresponding to SuperCafoutch needs."""

    try:
        ops = {'V': {}, 'K': {}}
        sales_jcode = ['BNK4', 'BNK5', 'BNK8', 'BNK9', 'CSH1', 'VEN']
        cap_jcode = ['CAP', 'CSH6', 'BNK3', 'BNK2', 'BNK1']
        summed_lines = {'V': [], 'K': []}

        for line in lines:
            k = ''
            d = '-'.join(reversed(str(line[1]).split('/')))  #  only yyyy-mm-dd date are alpha sortable
            account = str(line[3])
            if line[0] in sales_jcode:
                if line[0] == 'VEN':
                    j = 'VT'
                else:
                    j = 'RE'
                k = 'V'
            if line[0] in cap_jcode:
                if line[0] == 'CAP':
                    j = 'KA'
                else:
                    j = 'RE'
                k = 'K'
            if k != '':
                if not (d in ops[k].keys()):
                    # day entry
                    ops[k][d] = {}
                if not (j in ops[k][d].keys()):
                    # journal by day entry
                    ops[k][d][j] = {}

                if not (account in ops[k][d][j].keys()):
                    ops[k][d][j][account] = {'D': 0.00, 'C': 0.00}
                amount = line[6]
                atype = 'D'  # AccountType is Debit
                if amount == '':
                    amount = float(line[7].replace(',', '.'))
                    atype = 'C'  # AccountType is Credit
                else:
                    amount = float(line[6].replace(',', '.'))

                ops[k][d][j][account][atype] += amount


        for k, byday_data in ops.items():
            for day, journals_data in byday_data.items():
                for j_code, j_accounts in journals_data.items():
                    for account, amount in j_accounts.items():
                        if j_code == 'VT':
                            libelle = 'Vente ' + '/'.join(reversed(day.split('-')))
                        elif j_code == 'KA':
                            libelle = 'Capital'
                        else:
                            libelle = 'Reglement ' + '/'.join(reversed(day.split('-'))) # no accent because of ascii conversion mess (to fix)

                        if amount['D'] != 0 and amount['C'] != 0:
                            c = 0
                            d = int(float("{0:.2f}".format(amount['D'])) * 100)  # Quadratus export needs cents values
                            newline = ([j_code, day, libelle, account, '', libelle, d, c])
                            summed_lines[k].append(newline)
                            d = 0
                            c = int(float("{0:.2f}".format(amount['C'])) * 100)
                            newline = ([j_code, day, libelle, account, '', libelle, d, c])
                            summed_lines[k].append(newline)
                        else:
                            if amount['D'] != 0:
                                c = 0
                                d = int(float("{0:.2f}".format(amount['D'])) * 100)  # Quadratus export needs cents values
                            if amount['C'] != 0:
                                d = 0
                                c = int(float("{0:.2f}".format(amount['C'])) * 100)

                            newline = ([j_code, day, libelle, account, '', libelle, d, c])
                            summed_lines[k].append(newline)
    except Exception as e:
        coop_logger.error("compta, make_daily_full_sum_up : %s , %s", str(e), str(lines))

    return summed_lines

def retrieve_odoo_coop_data (coop_ids):
    api = OdooAPI()
    fields = ['name', 'barcode_base']
    cond = [['barcode_base', 'in', coop_ids ]]
    coops = api.search_read('res.partner', cond, fields, 3000)

    coops_dict = {}
    for coop in coops:
        if not (str(coop['barcode_base']) in coops_dict.keys()):
            coops_dict[str(coop['barcode_base'])] = \
                str(coop['barcode_base']) + ' - ' + coop['name']

    return coops_dict

def process_received_lines(received_data, coops, full_sumup=False):
    result = []
    # On reprend les lignes reçues pour substituer le nom des coop et
    # reprendre les colonnes debit / credit
    for line in received_data:
        line[7] = line[7].rstrip()
        if str(line[4]) in coops.keys():
            line[4] = coops[str(line[4])]
        if line[6] == '0':
            line[6] = line[7]
            line[7] = ''
        else:
            line[6] = ''
        result.append(line)
    if full_sumup is False:
        return make_daily_sell_accounts_sum(result)
    else:
        return make_daily_full_sum_up(result)

def generate_arithmethique_compatible_file (report):
    coop_ids = []
    received_data = []
    content = base64.b64decode(report['datas']).decode('utf-8')

    for line in content.split("\r\n"):
        items = line.split(';')
        if len(items) == 8:
            if (items[4].isnumeric() and items[0] != 'VEN'):
                if not (items[4] in coop_ids):
                    coop_ids.append(items[4])
            if (items[3] == '409600'):
                items[3] == '419600'
            if not (items[0] == 'CAP' and items[3] == '101300' and
                    items[5] != ""):
                received_data.append(items)
    coops = retrieve_odoo_coop_data(coop_ids)
    summarized_lines = process_received_lines(received_data, coops)
    res = make_csv_content_from_lines(summarized_lines)
    file_path = 'data/' + report['name']
    file = open(file_path, 'wb')
    file.write(res['csv_content'])
    file.close()
    return {'file_path' : file_path, 'sells_total': res['sells_total'], 'vat_total': res['vat_total']}

def generate_quadratus_compatible_file(report):
    from .quadratus import generate_quadratus_file
    import zipfile
    import tempfile
    import io
    coop_ids = []
    received_data = []
    content = base64.b64decode(report['datas']).decode('utf-8')
    # content = ''
    # with open('outils/exportMaiComptesCorriges.csv', "r", encoding='utf-8') as csvfile:
    #     content = csvfile.read()
    for line in content.split("\n"):
    # for line in content.split("\r\n"):
        items = line.split(';')
        if len(items) == 8:
            if (items[4].isnumeric() and items[0] != 'VEN'):
                if not (items[4] in coop_ids):
                    coop_ids.append(items[4])
            received_data.append(items)
    coops = retrieve_odoo_coop_data(coop_ids)
    summarized_lines = process_received_lines(received_data, coops, True)
    res = generate_quadratus_file(summarized_lines)
    files = []
    fsuffix = report['name'].replace(".csv", ".txt")
    if len(res['V']) > 0:
        vfn = 'data/ventes_' + fsuffix
        vf = open(vfn, 'wb')
        vf.write(res['V'])
        vf.close()
        files.append(vfn)
    if len(res['K']) > 0:
        kfn = 'data/capital_' + fsuffix
        kf = open(kfn, 'wb')
        kf.write(res['K'])
        kf.close()
        files.append(kfn)

    file_path = 'data/' + report['name'].replace(".csv", ".zip")
    with zipfile.ZipFile(file_path, 'w') as zipf:
        for f in files:
            zipf.write(f)

    # file = open(file_path, 'wb')
    # file.write(res)
    # file.close()

    return {'file_path': file_path}

def generate_odoo_export_file (date_from, date_to):
    """api user needs to have account_export right"""
    api = OdooAPI()

    params = {"name": "export_" + date_from + "_" + date_to,
              "filter_move_lines": "all", "extension": "csv", "config_id": 1,
              "date_from": date_from, "date_to": date_to}
    response = api.create("account.export", params)
    return response

def generate_account_export_report (export_id):
    api = OdooAPI()
    res = api.execute("account.export", 'create_report', [export_id])
    return res

def get_odoo_account_export_report (export_id, final_format):
    api = OdooAPI()
    report = None
    cond = [["res_model", "=", "account.export"], ["res_id", "=", export_id],["type", "in", ["binary"]]]
    res = api.search_read("ir.attachment", cond)
    if (res and len(res) > 0):
        if final_format == 'Quadratus':
            report = generate_quadratus_compatible_file(res[0])
        else:
            report = generate_arithmethique_compatible_file(res[0])
    return report