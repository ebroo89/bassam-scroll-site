"""Local website preview with a file-backed visibility dashboard.

Run: python serve.py --port 8766
This development server deliberately listens on the loopback interface only.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
import threading
from urllib.parse import unquote, urlsplit


SECTION_IDS = ("hero", "edge", "reads", "programs", "rules", "contact")
PROGRAM_IDS = ("group", "private", "consult", "indicator")
COURSE_IDS = (
    "foundations", "order-flow", "options-flow", "quant", "psychology", "edge",
    "zero-intermediate", "order-options", "champ",
)
DEFAULT_STATE = {
    "version": 1,
    "sections": {key: True for key in SECTION_IDS},
    "programs": {key: True for key in PROGRAM_IDS},
    "courses": {key: key == "champ" for key in COURSE_IDS},
}
MAX_BODY_BYTES = 16 * 1024


def validate_state(value):
    """Accept a complete, known schema, never truthy substitutes or new keys."""
    if not isinstance(value, dict) or set(value) != {"version", "sections", "programs", "courses"}:
        raise ValueError("Send version, sections, programs, and courses only.")
    if type(value["version"]) is not int or value["version"] != 1:
        raise ValueError("Unsupported visibility version.")
    for name, keys in (("sections", SECTION_IDS), ("programs", PROGRAM_IDS), ("courses", COURSE_IDS)):
        group = value[name]
        if not isinstance(group, dict) or set(group) != set(keys):
            raise ValueError(f"Invalid {name} keys.")
        if any(type(flag) is not bool for flag in group.values()):
            raise ValueError(f"Every {name} value must be true or false.")
    return deepcopy(value)


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON keys are not allowed.")
        result[key] = value
    return result


class VisibilityStore:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.json_path = self.root / "site-visibility.json"
        self.js_path = self.root / "site-visibility.js"
        self.lock = threading.RLock()
        # JSON is the source of truth; regenerate its JS mirror at startup.
        state = self.read() if self.json_path.exists() else deepcopy(DEFAULT_STATE)
        self.write(state)

    def read(self):
        with self.lock:
            return validate_state(json.loads(self.json_path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicate_keys))

    def write(self, state):
        state = validate_state(state)
        payload = json.dumps(state, ensure_ascii=False, indent=2) + "\n"
        script = "/* Generated from site-visibility.json by the local dashboard. */\nwindow.MB_VISIBILITY_STATE = " + payload.rstrip() + ";\n"
        with self.lock:
            targets = ((self.js_path, script), (self.json_path, payload))
            previous = {path: path.read_bytes() if path.exists() else None for path, _ in targets}
            staged = []
            replaced = []
            try:
                # Prepare both files fully before replacing either live file.
                for path, content in targets:
                    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", dir=self.root, prefix=".visibility-", delete=False) as output:
                        output.write(content)
                        output.flush()
                        os.fsync(output.fileno())
                        staged.append((Path(output.name), path))
                for temporary, target in staged:
                    os.replace(temporary, target)
                    replaced.append(target)
            except OSError:
                for target in reversed(replaced):
                    original = previous[target]
                    if original is None:
                        target.unlink(missing_ok=True)
                    else:
                        target.write_bytes(original)
                raise
            finally:
                for temporary, _ in staged:
                    temporary.unlink(missing_ok=True)
        return state


class LocalPreviewHandler(SimpleHTTPRequestHandler):
    server_version = "BassamLocalPreview/1.0"
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".json": "application/json"}
    public_extensions = {".html", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".webmanifest"}

    def __init__(self, *args, directory, store, **kwargs):
        self.store = store
        self.root = Path(directory).resolve()
        super().__init__(*args, directory=str(self.root), **kwargs)

    def end_headers(self):
        # A dashboard change must also reach previously opened preview tabs.
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def json_response(self, status, payload, *, head=False):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def local_host(self):
        port = self.server.server_address[1]
        return self.headers.get("Host", "") in (f"127.0.0.1:{port}", f"localhost:{port}")

    def allowed_static(self):
        raw_path = unquote(urlsplit(self.path).path).replace("\\", "/")
        segments = raw_path.strip("/").split("/")
        if any(segment.startswith(".") or segment == "tests" for segment in segments if segment):
            return False
        relative = raw_path.lstrip("/") or "index.html"
        path = (self.root / relative).resolve()
        if not path.is_relative_to(self.root):
            return False
        if path.is_dir():
            return (path / "index.html").is_file()
        return path.suffix.lower() in self.public_extensions or path == self.store.json_path

    def do_GET(self):
        self.get_or_head(False)

    def do_HEAD(self):
        self.get_or_head(True)

    def get_or_head(self, head):
        if not self.local_host():
            self.json_response(403, {"error": "Use this preview through localhost."}, head=head)
            return
        if urlsplit(self.path).path == "/api/visibility":
            try:
                self.json_response(200, self.store.read(), head=head)
            except (OSError, ValueError):
                self.json_response(503, {"error": "Unable to read visibility settings."}, head=head)
            return
        if not self.allowed_static():
            self.send_error(404)
            return
        if head:
            super().do_HEAD()
        else:
            super().do_GET()

    def do_PUT(self):
        if not self.local_host():
            self.json_response(403, {"error": "Use this preview through localhost."})
            return
        if urlsplit(self.path).path != "/api/visibility":
            self.json_response(404, {"error": "Unknown endpoint."})
            return
        origin = self.headers.get("Origin")
        expected_origin = f"http://{self.headers.get('Host')}"
        if self.headers.get("X-Site-Admin") != "1" or (origin is not None and origin != expected_origin):
            self.json_response(403, {"error": "Save settings from the local dashboard."})
            return
        if self.headers.get_content_type() != "application/json":
            self.json_response(415, {"error": "Content-Type must be application/json."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_BODY_BYTES:
            self.json_response(413, {"error": "Invalid settings payload size."})
            return
        try:
            state = json.loads(self.rfile.read(length).decode("utf-8"), object_pairs_hook=reject_duplicate_keys)
            state = validate_state(state)
        except (UnicodeError, ValueError):
            self.json_response(400, {"error": "Invalid visibility settings. Reload the dashboard and try again."})
            return
        try:
            self.store.write(state)
        except OSError:
            self.json_response(500, {"error": "Settings could not be saved. The previous settings were kept."})
            return
        self.json_response(200, state)


def make_server(root, port=8766):
    root = Path(root).resolve()
    store = VisibilityStore(root)
    handler = partial(LocalPreviewHandler, directory=str(root), store=store)
    return ThreadingHTTPServer(("127.0.0.1", port), handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()
    server = make_server(Path(__file__).resolve().parent, args.port)
    print(f"Local website: http://127.0.0.1:{server.server_address[1]}/", flush=True)
    print(f"Dashboard: http://127.0.0.1:{server.server_address[1]}/dashboard.html", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
