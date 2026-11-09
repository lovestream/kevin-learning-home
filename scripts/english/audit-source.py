#!/usr/bin/env python3
"""Read Git blobs at a frozen commit only. Never walk live/private files."""
import argparse
import collections
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess

SOURCE_SHA = "d0b42a8872a7e87433b96770519203630223b6f2"
ROOTS = ("assets/", "data/", "licenses/")
TOP = {"index.html", "README.md", "SOURCES.md"}

def allowed(path):
    p = PurePosixPath(path)
    return (not p.is_absolute() and ".." not in p.parts and not path.endswith((".wordquest.json", ".wordpack.json"))
            and (path in TOP or path.startswith(ROOTS)))

def policy(path, attribution=None, digest=None):
    if path == "licenses/ECDICT-LICENSE.txt":
        return "license-text-only"
    if path.startswith("assets/movers-phrase-images/"):
        if attribution and all(attribution.get(k) for k in ("creator", "license", "licenseUrl", "sourceUrl", "webpSha256")) and attribution["webpSha256"] == digest:
            return "item-attribution-and-hash-present-review-before-publish"
        return "blocked-missing-or-mismatched-attribution"
    if path.startswith(("assets/core2000-", "data/core2000", "assets/core2000.", "assets/movers-images/", "assets/movers-2025.", "data/movers-word-list", "assets/cambridge-", "data/cambridge-")):
        return "source-rights-review-required"
    return "implementation-or-metadata-review-required"

def audit(repo):
    def git(*args):
        return subprocess.check_output(["git", "-C", str(repo), *args])
    if git("rev-parse", SOURCE_SHA + "^{commit}").decode().strip() != SOURCE_SHA:
        raise ValueError("FROZEN_SOURCE_REQUIRED")
    tree = git("ls-tree", "-rz", SOURCE_SHA).split(b"\0")
    entries = []
    for row in tree:
        if not row:
            continue
        meta, raw_path = row.split(b"\t", 1)
        mode, kind, oid = meta.decode().split()
        path = raw_path.decode("utf-8")
        if allowed(path):
            if kind != "blob" or mode not in ("100644", "100755"):
                raise ValueError("SOURCE_SYMLINK_OR_SUBMODULE_REJECTED")
            entries.append((path, oid))
    # Batch avoids thousands of subprocesses and never reads untracked word packs.
    blobs = {}
    with subprocess.Popen(["git", "-C", str(repo), "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE) as child:
        for path, oid in entries:
            child.stdin.write((oid + "\n").encode());child.stdin.flush()
            header = child.stdout.readline().decode().split()
            if header[:2] != [oid, "blob"]:
                raise ValueError("SOURCE_BLOB_REQUIRED")
            size = int(header[2])
            if size > 32 * 1024 * 1024:
                raise ValueError("SOURCE_BLOB_TOO_LARGE")
            content = child.stdout.read(size)
            if len(content) != size or child.stdout.read(1) != b"\n":
                raise ValueError("SOURCE_BLOB_TRUNCATED")
            blobs[path] = (hashlib.sha256(content).hexdigest(), size, content if path.endswith(".json") else None)
        child.stdin.close()
        if child.wait(timeout=10):
            raise ValueError("SOURCE_GIT_FAILED")
    attribution = json.loads(blobs["data/movers-phrase-image-attributions.json"][2])["items"]
    by_image = {item["image"]: item for item in attribution}
    rows = [{"path": path, "gitBlob": oid, "sha256": blobs[path][0], "bytes": blobs[path][1],
             "publication": policy(path, by_image.get(path), blobs[path][0])} for path, oid in entries]
    core = json.loads(blobs["data/core2000.json"][2]); movers = json.loads(blobs["data/movers-word-list-2025.json"][2]);cambridge = json.loads(blobs["data/cambridge-official-2025.json"][2])
    return {"format":"klh-english-source-inventory-v1", "sourceRepository":"lovestream/word-request", "sourceSha":SOURCE_SHA,
            "trackedOnly":True,"privateFilesRead":False,"assetsCopied":False,"publicationApproved":False,
            "counts":{"files":len(rows),"bytes":sum(r["bytes"] for r in rows),"coreWords":len(core["words"]),"coreBooks":len(core["books"]),"coreUnits":len({(b["book"],b["unit"]) for b in core["batches"]}),"coreSets":len(core["batches"]),"moversWords":len(movers["words"]),"moversPhrases":len(movers["phraseCards"]),"cambridgeSourceEntries":{k:len(v) for k,v in cambridge["entries"].items()},"localRecordedAudio":sum(r["path"].endswith((".mp3",".wav",".ogg",".m4a")) for r in rows)},
            "publicationCounts":dict(collections.Counter(r["publication"] for r in rows)),"files":rows}

if __name__ == "__main__":
    parser=argparse.ArgumentParser();parser.add_argument("source_repo", type=Path);parser.add_argument("output", type=Path);args=parser.parse_args()
    result=audit(args.source_repo)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"sourceSha":result["sourceSha"],"counts":result["counts"],"publicationCounts":result["publicationCounts"],"privateFilesRead":False,"assetsCopied":False},ensure_ascii=False))
