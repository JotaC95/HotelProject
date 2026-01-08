
import logging

logger = logging.getLogger(__name__)

class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print(f"👉 [INCOMING] {request.method} {request.path}")
        print(f"   Headers: {dict(request.headers)}")
        
        response = self.get_response(request)
        
        print(f"👈 [outgoing] Status: {response.status_code}")
        return response
