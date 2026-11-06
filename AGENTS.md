# Working on this website

Read `README.md`, `docs/AI_HANDOFF.md`, and `docs/CHANGE_REPORT.ar.md` before changing behaviour. User instructions override these project defaults.

- Preserve the approved dark design, typography, images, layout and motion unless a design change is requested. Do not reintroduce a light theme.
- Keep Arabic and English source/translation pairs consistent, including dynamically inserted text and accessibility labels.
- The public course offer is From Zero to Champ. Its five learning areas include psychology and statistical edge; never reintroduce a free standalone-course promotion. Hidden catalogue entries support the dashboard and curriculum.
- Keep course details on `course.html`, not expanded inline on the home page.
- Keep real delivery separate from the local form preview. An empty webhook sends nothing. Validate real backend acknowledgement; no false success UI. No secrets belong in client code.
- Preserve local-only dashboard boundaries. Export public files with `scripts/export_site.py` for static hosting.
- Work only in this repository. Do not add sibling projects, screenshots, local backup folders or `.git` pointers to artifacts.
- Use a focused branch, inspect status/diffs, preserve unrelated changes, run relevant tests and verify the browser. No force push or history rewrite. Push/deploy only when the user authorizes that action.
- Keep documentation aligned with the final implementation; record unresolved business decisions without inventing terms or capabilities.
