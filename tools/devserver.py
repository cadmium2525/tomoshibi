"""Static file server for local testing.
POST /shot?name=x with a PNG data URL body saves tools/_shot_x.png (x3 nearest upscale)
so canvas frames can be inspected.
POST /api/stage-edits with {"edits": {chapter: stage}} (from editor.html) writes
src/stage_edits.js, the stages the game plays in place of the built ones."""
import base64, http.server, io, json, os, sys, urllib.parse
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        if q.path == "/api/stage-edits":
            self.save_edits()
            return
        name = urllib.parse.parse_qs(q.query).get("name", ["shot"])[0]
        body = self.rfile.read(int(self.headers["Content-Length"])).decode()
        im = Image.open(io.BytesIO(base64.b64decode(body.split(",", 1)[1])))
        im = im.resize((im.width * 3, im.height * 3), Image.NEAREST)
        im.save(os.path.join(ROOT, "tools", f"_shot_{name}.png"))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def save_edits(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])).decode("utf-8"))
            edits = {int(k): v for k, v in body["edits"].items()}
            lines = ["'use strict';",
                     "// Stages changed in the stage editor (editor.html). Written by the editor's 「保存」 - edit there, not here.",
                     "// Each entry replaces that chapter's build(). Remove an entry (or use 「オリジナルに戻す」 → 保存) to go back.",
                     "for (const [n, d] of Object.entries({"]
            for n in sorted(edits):
                lines.append(f"  {n}: {json.dumps(edits[n], ensure_ascii=False, separators=(',', ':'))},")
            lines.append("})) { STAGE_EDITS[n] = d; applyStageTexts(+n, d); }")
            path = os.path.join(ROOT, "src", "stage_edits.js")
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write("\n".join(lines) + "\n")
            out, code = {"ok": True, "chapters": sorted(edits)}, 200
        except Exception as e:  # noqa: BLE001 - report anything back to the editor
            out, code = {"ok": False, "error": str(e)}, 500
        data = json.dumps(out).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")     # always serve fresh files while developing
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8931
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
