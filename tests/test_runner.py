import importlib.util
import json
import os
import tempfile
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("runner", Path(__file__).resolve().parents[1] / "scripts/run_sqlite_probe.py")
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class RunnerTests(unittest.TestCase):
    def test_nas_denied_before_any_files_or_commands(self):
        with patch.object(r, "create_workspace") as create, patch.object(r.subprocess, "run") as run:
            with self.assertRaisesRegex(RuntimeError, "NAS_WRITE_APPROVAL_REQUIRED"):
                r.execute("nas", "a" * 40, Path("/unused"))
            create.assert_not_called()
            run.assert_not_called()

    def test_exclusive_workspace_and_private_modes(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp).resolve()
            workspace, data = r.create_workspace(parent, "klh-pr1a-012345abcdef")
            self.assertEqual(data.stat().st_mode & 0o777, 0o700)
            self.assertEqual((data / ".klh-pr1a-owned").read_text(), r.MARKER)
            with self.assertRaises(FileExistsError):
                r.create_workspace(parent, "klh-pr1a-012345abcdef")
            self.assertTrue(workspace.exists())

    def test_invalid_name_and_symlink_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp).resolve()
            with self.assertRaisesRegex(RuntimeError, "INVALID_PROJECT_NAME"):
                r.create_workspace(parent, "existing-project")
            link = parent / "link"
            link.symlink_to(parent, target_is_directory=True)
            with self.assertRaisesRegex(RuntimeError, "SYMLINK_REFUSED"):
                r.validate_parent(link)

    def test_root_refused(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(r.os, "getuid", return_value=0):
            with self.assertRaisesRegex(RuntimeError, "NON_ROOT_HOST_USER_REQUIRED"):
                r.validate_parent(Path(temp).resolve())

    def test_unknown_schema_refused(self):
        with self.assertRaisesRegex(RuntimeError, "UNKNOWN_PROBE_CHECK"):
            r.parse_probe_output(json.dumps(dict(schemaVersion=1, checks={"private": "secret"})))

    def test_inspect_permission_error_is_not_container_absence(self):
        denied = subprocess.CompletedProcess([], 1, "", "permission denied at private endpoint")
        with patch.object(r.subprocess, "run", return_value=denied):
            with self.assertRaisesRegex(RuntimeError, "CONTAINER_INSPECT_BLOCKED"):
                r.container_absent("docker", "klh-pr1a-012345abcdef-exercise")
        absent = subprocess.CompletedProcess([], 1, "", "Error: No such object: synthetic")
        with patch.object(r.subprocess, "run", return_value=absent):
            self.assertTrue(r.container_absent("docker", "klh-pr1a-012345abcdef-exercise"))

    def test_two_distinct_containers_share_only_created_directory(self):
        calls = []
        def fake(argv, **kwargs):
            calls.append(argv)
            if argv[0] == "git":
                out = "a" * 40 if "rev-parse" in argv else ""
            elif argv[1:3] == ["context", "show"]:
                out = "default\n"
            elif argv[1:3] == ["context", "inspect"]:
                out = "unix:///var/run/docker.sock\n"
            elif argv[1] == "inspect":
                return subprocess.CompletedProcess(argv, 1, "", "No such object")
            elif "run" in argv:
                out = json.dumps(dict(schemaVersion=1, status="PASS", repositorySha="a" * 40,
                                      runtime={"uid": os.getuid()}, checks={}))
            else:
                out = ""
            return subprocess.CompletedProcess(argv, 0, out, "")
        with tempfile.TemporaryDirectory() as temp, patch.object(r.shutil, "which", side_effect=lambda n: n), \
                patch.object(r.subprocess, "run", side_effect=fake), patch.dict(os.environ, {"DOCKER_CONTEXT": "default", "DOCKER_HOST": ""}):
            report = r.execute("ci", "a" * 40, Path(temp).resolve())
            self.assertEqual(report["status"], "PASS")
            runs = [c for c in calls if "run" in c]
            self.assertEqual(len(runs), 2)
            self.assertNotEqual(runs[0][runs[0].index("--name") + 1], runs[1][runs[1].index("--name") + 1])
            self.assertTrue(all("--rm" in c and "--no-deps" in c for c in runs))
            self.assertFalse(any("down" in c or "prune" in c for c in calls))
            self.assertNotIn(temp, json.dumps(report))

    def test_wrong_checkout_sha_is_refused(self):
        wrong = subprocess.CompletedProcess([], 0, "b" * 40, "")
        with patch.object(r.subprocess, "run", return_value=wrong):
            with self.assertRaisesRegex(RuntimeError, "CHECKOUT_SHA_MISMATCH"):
                r.verify_source("a" * 40)

    def test_dirty_checkout_is_refused(self):
        results = [subprocess.CompletedProcess([], 0, "a" * 40, ""), subprocess.CompletedProcess([], 0, " M synthetic", "")]
        with patch.object(r.subprocess, "run", side_effect=results):
            with self.assertRaisesRegex(RuntimeError, "CLEAN_CHECKOUT_REQUIRED"):
                r.verify_source("a" * 40)


if __name__ == "__main__":
    unittest.main()
