from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testReceptionUrlIsResolved(self):

        c = Client()
        response = c.get('/reception/')

        assert type(response).__name__ != "HttpResponseNotFound", "Reception url is not resolved"

