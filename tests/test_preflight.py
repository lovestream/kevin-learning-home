import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("preflight", Path(__file__).resolve().parents[1] / "scripts/nas_preflight.py")
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class PreflightTests(unittest.TestCase):
    def test_permission_is_blocked_not_daemon_failure(self):
        self.assertEqual(p.classify(1, "permission denied at secret endpoint")["reason"], "PERMISSION_DENIED")
        self.assertEqual(p.classify(1, "Cannot connect to daemon")["status"], "FAIL")
        self.assertNotIn("secret", json.dumps(p.classify(1, "permission denied secret")))

    def test_missing_and_timeout(self):
        with patch.object(p, "locate", return_value=None):
            self.assertEqual(p.command("docker", [], p.version, True)["status"], "BLOCKED")
            self.assertEqual(p.command("tailscale", [], p.version)["status"], "NOT_RUN")
        with patch.object(p, "locate", return_value="docker"), patch.object(p, "run", return_value=(None, "", "TIMEOUT")):
            self.assertEqual(p.command("docker", [], p.version)["reason"], "TIMEOUT")

    def test_arbitrary_errors_redacted(self):
        with patch.object(p, "locate", return_value="docker"), patch.object(p, "run", return_value=(1, "private.example 198.51.100.23", "token")):
            result = p.command("docker", [], p.version)
        self.assertEqual(result["reason"], "COMMAND_FAILED_REDACTED")
        self.assertNotIn("private", json.dumps(result))

    def test_tailscale_identity_and_peers_removed(self):
        value = json.dumps(dict(BackendState="Running", MagicDNSSuffix="private.example", Self=dict(Online=True, DNSName="child.private.example"), Peer={"secret": {"TailscaleIPs": ["198.51.100.23"]}}))
        out = p.tailscale_status(value)
        self.assertEqual(out, dict(backendState="Running", selfOnline=True, magicDNSConfigured=True))
        self.assertNotIn("private", json.dumps(out))

    def test_ports_only_numbers(self):
        result = p.ports("LISTEN 0 128 198.51.100.23:8080 0.0.0.0:*\nLISTEN 0 128 [::]:22 [::]:*")
        self.assertEqual(result["observedPorts"], {"8080": True, "4177": False})

    def test_old_kernel_is_not_officially_supported(self):
        with patch.object(p.platform, "system", return_value="Linux"), patch.object(p.platform, "release", return_value="4.4.180+"), \
                patch.object(p, "command", return_value=p.result("NOT_RUN", "MOCK")), patch.object(p, "filesystem", return_value=p.result("PASS", "MOCK")), \
                patch.object(p, "socket_permissions", return_value=p.result("BLOCKED", "MOCK")):
            out = p.collect("nas", "a" * 40, "/unused")
        self.assertEqual(out["checks"]["node24GlibcKernelBaseline"]["status"], "FAIL")
        self.assertEqual(out["repositorySha"], "a" * 40)

    def test_all_inventory_commands_are_read_only(self):
        calls = []
        def fake(argv):
            calls.append(argv)
            if "--json" in argv:
                return 0, '{"BackendState":"Running","Self":{}}', ""
            return 0, "20.10.3", ""
        with patch.object(p, "locate", side_effect=lambda name: name), patch.object(p, "run", side_effect=fake):
            p.collect("local", "a" * 40, ".")
        allowed = {("docker", "--version"), ("docker", "version", "--format", "{{.Server.Version}}"),
                   ("docker-compose", "version", "--short"), ("docker", "compose", "version", "--short"),
                   ("tailscale", "version"), ("tailscale", "status", "--json"), ("ss", "-ltn")}
        self.assertTrue(all(tuple(call) in allowed for call in calls))

    def test_os_timeout_is_bounded(self):
        with patch.object(p.subprocess, "run", side_effect=subprocess.TimeoutExpired("docker", 8)):
            self.assertEqual(p.run(["docker"]), (None, "", "TIMEOUT"))


if __name__ == "__main__":
    unittest.main()
