from django.test import SimpleTestCase
from django.test import Client

class TestUrls(SimpleTestCase):

    def testShelfsUrlIsResolved(self):

    	c = Client()
    	response = c.get('/shelfs/')
    
    	assert response.status_code == 200, "Shelfs url is not resolved"

