from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testMembersUrlIsResolved(self):

        c = Client()
        response = c.get('/members/')

        assert type(response).__name__ != "HttpResponseNotFound", "Members url is not resolved"
