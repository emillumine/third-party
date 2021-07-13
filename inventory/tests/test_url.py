from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testInventoryUrlIsResolved(self):

        c = Client()
        response = c.get('/reception/')

        assert type(response).__name__ != "HttpResponseNotFound", "Inventory url is not resolved"

