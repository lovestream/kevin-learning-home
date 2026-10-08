#!/usr/bin/env python3
"""Opt-in synthetic container experiment. Default: print plan, no writes/daemon calls."""
import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

MARKER = "KLH-PR-1A synthetic-only v1\n"
ROOT = Path(__file__).resolve().parent.parent


def require(condition, code):
    if not condition:
        raise RuntimeError(code)


def validate_parent(parent):
    require(parent.is_absolute(), "ABSOLUTE_PARENT_REQUIRED")
    cursor = Path(parent.anchor)
    for part in parent.parts[1:]:
        cursor = cursor / part
        require(not cursor.is_symlink(), "SYMLINK_REFUSED")
    require(parent.is_dir(), "PARENT_MUST_EXIST")
    require(os.getuid() != 0, "NON_ROOT_HOST_USER_REQUIRED")
    require(os.getgid() != 0, "NON_ROOT_HOST_GROUP_REQUIRED")
    require(os.access(parent, os.W_OK | os.X_OK), "PARENT_NOT_WRITABLE")
    if Path("/proc/mounts").exists():
        mounts = []
        for line in Path("/proc/mounts").read_text().splitlines():
            fields = line.split()
            if len(fields) >= 3:
                mount = fields[1].replace("\\040", " ")
                if str(parent) == mount or str(parent).startswith(mount.rstrip("/") + "/"):
                    mounts.append((len(mount), fields[2]))
        require(bool(mounts), "FILESYSTEM_TYPE_UNKNOWN")
        require(max(mounts)[1] in ("ext4", "btrfs", "xfs", "tmpfs", "overlay", "ext3"), "UNAPPROVED_FILESYSTEM")
    return parent


def container_absent(docker, name, audit=None, stage="container_inspect"):
    p = subprocess.run([docker, "inspect", "--format", "{{json .Config.Labels}}", name], capture_output=True, text=True, timeout=10)
    if audit is not None:
        audit.append(dict(stage=stage, exitCode=p.returncode))
    if p.returncode == 0:
        return False
    require("no such object" in p.stderr.lower() or "no such container" in p.stderr.lower(), "CONTAINER_INSPECT_BLOCKED")
    return True


def verify_source(sha):
    p = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "HEAD"], capture_output=True, text=True, timeout=10)
    require(p.returncode == 0 and p.stdout.strip() == sha, "CHECKOUT_SHA_MISMATCH")
    p = subprocess.run(["git", "-C", str(ROOT), "status", "--porcelain", "--untracked-files=normal"], capture_output=True, text=True, timeout=10)
    require(p.returncode == 0 and not p.stdout.strip(), "CLEAN_CHECKOUT_REQUIRED")


def create_workspace(parent, name):
    validate_parent(parent)
    require(re.fullmatch(r"klh-pr1a-[a-f0-9]{12}", name), "INVALID_PROJECT_NAME")
    workspace = parent / name
    workspace.mkdir(mode=0o700)  # Never exist_ok; refuse all pre-existing assets.
    data = workspace / "data"
    data.mkdir(mode=0o700)
    with (data / ".klh-pr1a-owned").open("x") as f:
        f.write(MARKER)
    os.chmod(data / ".klh-pr1a-owned", 0o600)
    return workspace, data


def parse_probe_output(output):
    start = output.find('{"schemaVersion"')
    if start < 0:
        start = output.find('{\n  "schemaVersion"')
    require(start >= 0, "PROBE_JSON_MISSING")
    obj, _ = json.JSONDecoder().raw_decode(output[start:])
    require(obj.get("schemaVersion") == 1, "INVALID_PROBE_SCHEMA")
    # Drop every unknown field before public evidence is written.
    allowed_checks = {"runtime", "directorySafety", "databaseSyncImport", "sqliteVersion", "pragmas", "transactionCommit",
                      "transactionRollback", "eventIdIdempotency", "differentPayloadConflict", "foreignKeyEnforced",
                      "consistentBackup", "emptyDirectoryRestore", "separateProcessPersistence", "integrityCheck",
                      "disconnectReconnect", "failure"}
    require(set(obj.get("checks", {})) <= allowed_checks, "UNKNOWN_PROBE_CHECK")
    return obj  # Only trusted repository probe can emit this schema; never publish raw compose output.


def execute(environment, sha, parent, nas_approved=False):
    require(environment != "nas" or nas_approved, "NAS_WRITE_APPROVAL_REQUIRED")
    require(re.fullmatch(r"[a-f0-9]{40}", sha), "EXACT_REPOSITORY_SHA_REQUIRED")
    verify_source(sha)
    validate_parent(parent)
    require(not os.environ.get("DOCKER_HOST") and os.environ.get("DOCKER_CONTEXT", "default") == "default", "LOCAL_DOCKER_ONLY")
    docker = shutil.which("docker")
    require(docker is not None, "DOCKER_NOT_FOUND")
    context = subprocess.run([docker, "context", "show"], capture_output=True, text=True, timeout=10)
    require(context.returncode == 0 and context.stdout.strip() == "default", "LOCAL_DEFAULT_CONTEXT_REQUIRED")
    endpoint = subprocess.run([docker, "context", "inspect", "default", "--format", "{{.Endpoints.docker.Host}}"], capture_output=True, text=True, timeout=10)
    require(endpoint.returncode == 0 and endpoint.stdout.strip().startswith("unix://"), "LOCAL_UNIX_DOCKER_REQUIRED")
    v1 = shutil.which("docker-compose")
    compose = [v1] if v1 else [docker, "compose"]
    name = "klh-pr1a-" + uuid.uuid4().hex[:12]
    workspace, data = create_workspace(parent, name)
    report = dict(schemaVersion=1, runnerVersion="1.0.0", timestampUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  repositorySha=sha, executionEnvironment=environment, projectName=name, status="FAIL",
                  commands=[dict(stage="docker_context_show", exitCode=context.returncode),
                            dict(stage="docker_context_inspect", exitCode=endpoint.returncode)],
                  sourceValidation={"status": "PASS", "headSha": sha, "cleanCheckout": True},
                  probes={}, cleanup={"status": "NOT_RUN", "reason": "NO_LIVE_CONTAINER_EXPECTED"})
    env = dict(os.environ, KLH_PROBE_DATA=str(data), KLH_PROBE_UID=str(os.getuid()), KLH_PROBE_GID=str(os.getgid()),
               KLH_EXECUTION_ENVIRONMENT=environment, KLH_PROBE_PROJECT=name, KLH_REPOSITORY_SHA=sha)
    prefix = compose + ["-f", str(ROOT / "infra/probes/node-sqlite/compose.yml"), "-p", name]
    active = None
    completed = 0
    built = False
    def call(stage, argv, timeout, check=True):
        try:
            p = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, env=env)
            report["commands"].append(dict(stage=stage, exitCode=p.returncode))
            if check:
                require(p.returncode == 0, stage.upper() + "_FAILED_REDACTED")
            return p.stdout
        except subprocess.TimeoutExpired:
            report["commands"].append(dict(stage=stage, exitCode=None, reason="TIMEOUT"))
            raise RuntimeError("TIMEOUT")
    try:
        call("compose_config", prefix + ["config", "--quiet"], 15)
        call("build", prefix + ["build", "probe"], 240)
        built = True
        image = json.loads(call("probe_image_inspect", [docker, "image", "inspect", "klh-pr1a-probe:" + name, "--format", "{{json .}}"], 10))
        revision = image.get("Config", {}).get("Labels", {}).get("org.opencontainers.image.revision")
        require(image.get("Os") == "linux" and image.get("Architecture") == "amd64" and revision == sha, "PROBE_IMAGE_METADATA_MISMATCH")
        require(re.fullmatch(r"sha256:[a-f0-9]{64}", image.get("Id", "")), "PROBE_IMAGE_ID_INVALID")
        report["probeImage"] = dict(id=image["Id"], os=image["Os"], architecture=image["Architecture"], revision=revision)
        for mode in ("exercise", "verify"):
            active = name + "-" + mode
            out = call(mode, prefix + ["run", "--rm", "--no-deps", "-T", "--name", active, "probe", mode,
                                      "--data-dir", "/data", "--environment", environment, "--repository-sha", sha], 120, check=False)
            probe = parse_probe_output(out)
            report["probes"][mode] = probe
            require(probe["status"] == "PASS" and probe["repositorySha"] == sha, "PROBE_FAILED")
            require(report["commands"][-1]["exitCode"] == 0, "PROBE_EXIT_CODE_FAILED")
            require(probe["runtime"]["uid"] == os.getuid() and probe["runtime"]["uid"] != 0, "CONTAINER_UID_MISMATCH")
            # A subsequent inspect must find no container; no stopped persistent container either.
            require(container_absent(docker, active, report["commands"], mode + "_container_absence"), "CONTAINER_NOT_REMOVED")
            completed += 1
            active = None
        report["containerRecreation"] = {"status": "PASS", "reason": "TWO_DISTINCT_RUN_RM_CONTAINERS_SAME_BIND_DIRECTORY"}
        report["status"] = "PASS"
    except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired) as e:
        report["failure"] = str(e) if isinstance(e, RuntimeError) else "UNEXPECTED_ERROR_REDACTED"
    finally:
        if active:
            # Only touch the exact generated name with matching ownership labels.
            try:
                p = subprocess.run([docker, "inspect", "--format", "{{json .Config.Labels}}", active], capture_output=True, text=True, timeout=10)
                report["commands"].append(dict(stage="cleanup_container_inspect", exitCode=p.returncode))
                if p.returncode == 0:
                    labels = json.loads(p.stdout)
                    require(labels.get("com.docker.compose.project") == name and labels.get("com.docker.compose.service") == "probe", "CLEANUP_LABEL_MISMATCH")
                    call("cleanup_stop", [docker, "stop", "--time", "10", active], 20)
                    call("cleanup_remove", [docker, "rm", active], 15)
                    report["cleanup"] = {"status": "PASS", "reason": "EXACT_OWNED_CONTAINER_REMOVED"}
                elif "no such object" in p.stderr.lower() or "no such container" in p.stderr.lower():
                    report["cleanup"] = {"status": "PASS", "reason": "EXACT_CONTAINER_ALREADY_ABSENT"}
                else:
                    raise RuntimeError("CONTAINER_INSPECT_BLOCKED")
            except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired):
                report["cleanup"] = {"status": "BLOCKED", "reason": "MANUAL_OWNED_CONTAINER_CHECK_REQUIRED"}
                report["status"] = "FAIL"
        else:
            report["cleanup"] = {"status": "PASS", "reason": "RUN_RM_REMOVED_BOTH_OWNED_CONTAINERS" if completed == 2 else "NO_LIVE_CONTAINER_LAUNCHED"}
        report["retainedResources"] = ["dedicated synthetic directory"] + (["project probe image", "pinned base image cache"] if built else [])
        if not built:
            report["possibleResources"] = ["partial image/build cache; not removed"]
        # Private local path is deliberately absent. No recursive deletion or image deletion.
        (workspace / "evidence.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--run", action="store_true", help="opt in to directory/image/container writes")
    p.add_argument("--approved-nas-write", action="store_true", help="only after separate explicit user authorization")
    p.add_argument("--environment", choices=("local", "ci", "nas"), default="local")
    p.add_argument("--repository-sha")
    p.add_argument("--parent", type=Path, help="existing writable local filesystem parent, never a real learning-data directory")
    a = p.parse_args()
    if not a.run:
        print(json.dumps(dict(status="NOT_RUN", mode="plan", writes=False, environment=a.environment,
                             plan=["create exclusive klh-pr1a-<random>/data (0700), synthetic marker",
                                   "Compose config; build pinned Node24 amd64 image",
                                   "two bounded non-root run --rm containers, network none, no ports",
                                   "retain synthetic evidence/data and image cache; no existing assets touched"],
                             limits={"memoryMiB": 256, "cpus": 0.5, "pids": 64, "probeTimeoutSeconds": 120},
                             nasConsentRequired=True), indent=2))
        return 0
    try:
        require(a.parent is not None, "PARENT_REQUIRED")
        report = execute(a.environment, a.repository_sha or "", a.parent, a.approved_nas_write)
        print(json.dumps(report, indent=2))
        return 0 if report["status"] == "PASS" else 1
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as e:
        print(json.dumps(dict(status="BLOCKED", reason=str(e) if isinstance(e, RuntimeError) else "HOST_CHECK_FAILED_REDACTED")))
        return 2


if __name__ == "__main__":
    sys.exit(main())
