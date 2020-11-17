from django.utils.deprecation import MiddlewareMixin

class newCorsMiddleware(MiddlewareMixin):
    def process_response(self, req, resp):
        from urllib.parse import urlparse
        referer = '*'
        try:
            # referer = urlparse(req.META['HTTP_REFERER']).hostname
            referer = req.META['HTTP_REFERER']
        except:
            pass
        # resp["X-Frame-Options"] = "ALLOW-FROM " + referer
        resp["X-Frame-Options"] = "ALLOWALL"
        # resp["Content-Security-Policy"] = "frame-src " + req.META['HTTP_HOST']
        return resp
