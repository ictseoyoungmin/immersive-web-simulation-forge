from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CheckHtmlTests(unittest.TestCase):
    def test_importmap_script_is_not_checked_as_javascript(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / 'index.html').write_text(
                '<!doctype html><html><body>'
                '<script type="importmap">{"imports": {"three": "./vendor/three.module.js"}}</script>'
                '<script type="module">console.log("ok");</script>'
                '</body></html>',
                encoding='utf-8'
            )
            proc = subprocess.run(['node', str(ROOT / 'scripts/check_html.mjs'), str(root)], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
            report = json.loads(proc.stdout)
            self.assertEqual(report['status'], 'pass')
            self.assertEqual(report['syntax_failures'], [])

    def test_actual_js_syntax_error_still_caught(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / 'index.html').write_text(
                '<!doctype html><html><body><script>const x = ;</script></body></html>',
                encoding='utf-8'
            )
            proc = subprocess.run(['node', str(ROOT / 'scripts/check_html.mjs'), str(root)], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
            self.assertEqual(json.loads(proc.stdout)['status'], 'fail')


class FidelityAuditCrawlTests(unittest.TestCase):
    def test_inline_module_import_is_followed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / 'src').mkdir()
            (root / 'index.html').write_text(
                '<!doctype html><html><head>'
                '<style>@media (prefers-reduced-motion: reduce) { .x{opacity:0} }</style>'
                '</head><body>'
                '<script type="module">import "./src/boot.js";</script>'
                '</body></html>',
                encoding='utf-8'
            )
            (root / 'src/boot.js').write_text(
                "export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;\n"
                "export const motionScale = reducedMotion ? 0 : 1;\n",
                encoding='utf-8'
            )
            proc = subprocess.run(['node', str(ROOT / 'scripts/fidelity_audit.mjs'), str(root)], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
            report = json.loads(proc.stdout)
            scanned = report['metrics']['source_files_scanned']
            self.assertIn('src/boot.js', scanned)
            ids = {f['id'] for f in report['findings']}
            self.assertNotIn('css-only-reduced-motion', ids)

    def test_css_only_reduced_motion_still_flagged_when_no_js_handling_exists(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / 'index.html').write_text(
                '<!doctype html><html><head>'
                '<style>@media (prefers-reduced-motion: reduce) { .x{opacity:0} }</style>'
                '</head><body><script type="module">console.log("no motion handling here");</script></body></html>',
                encoding='utf-8'
            )
            proc = subprocess.run(['node', str(ROOT / 'scripts/fidelity_audit.mjs'), str(root)], capture_output=True, text=True)
            report = json.loads(proc.stdout)
            self.assertIn('css-only-reduced-motion', {f['id'] for f in report['findings']})


if __name__ == '__main__':
    unittest.main()
