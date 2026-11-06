"""The published artifact must not expose local tooling or depend on it."""
import hashlib
import importlib.util
from pathlib import Path
import re
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location("site_export", Path(__file__).resolve().parents[1] / "scripts/export_site.py")
export = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(export)


class ExportSiteTests(unittest.TestCase):
    def test_php_relays_ship_without_the_private_n8n_address(self):
        root = Path(__file__).resolve().parents[1]
        for name in ["api/apply.php", "api/book.php", "api/relay-config.example.php"]:
            self.assertNotRegex((root / name).read_text(encoding="utf-8"), r"\d+\.\d+\.\d+\.\d+:5678", name)
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "public"
            export.export_site(output)
            self.assertTrue((output / "api/apply.php").is_file())
            self.assertTrue((output / "api/book.php").is_file())
            self.assertFalse((output / "api/relay-config.php").exists())

    def test_export_is_public_only_and_versions_existing_resources(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "public"
            count = export.export_site(output)
            self.assertEqual(count, len(list(p for p in output.rglob("*") if p.is_file())))
            for forbidden in [".git", "dashboard.html", "dashboard.js", "serve.py", "tests", "README.md", "site-visibility.json", "config.py"]:
                self.assertFalse((output / forbidden).exists(), forbidden)
            for page in ["index.html", "course.html", "apply.html", "pay.html", "book.html"]:
                text = (output / page).read_text(encoding="utf-8")
                resources = re.findall(r'(?:src|href)="([^"?]+\.(?:js|css))\?v=([a-f0-9]{12})"', text)
                self.assertTrue(resources, page)
                local_resources = re.findall(r'(?:src|href)="([^":]+\.(?:js|css)(?:\?[^" ]*)?)"', text)
                self.assertEqual(len(resources), len(local_resources), f"Unversioned resource in {page}")
                for name, digest in resources:
                    self.assertEqual(digest, hashlib.sha256((output / name).read_bytes()).hexdigest()[:12])
                for name in re.findall(r'(?:src|href)="(assets/[^"?]+)"', text):
                    self.assertTrue((output / name).is_file(), name)
            self.assertTrue((output / "assets/img/courses-quant.jpg").is_file())
            self.assertTrue((output / "site-visibility.js").is_file())

    def test_export_refuses_to_overwrite_existing_files_or_source(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            marker = output / "keep.txt"
            marker.write_text("keep", encoding="utf-8")
            with self.assertRaises(ValueError):
                export.export_site(output)
            self.assertEqual(marker.read_text(encoding="utf-8"), "keep")
        for output in [export.ROOT, export.ROOT.parent, export.ROOT / "assets"]:
            with self.subTest(output=output), self.assertRaises(ValueError):
                export.export_site(output)
