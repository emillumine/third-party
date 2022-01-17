from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testShopUrlIsResolved(self):

	    c = Client()
	    response = c.get('/shop/')

	    assert response.status_code == 200, "Shop url is not resolved"

