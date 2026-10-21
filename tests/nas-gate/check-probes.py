"""Parse Python and embedded Node programs without executing a NAS operation."""
import ast
from pathlib import Path
import subprocess

path = Path("tests/nas-gate/controller.py")
source = path.read_text()
compile(source, str(path), "exec")
names = {"RUNTIME", "NATIVE", "SEED", "SNAPSHOT", "HEALTH", "KILL"}
checked = set()
for statement in ast.parse(source).body:
    if not isinstance(statement, ast.Assign):
        continue
    target = statement.targets[0]
    if not isinstance(target, ast.Name) or target.id not in names:
        continue
    result = subprocess.run(
        ["node", "--check", "--input-type=module"],
        input=ast.literal_eval(statement.value),
        text=True,
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(target.id + ": " + result.stderr[:2000])
    checked.add(target.id)
assert checked == names
print("NAS controller and 6 embedded Node probes: syntax PASS; no NAS connection")
