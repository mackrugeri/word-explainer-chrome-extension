import io
import json
import unittest
from app.main import Handler


class MemoryConnection:
    def __init__(self, request):
        self.input = io.BytesIO(request)
        self.output = bytearray()

    def makefile(self, *args, **kwargs):
        return self.input

    def sendall(self, data):
        self.output.extend(data)


class HttpTests(unittest.TestCase):
    def request(self, method, path, body=b"", content_type="application/json"):
        headers = (f"{method} {path} HTTP/1.0\r\nHost: localhost\r\n"
                   f"Content-Type: {content_type}\r\nContent-Length: {len(body)}\r\n\r\n").encode()
        connection = MemoryConnection(headers + body)
        Handler(connection, ("127.0.0.1", 1234), None)
        head, payload = bytes(connection.output).split(b"\r\n\r\n", 1)
        return int(head.split()[1]), json.loads(payload)

    def test_health_and_missing_route(self):
        self.assertEqual(self.request("GET", "/health"), (200, {"status": "ok", "service": "word-explainer"}))
        self.assertEqual(self.request("GET", "/missing")[0], 404)

    def test_explanation_contract(self):
        status, payload = self.request("POST", "/api/v1/explanations", b'{"text":"borrower"}')
        self.assertEqual(status, 200)
        self.assertEqual(payload["mode"], "prepared_prompt")

    def test_errors(self):
        self.assertEqual(self.request("POST", "/api/v1/explanations", b"invalid")[0], 400)
        self.assertEqual(self.request("POST", "/api/v1/explanations", b"{}")[0], 400)
        self.assertEqual(self.request("POST", "/api/v1/explanations", b"{}", "text/plain")[0], 415)
        self.assertEqual(self.request("POST", "/api/v1/explanations", b"x" * 16385)[0], 413)
        self.assertEqual(self.request("POST", "/missing", b"{}")[0], 404)
