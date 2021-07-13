from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testShelfsUrlIsResolved(self):

    	c = Client()
    	response = c.get('/shelfs/')
    
    	assert type(response).__name__ != "HttpResponseNotFound", "Shelfs url is not resolved"

