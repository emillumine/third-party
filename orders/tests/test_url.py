from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testOrdersUrlIsResolved(self):

	    c = Client()
	    response = c.get('/orders/')

	    assert type(response).__name__ != "HttpResponseNotFound", "Orders url is not resolved"