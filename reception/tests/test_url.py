from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testReceptionUrlIsResolved(self):

        c = Client()
        response = c.get('/reception/')

        assert response.status_code == 200 , "Reception url is not resolved"

