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

        # Get pos sessions
        cond = [['stop_at', '>=', date_from], ['stop_at', '<=', date_to], ['state', '=', "closed"]]
        fields = []
        sessions = self.o_api.search_read('pos.session', cond, fields)

        # Get bank statements of these sessions
        statements = []
        for s in sessions:
            statements = statements + s["statement_ids"]

        # Get payment lines
        cond = [['statement_id', 'in', statements]]
        fields = ["partner_id", "amount", "journal_id", "create_date", "date"]
        payments = self.o_api.search_read('account.bank.statement.line', cond, fields, order="create_date ASC")

        item = None
        try:
            for payment in payments:
                if item is not None and item["partner_id"][0] == payment["partner_id"][0] and item["date"] == payment["date"]:
                    res[len(res)-1]["total_amount"] += round(float(payment["amount"]), 2)
                    res[len(res)-1]["payments"].append({
                        "amount": round(float(payment["amount"]), 2),
                        "journal_id": payment["journal_id"]
                    })
                else:
                    item = {
                        "partner_id": payment["partner_id"],
                        "create_date": payment["create_date"],
                        "date": payment["date"],
                        "total_amount": round(float(payment["amount"]), 2),
                        "payments": [
                            {
                                "amount": round(float(payment["amount"]), 2),
                                "journal_id": payment["journal_id"]
                            }
                        ]
                    }

                    res.append(item)
        except Exception as e:
            pass

        return res
