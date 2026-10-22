"""Generated synthetic input only. Never prints credentials or terminal capture."""
import json
import os
import pty
import secrets
import select
import subprocess
import sys
import time

root, mode = sys.argv[1:]
login = "synthetic-" + secrets.token_hex(6)
password = secrets.token_urlsafe(24)
master, slave = pty.openpty()
process = subprocess.Popen(
    ["node", "scripts/auth-admin.ts", "bootstrap-parent", "--root", root, "--synthetic"],
    stdin=slave, stdout=slave, stderr=slave, close_fds=True,
)
os.close(slave)
capture = b""
prompts = [(b"Synthetic login: ", login), (b"Synthetic label: ", "Synthetic parent"),
           (b"New passphrase: ", password), (b"Confirm passphrase: ", password)]
index = 0
deadline = time.monotonic() + 15
try:
    while time.monotonic() < deadline:
        ready, _, _ = select.select([master], [], [], .1)
        if ready:
            try:
                part = os.read(master, 8192)
            except OSError:
                break
            if not part:
                break
            capture += part
            if index < len(prompts) and prompts[index][0] in capture:
                if mode == "interrupt" and index == 2:
                    os.write(master, b"\x03")
                    index = len(prompts)
                else:
                    os.write(master, prompts[index][1].encode() + b"\r")
                    index += 1
        if process.poll() is not None and not ready:
            break
    code = process.wait(timeout=2)
    assert password.encode() not in capture and login.encode() not in capture
    if mode == "interrupt":
        assert code == 1 and b"ADMIN_CANCELLED" in capture
    else:
        assert code == 0 and b'"status":"ok"' in capture
    print(json.dumps({"status": "PASS", "exitCode": code, "inputNotEchoed": True,
                      "mode": mode, "promptsConsumed": index}))
finally:
    if process.poll() is None:
        process.kill()
        process.wait()
    os.close(master)
