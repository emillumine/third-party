from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testSalesUrlIsResolved(self):

	    c = Client()
	    response = c.get('/sales/')

	    assert response.status_code == 200, "Sales url is not resolved"

