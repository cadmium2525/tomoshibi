"""PV production server: serves the game like tools/devserver.py and takes frames.
POST /pv/frames?clip=NAME  body {"start": i, "frames": [dataURL, ...]}  -> pv/footage/NAME/%05d.png
POST /pv/still?name=NAME   body dataURL                                  -> pv/stills/NAME.png
(pv/ is the working folder; it is not committed.)"""
import base64, json, os, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import devserver  # noqa: E402

ROOT = devserver.ROOT
OUT = os.path.join(ROOT, "pv")


class H(devserver.H):
    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        args = urllib.parse.parse_qs(q.query)
        body = self.rfile.read(int(self.headers["Content-Length"])).decode()
        if q.path == "/pv/frames":
            d = json.loads(body)
            folder = os.path.join(OUT, "footage", args["clip"][0])
            os.makedirs(folder, exist_ok=True)
            for k, url in enumerate(d["frames"]):
                with open(os.path.join(folder, f"{d['start'] + k:05d}.png"), "wb") as f:
                    f.write(base64.b64decode(url.split(",", 1)[1]))
        elif q.path == "/pv/still":
            folder = os.path.join(OUT, "stills")
            os.makedirs(folder, exist_ok=True)
            with open(os.path.join(folder, args["name"][0] + ".png"), "wb") as f:
                f.write(base64.b64decode(body.split(",", 1)[1]))
        else:
            return super().do_POST()
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


if __name__ == "__main__":
    import http.server
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8934
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
