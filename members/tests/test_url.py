from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testMembersUrlIsResolved(self):

        c = Client()
        response = c.get('/members/')

        assert response.status_code == 200, "Members url is not resolved"
