#!/bin/sh
# Separate user approval required. Not part of app startup or deployment.
# Only the historical nonce-tagged resources; no prune, privilege/group changes.
set -eu
root=$1
case "$root" in */klh-bench-20261014-7ef8fd3a) ;; *) exit 2;; esac
python3 - "$root" <<'PY'
import json,sys,os
r=sys.argv[1]; assert os.path.realpath(r)==r and not os.path.islink(r)
m=json.load(open(r+'/owned-marker.json'))
assert m['task']=='KLH-BENCH-02' and m['scope']=='synthetic-only'
assert m['directoryIdentifier']=='20261014-7ef8fd3a'
assert m['codeSha']=='c96e38ec0c30f282a16d91bb09c598d74314e6a7'
PY
d=/var/packages/Docker/target/usr/bin/docker
name=klh-bench-node-nas-20261014-7ef8fd3a
tag=klh-bench-node-nas:20261014-7ef8fd3a
expected=$(tr -d '\r\n' < "$root/control/container-id.txt")
case "$expected" in ''|*[!a-f0-9]*) exit 2;; esac
observed=$(sudo "$d" ps -a --filter "name=^${name}$" --no-trunc --format '{{.ID}}')
if [ -n "$observed" ]; then
  test "$observed" = "$expected"
  sudo "$d" inspect "$observed" --format 'running={{.State.Running}} exitCode={{.State.ExitCode}} oomKilled={{.State.OOMKilled}}' > "$root/control/cleanup-container-state.txt"
  grep -q '^running=false ' "$root/control/cleanup-container-state.txt"
  sudo "$d" rm "$observed"
fi
image=$(sudo "$d" image ls --no-trunc --filter "reference=$tag" --format '{{.ID}}')
if [ -n "$image" ]; then
  test "$image" = 'sha256:3880cf501a3b54bacc5e53dc327478ba723084863fa252cceb43f75aadcab12b'
  sudo "$d" image rm "$tag"
fi
remaining=$(sudo "$d" ps -a --filter "name=^${name}$" --format '{{.ID}}')
remaining_image=$(sudo "$d" image ls --filter "reference=$tag" --format '{{.ID}}')
test -z "$remaining"; test -z "$remaining_image"
python3 - "$root" <<'PY'
import json,sys,datetime,os
r=sys.argv[1]; state=r+'/control/cleanup-container-state.txt'
json.dump({'scope':'owned historical BENCH-02 only','verifiedContainerAbsent':True,'verifiedTagAbsent':True,'containerState':open(state).read().strip() if os.path.exists(state) else 'ALREADY_ABSENT','timestampUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()},open(r+'/control/cleanup-receipt.json','w'))
PY
echo KLH_OWNED_DOCKER_CLEANUP_COMPLETE
