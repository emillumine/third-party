from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testOrdersUrlIsResolved(self):

	    c = Client()
	    response = c.get('/orders/')

	    assert response.status_code == 200, "Orders url is not resolved"

