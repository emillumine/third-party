from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testSalesUrlIsResolved(self):

	    c = Client()
	    response = c.get('/sales/')

	    assert type(response).__name__ != "HttpResponseNotFound", "Sales url is not resolved"

