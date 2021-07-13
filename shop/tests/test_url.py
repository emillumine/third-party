from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testShopUrlIsResolved(self):

	    c = Client()
	    response = c.get('/shop/')

	    assert type(response).__name__ != "HttpResponseNotFound", "Shop url is not resolved"

