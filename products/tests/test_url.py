from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testProductsUrlIsResolved(self):

        c = Client()
        response = c.get('/products/')

        assert type(response).__name__ != "HttpResponseNotFound", "Products url is not resolved"

