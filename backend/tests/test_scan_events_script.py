import json
import os
import unittest
from io import StringIO
from unittest.mock import patch

from scripts.scan_events import main


class RideScannerScriptTests(unittest.TestCase):
    @patch("scripts.scan_events.run_scan")
    def test_successful_scan_reports_candidate_totals(self, run_scan):
        run_scan.return_value = {
            "sources_scanned": 2,
            "results": [
                {"source_id": 1, "status": "success", "created": 3, "updated": 1},
                {"source_id": 2, "status": "success", "created": 2, "updated": 4},
            ],
        }
        with patch.dict(os.environ, {"ADMIN_PASSWORD": "secret"}, clear=True), patch("sys.stdout", new_callable=StringIO) as output:
            self.assertEqual(main(), 0)
        payload = json.loads(output.getvalue())
        self.assertEqual(payload["ride_scan"]["sources_scanned"], 2)
        self.assertEqual(payload["ride_scan"]["candidates_created"], 5)
        self.assertEqual(payload["ride_scan"]["candidates_updated"], 5)

    @patch("scripts.scan_events.run_scan")
    def test_source_failure_fails_job_for_render_alerting(self, run_scan):
        run_scan.return_value = {
            "sources_scanned": 1,
            "results": [{"source_id": 4, "status": "failed", "error": "timeout"}],
        }
        with patch.dict(os.environ, {"ADMIN_PASSWORD": "secret"}, clear=True), patch("sys.stdout", new_callable=StringIO):
            self.assertEqual(main(), 1)

    def test_admin_password_is_required(self):
        with patch.dict(os.environ, {}, clear=True), patch("sys.stderr", new_callable=StringIO):
            self.assertEqual(main(), 1)


if __name__ == "__main__":
    unittest.main()
