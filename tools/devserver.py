"""Static file server for local testing. POST /shot?name=x with a PNG data URL
body saves tools/_shot_x.png (x3 nearest upscale) so canvas frames can be inspected."""
import base64, http.server, io, os, sys, urllib.parse
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        name = urllib.parse.parse_qs(q.query).get("name", ["shot"])[0]
        body = self.rfile.read(int(self.headers["Content-Length"])).decode()
        im = Image.open(io.BytesIO(base64.b64decode(body.split(",", 1)[1])))
        im = im.resize((im.width * 3, im.height * 3), Image.NEAREST)
        im.save(os.path.join(ROOT, "tools", f"_shot_{name}.png"))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")     # always serve fresh files while developing
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8931
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
