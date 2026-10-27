"""Local HTTP API. Run with python3 -m app.main."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from .config import HOST, PORT, MAX_BODY_BYTES
from .services import prepare_explanation


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.respond(200, {"status": "ok", "service": "word-explainer"})
        else:
            self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/api/v1/explanations":
            self.respond(404, {"error": "Not found"})
            return
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            self.respond(415, {"error": "Content-Type must be application/json"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BODY_BYTES:
                self.respond(413, {"error": "Body must be between 1 and 16384 bytes"})
                return
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            result = prepare_explanation(payload)
        except (ValueError, UnicodeError) as error:
            self.respond(400, {"error": str(error)})
            return
        self.respond(200, result)

    def log_message(self, format, *args):
        # Avoid logging request URLs, which could contain selected text.
        pass


class Server(ThreadingHTTPServer):
    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(10)
        return connection, address


def main():
    server = Server((HOST, PORT), Handler)
    print(f"Word Explainer backend: http://{HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
