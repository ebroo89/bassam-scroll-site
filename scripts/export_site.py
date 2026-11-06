"""Export public static files only; run from any directory with Python 3.10+."""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = (
    ".nojekyll", "index.html", "course.html", "apply.html", "book.html",
    "app.js", "config.js", "translations.js", "i18n.js", "brand.js", "brand.css",
    "style.css", "motion.js", "motion.css", "edge.js", "edge.css",
    "courses.css", "course-page.css", "course-curriculum.js", "course-curriculum.css",
    "learning-guide.js", "learning-guide.css", "site-visibility.js", "visibility.js",
    "market-section.js", "market-section.css", "market-surface-motion.js",
    "market-strike-motion.js", "market-footprint-motion.js", "footprint-visual.js",
    "book.js", "book.css", "accents.css",
)
ASSET_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".svg", ".ico", ".woff", ".woff2"}
LOCAL_RESOURCE = re.compile(r'((?:src|href)=")([^"?]+\.(?:js|css))(?:\?[^"#]*)?(")')


def export_site(destination: Path, source: Path = ROOT) -> int:
    source, destination = source.resolve(), destination.resolve()
    # Never overwrite source, an ancestor, or a non-empty output folder.
    if destination == source or destination in source.parents:
        raise ValueError("The output cannot replace the source tree or its parent.")
    if destination.is_relative_to(source) and not destination.is_relative_to(source / "dist"):
        raise ValueError("Inside the source tree, use dist/ as the output directory.")
    paths = [source / name for name in PUBLIC_FILES]
    assets = sorted(p for p in (source / "assets").rglob("*") if p.is_file() and p.suffix.lower() in ASSET_TYPES)
    paths += assets
    if any(not p.is_file() or p.is_symlink() or not p.resolve().is_relative_to(source) for p in paths):
        raise ValueError("A public file is missing or links outside the source tree.")
    if destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
        raise ValueError("The output already contains files. Choose a new directory.")
    destination.mkdir(parents=True, exist_ok=True)
    for path in paths:
        target = destination / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        if path.suffix == ".html":
            def version(match):
                name = match.group(2)
                if ":" in name or name.startswith("/"):
                    return match.group(0)
                resource = source / name
                if name not in PUBLIC_FILES or not resource.is_file():
                    raise ValueError(f"Missing public resource: {name}")
                digest = hashlib.sha256(resource.read_bytes()).hexdigest()[:12]
                return f'{match.group(1)}{name}?v={digest}{match.group(3)}'
            target.write_text(LOCAL_RESOURCE.sub(version, path.read_text(encoding="utf-8")), encoding="utf-8")
        else:
            shutil.copy2(path, target)
    return len(paths)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    try:
        count = export_site(args.output)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Export failed: {error}\n")
    print(f"Exported {count} public files to {args.output.resolve()}")
    print("This does not publish the site or enable real form delivery.")


if __name__ == "__main__":
    main()
