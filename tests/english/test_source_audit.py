import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import hashlib

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("english_audit",ROOT/"scripts/english/audit-source.py")
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

class SourceAuditTests(unittest.TestCase):
    def test_no_private_record_wordpack_or_path_traversal(self):
        for p in ["../assets/app.js","/assets/app.js","assets/private.wordquest.json","assets/private.wordpack.json",".env","data/../../record.json"]:
            self.assertFalse(audit.allowed(p),p)
        self.assertTrue(audit.allowed("assets/app.js"))
        self.assertTrue(audit.allowed("data/core2000.json"))

    def test_attribution_cannot_authorize_publication_or_hide_hash_mismatch(self):
        item={k:"present" for k in ["creator","license","licenseUrl","sourceUrl","webpSha256"]}
        p="assets/movers-phrase-images/test.webp"
        self.assertEqual(audit.policy(p,item,"wrong"),"blocked-missing-or-mismatched-attribution")
        self.assertEqual(audit.policy(p,item,"present"),"item-attribution-and-hash-present-review-before-publish")
        self.assertEqual(audit.policy("assets/core2000-images/x.webp"),"source-rights-review-required")

    def test_frozen_git_blobs_ignore_working_changes_and_untracked_private_pack(self):
        with tempfile.TemporaryDirectory(prefix="klh-english-synthetic-") as d:
            repo=Path(d)
            def git(*args):return subprocess.check_output(["git","-C",str(repo),*args],stderr=subprocess.DEVNULL)
            git("init","--quiet")
            data={"data/core2000.json":{"words":[{}],"books":[{}],"batches":[{"book":1,"unit":1}]},"data/movers-word-list-2025.json":{"words":[],"phraseCards":[]},"data/cambridge-official-2025.json":{"entries":{"ket":[{}],"pet":[]}},"data/movers-phrase-image-attributions.json":{"items":[]}}
            for path,value in data.items():
                p=repo/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value))
            (repo/"assets").mkdir();(repo/"assets/app.js").write_text("trusted-source")
            (repo/"assets/private.wordquest.json").write_text("DO NOT READ THIS EVEN IF TRACKED")
            git("add",".");git("-c","user.name=Synthetic","-c","user.email=synthetic@example.invalid","commit","--quiet","-m","synthetic")
            sha=git("rev-parse","HEAD").decode().strip();old=audit.SOURCE_SHA
            try:
                audit.SOURCE_SHA=sha
                (repo/"assets/app.js").write_text("working change must be ignored")
                (repo/"Private.wordpack.json").write_text("PRIVATE UNTRACKED WORDPACK")
                result=audit.audit(repo)
            finally:audit.SOURCE_SHA=old
            rows={x["path"]:x for x in result["files"]}
            self.assertEqual(rows["assets/app.js"]["sha256"],hashlib.sha256(b"trusted-source").hexdigest())
            self.assertNotIn("assets/private.wordquest.json",rows)
            self.assertFalse(result["privateFilesRead"]);self.assertFalse(result["publicationApproved"])
            self.assertEqual(result["counts"]["coreWords"],1)

    def test_checked_in_report_is_pinned_complete_and_not_a_release_claim(self):
        report=json.loads((ROOT/"docs/english/source-inventory.json").read_text())
        self.assertEqual(report["sourceSha"],audit.SOURCE_SHA)
        rows=report["files"]
        self.assertEqual(report["counts"]["files"],len(rows));self.assertEqual(report["counts"]["bytes"],sum(r["bytes"] for r in rows))
        self.assertEqual(len(rows),len({r["path"] for r in rows}))
        self.assertTrue(all(audit.allowed(r["path"]) for r in rows))
        self.assertEqual(report["counts"]["localRecordedAudio"],0)
        self.assertFalse(report["publicationApproved"]);self.assertFalse(report["assetsCopied"])
        self.assertEqual(sum(report["publicationCounts"].values()),len(rows))

if __name__=="__main__":unittest.main()
