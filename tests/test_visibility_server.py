"""Run with: python -m unittest discover -s tests -p test_visibility_server.py"""

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SPEC = importlib.util.spec_from_file_location("preview_server", Path(__file__).resolve().parents[1] / "serve.py")
preview = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(preview)


class VisibilityStoreTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = preview.VisibilityStore(self.root)

    def tearDown(self):
        self.temporary.cleanup()

    def test_saved_changes_survive_a_new_store_and_match_the_script(self):
        state = deepcopy(preview.DEFAULT_STATE)
        state["courses"]["foundations"] = True
        self.store.write(state)
        self.assertEqual(preview.VisibilityStore(self.root).read(), state)
        script = self.store.js_path.read_text(encoding="utf-8")
        self.assertEqual(json.loads(script.split(" = ", 1)[1].rstrip(";\n")), state)

    def test_invalid_or_unknown_flags_do_not_change_files(self):
        original = self.store.json_path.read_bytes(), self.store.js_path.read_bytes()
        for group, key, value in (("courses", "champ", 1), ("sections", "unexpected", False)):
            with self.subTest(key=key):
                state = deepcopy(preview.DEFAULT_STATE)
                state[group][key] = value
                with self.assertRaises(ValueError):
                    self.store.write(state)
                self.assertEqual((self.store.json_path.read_bytes(), self.store.js_path.read_bytes()), original)

    def test_second_replace_failure_restores_both_previous_files(self):
        original = self.store.json_path.read_bytes(), self.store.js_path.read_bytes()
        state = deepcopy(preview.DEFAULT_STATE)
        state["courses"]["champ"] = False
        replace = preview.os.replace
        count = 0
        def failing_replace(source, target):
            nonlocal count
            count += 1
            if count == 2:
                raise OSError("simulated disk failure")
            return replace(source, target)
        with patch.object(preview.os, "replace", side_effect=failing_replace):
            with self.assertRaises(OSError):
                self.store.write(state)
        self.assertEqual((self.store.json_path.read_bytes(), self.store.js_path.read_bytes()), original)
        self.assertEqual(list(self.root.glob(".visibility-*")), [])


class VisibilityHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temporary.name)
        (cls.root / "index.html").write_text("<h1>Preview</h1>", encoding="utf-8")
        (cls.root / "serve.py").write_text("private", encoding="utf-8")
        (cls.root / ".git").mkdir()
        (cls.root / ".git" / "config").write_text("private", encoding="utf-8")
        cls.server = preview.make_server(cls.root, 0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temporary.cleanup()

    def request(self, path="/api/visibility", *, state=None, headers=None, method=None):
        body = None if state is None else json.dumps(state).encode("utf-8")
        defaults = {"Content-Type": "application/json", "X-Site-Admin": "1", "Origin": self.base}
        if headers:
            defaults.update(headers)
        request = Request(self.base + path, data=body, headers=defaults, method=method or ("PUT" if body is not None else "GET"))
        try:
            return urlopen(request)
        except HTTPError as response:
            return response

    def test_get_and_put_persist_settings_with_no_store(self):
        with self.request() as response:
            state = json.load(response)
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers["Cache-Control"], "no-store")
        state["programs"]["private"] = True
        with self.request(state=state) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(json.load(response), state)
        with self.request("/site-visibility.js") as response:
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.assertIn(b"window.MB_VISIBILITY_STATE", response.read())

    def test_foreign_origins_missing_header_and_invalid_schema_are_rejected(self):
        state = deepcopy(preview.DEFAULT_STATE)
        for headers in ({"Origin": "https://foreign.invalid"}, {"X-Site-Admin": ""}, {"Host": "foreign.invalid"}):
            with self.subTest(headers=headers), self.request(state=state, headers=headers) as response:
                self.assertEqual(response.status, 403)
        with self.request(state={"version": 1}) as response:
            self.assertEqual(response.status, 400)
        with self.request(state=state, headers={"Content-Type": "text/plain"}) as response:
            self.assertEqual(response.status, 415)

    def test_private_files_and_unknown_write_paths_are_not_served(self):
        for path in ("/serve.py", "/.git/config", "/tests/example.js", "/%2e%2e/config.js"):
            with self.subTest(path=path), self.request(path) as response:
                self.assertEqual(response.status, 404)
        with self.request("/index.html", state=preview.DEFAULT_STATE) as response:
            self.assertEqual(response.status, 404)


if __name__ == "__main__":
    unittest.main()
