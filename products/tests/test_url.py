from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testProductsUrlIsResolved(self):

        c = Client()
        response = c.get('/products/')

        assert response.status_code == 200, "Products url is not resolved"

