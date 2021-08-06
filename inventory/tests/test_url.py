from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testInventoryUrlIsResolved(self):

        c = Client()
        response = c.get('/reception/')

        assert response.status_code == 200, "Inventory url is not resolved"

