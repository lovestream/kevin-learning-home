#!/usr/bin/env python3
"""Read-only, redacted host inventory; never returns command stderr or identities."""
import argparse
import datetime
import json
import os
import platform
import re
import shutil
import stat
import subprocess
from pathlib import Path

VERSION = "1.0.0"
STATUSES = ("PASS", "FAIL", "BLOCKED", "NOT_RUN")


def result(status, reason, exit_code=None, **facts):
    return dict(status=status, reason=reason, exitCode=exit_code, **facts)


def classify(code, error):
    text = error.lower()
    if "permission denied" in text or "operation not permitted" in text:
        return result("BLOCKED", "PERMISSION_DENIED", code)
    if "cannot connect" in text or "connection refused" in text or "is the docker daemon running" in text:
        return result("FAIL", "DAEMON_UNAVAILABLE", code)
    return result("FAIL", "COMMAND_FAILED_REDACTED", code)


def run(argv):
    try:
        p = subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                           text=True, timeout=8, env=dict(os.environ, LC_ALL="C"))
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return None, "", "TIMEOUT"
    except PermissionError:
        return 126, "", "permission denied"
    except OSError:
        return 127, "", "unavailable"


def locate(name):
    found = shutil.which(name)
    if found:
        return found
    candidates = {
        "docker": ["/usr/local/bin/docker", "/var/packages/Docker/target/usr/bin/docker"],
        "docker-compose": ["/usr/local/bin/docker-compose"],
        "tailscale": ["/usr/local/bin/tailscale", "/var/packages/Tailscale/target/bin/tailscale"],
    }
    return next((p for p in candidates.get(name, []) if os.access(p, os.X_OK)), None)


def command(name, args, parse, required=False):
    exe = locate(name)
    if not exe:
        return result("BLOCKED" if required else "NOT_RUN", "COMMAND_NOT_FOUND")
    code, out, err = run([exe] + args)
    if code is None:
        return result("BLOCKED", "TIMEOUT")
    if code:
        if not required and name == "docker" and "compose" in args and ("not a docker command" in err + out or "unknown command" in err + out):
            return result("NOT_RUN", "COMPOSE_PLUGIN_UNAVAILABLE", code)
        return classify(code, err + out)
    try:
        return result("PASS", "OBSERVED", code, **parse(out))
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return result("FAIL", "UNEXPECTED_OUTPUT_REDACTED", code)


def version(out):
    match = re.search(r"\b(\d+\.\d+(?:\.\d+)?(?:[-+]\d+)?)\b", out)
    if not match:
        raise ValueError("version")
    return {"version": match.group(1)}


def tailscale_status(out):
    obj = json.loads(out)
    state = obj.get("BackendState")
    if state not in ("Running", "Stopped", "Starting", "NeedsLogin", "NeedsMachineAuth", "NoState"):
        raise ValueError("state")
    # Never disclose Self/Peer IDs, IPs, DNS names or accounts.
    return {"backendState": state, "selfOnline": bool(obj.get("Self", {}).get("Online")),
            "magicDNSConfigured": bool(obj.get("MagicDNSSuffix"))}


def filesystem(path):
    try:
        target = Path(path).resolve(strict=True)
        fs = os.statvfs(target)
        kind = "unknown"
        if Path("/proc/mounts").exists():
            mounts = []
            for line in Path("/proc/mounts").read_text().splitlines():
                fields = line.split()
                if len(fields) >= 3:
                    mount = fields[1].replace("\\040", " ")
                    if str(target) == mount or str(target).startswith(mount.rstrip("/") + "/"):
                        mounts.append((len(mount), fields[2]))
            if mounts:
                kind = max(mounts)[1]
        network = kind in ("nfs", "nfs4", "cifs", "smbfs", "fuse.sshfs")
        return result("FAIL" if network else "PASS", "NETWORK_FS_UNSAFE_FOR_WAL" if network else "OBSERVED",
                      fsType=kind if re.fullmatch(r"[a-zA-Z0-9_.-]+", kind) else "redacted",
                      networkFilesystem=network, availableGiB=round(fs.f_bavail * fs.f_frsize / 2**30, 1),
                      currentUserWritable=os.access(target, os.W_OK), fsTypeVerified=kind != "unknown")
    except PermissionError:
        return result("BLOCKED", "PERMISSION_DENIED")
    except OSError:
        return result("BLOCKED", "FILESYSTEM_PATH_UNAVAILABLE")


def socket_permissions():
    try:
        s = os.stat("/var/run/docker.sock")
        return result("PASS" if os.access("/var/run/docker.sock", os.R_OK | os.W_OK) else "BLOCKED",
                      "OBSERVED" if os.access("/var/run/docker.sock", os.R_OK | os.W_OK) else "PERMISSION_DENIED",
                      isSocket=stat.S_ISSOCK(s.st_mode), mode=oct(stat.S_IMODE(s.st_mode)))
    except FileNotFoundError:
        return result("NOT_RUN", "LOCAL_SOCKET_ABSENT")
    except PermissionError:
        return result("BLOCKED", "PERMISSION_DENIED")


def ports(out):
    # Retain only port numbers, never local/remote addresses or process names.
    listening = {int(p) for p in re.findall(r"[:.](\d+)\s", out)}
    return {"observedPorts": {str(p): p in listening for p in (8080, 4177)}}


def collect(environment, sha, fs_path):
    kernel = platform.release()
    m = re.match(r"(\d+)\.(\d+)", kernel)
    supported = bool(m and tuple(map(int, m.groups())) >= (4, 18))
    cpu_model = "unavailable"
    try:
        match = re.search(r"^model name\s*:\s*(.+)$", Path("/proc/cpuinfo").read_text(), re.M)
        if match and re.fullmatch(r"[A-Za-z0-9().@ _+-]{1,100}", match.group(1)):
            cpu_model = match.group(1).strip()
    except OSError:
        pass
    checks = {
        "host": result("PASS", "OBSERVED", system=platform.system(), architecture=platform.machine(),
                       cpuCount=os.cpu_count(), cpuModel=cpu_model, kernel=kernel if re.fullmatch(r"[0-9A-Za-z.+_-]+", kernel) else "redacted"),
        "node24GlibcKernelBaseline": result("PASS" if supported else "FAIL", "KERNEL_AT_LEAST_4_18" if supported else "BELOW_4_18")
            if platform.system() == "Linux" else result("NOT_RUN", "NOT_LINUX"),
        "dockerClient": command("docker", ["--version"], version, True),
        "dockerServer": command("docker", ["version", "--format", "{{.Server.Version}}"], version, True),
        "dockerSocket": socket_permissions(),
        "composeV1": command("docker-compose", ["version", "--short"], version),
        "composeV2": command("docker", ["compose", "version", "--short"], version),
        "tailscaleVersion": command("tailscale", ["version"], version),
        "tailscaleState": command("tailscale", ["status", "--json"], tailscale_status),
        "filesystem": filesystem(fs_path),
    }
    try:
        dsm = Path("/etc/VERSION").read_text()
        values = dict(re.findall(r'^(majorversion|minorversion|microversion|buildnumber|smallfixnumber)="(\d+)"$', dsm, re.M))
        checks["dsm"] = result("PASS", "OBSERVED", components=values) if values else result("NOT_RUN", "NOT_DSM")
    except PermissionError:
        checks["dsm"] = result("BLOCKED", "PERMISSION_DENIED")
    except OSError:
        checks["dsm"] = result("NOT_RUN", "NOT_DSM")
    checks["ports"] = command("ss", ["-ltn"], ports) if locate("ss") else command("netstat", ["-lnt"], ports)
    status = "FAIL" if any(c["status"] == "FAIL" for c in checks.values()) else (
        "BLOCKED" if any(c["status"] == "BLOCKED" for c in checks.values()) else "PASS")
    return dict(schemaVersion=1, scriptVersion=VERSION, timestampUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                executionEnvironment=environment, repositorySha=sha, status=status, checks=checks,
                disclaimer="Inventory only; environment label is operator supplied; no SQLite/runtime acceptance implied.")


def main():
    parser = argparse.ArgumentParser(description="Read-only NAS inventory; no sudo, installs, files or containers created. Python >=3.8.")
    parser.add_argument("--json", action="store_true", help="emit redacted structured JSON")
    parser.add_argument("--environment", choices=("local", "ci", "nas"), default="local")
    parser.add_argument("--repository-sha", help="40 hex source SHA (required when executed over stdin)")
    parser.add_argument("--filesystem-path", default=None, help="read-only stat of path; path is never included in output")
    args = parser.parse_args()
    sha = args.repository_sha
    if sha is None:
        code, out, _ = run(["git", "rev-parse", "HEAD"])
        sha = out.strip() if code == 0 else "UNKNOWN"
    if sha != "UNKNOWN" and not re.fullmatch(r"[a-f0-9]{40}", sha):
        parser.error("repository SHA must be 40 lowercase hex characters")
    report = collect(args.environment, sha, args.filesystem_path or ("/volume2" if args.environment == "nas" else "."))
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("KLH PR-1A preflight {} / {} / {}".format(VERSION, args.environment, sha))
        for name, item in report["checks"].items():
            print("{}: {} ({})".format(name, item["status"], item["reason"]))
    return {"PASS": 0, "FAIL": 1, "BLOCKED": 2}[report["status"]]


if __name__ == "__main__":
    raise SystemExit(main())
