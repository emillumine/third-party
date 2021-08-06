from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testStockUrlIsResolved(self):

	    c = Client()
	    response = c.get('/stock/')

	    assert response.status_code == 200, "Stock url is not resolved"

