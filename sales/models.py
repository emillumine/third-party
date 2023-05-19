from django.db import models
from outils.common_imports import *

from outils.common import OdooAPI


class CagetteSales(models.Model):
    """Class to manage operations on envelops"""

    def __init__(self):
        """Init with odoo id."""
        self.o_api = OdooAPI()

    def get_sales(self, date_from, date_to):
        res = []

        # Get pos orders
        cond = [['date_order', '>=', date_from], ['date_order', '<=', date_to]]
        fields = ['partner_id', 'statement_ids', 'name']
        orders = self.o_api.search_read('pos.order', cond, fields)
        # Get bank statements of these sessions
        statements = []
        statements_partners = {}
        statements_orders = {}
        for o in orders:
            statements = statements + o["statement_ids"]
            for s in o["statement_ids"]:
                statements_partners[s] = o["partner_id"][1]
                statements_orders[s] = o["name"]
        # Get payment lines
        cond = [['id', 'in', statements]]
        fields = ["amount", "journal_id", "create_date", "meal_voucher_issuer"]
        payments = self.o_api.search_read('account.bank.statement.line', cond, fields, order="create_date ASC", limit=50000)
        try:
            for payment in payments:
                res.append({
                            "partner": statements_partners[payment["id"]],
                            "create_date": payment["create_date"],
                            "pos_order_name": statements_orders[payment["id"]],
                            "total_amount": round(float(payment["amount"]), 2),
                            "payments": [
                                {
                                    "amount": round(float(payment["amount"]), 2),
                                    "journal_id": payment["journal_id"],
                                    "meal_voucher_issuer": payment["meal_voucher_issuer"]
                                }
                            ]
                           })
        except Exception as e:
            coop_logger.error("get_sales %s", str(e))

        return res
