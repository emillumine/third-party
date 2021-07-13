from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testStockUrlIsResolved(self):

	    c = Client()
	    response = c.get('/stock/')

	    assert type(response).__name__ != "HttpResponseNotFound", "Stock url is not resolved"

