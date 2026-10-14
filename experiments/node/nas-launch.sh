#!/bin/sh
# Run as the ordinary NAS user in an interactive SSH terminal. Only the
# explicitly listed Docker operations below use sudo; never runs a root shell.
set -eu
test_root=$1
case "$test_root" in */klh-bench-20261014-7ef8fd3a) ;; *) echo 'unexpected owned root'; exit 2;; esac
test -f "$test_root/owned-marker.json"
test -d "$test_root/code/experiments/shared"
test -d "$test_root/data"
docker_bin=/var/packages/Docker/target/usr/bin/docker
image_tag=klh-bench-node-nas:20261014-7ef8fd3a
container_name=klh-bench-node-nas-20261014-7ef8fd3a
base_image=node:24.15.0-bookworm-slim
uid=$(id -u)
gid=$(id -g)
test "$uid" -ne 0
umask 077
mkdir -p "$test_root/control"
sudo "$docker_bin" version --format 'client={{.Client.Version}} server={{.Server.Version}}' > "$test_root/control/docker-version.txt"
if sudo "$docker_bin" image inspect "$image_tag" >/dev/null 2>&1; then echo 'dedicated image already exists; stop'; exit 2; fi
if sudo "$docker_bin" container inspect "$container_name" >/dev/null 2>&1; then echo 'dedicated container already exists; stop'; exit 2; fi
had_base=no
if sudo "$docker_bin" image inspect "$base_image" >/dev/null 2>&1; then had_base=yes; else sudo "$docker_bin" pull "$base_image"; fi
sudo "$docker_bin" tag "$base_image" "$image_tag"
# Remove only the common tag newly introduced by this run. Keep any preexisting
# base tag and all other images untouched. The dedicated tag retains its image.
if [ "$had_base" = no ]; then sudo "$docker_bin" image rm "$base_image"; fi
sudo "$docker_bin" image inspect "$image_tag" --format 'id={{.Id}} architecture={{.Architecture}} os={{.Os}}' > "$test_root/control/image.txt"
cleanup_docker(){
  sudo "$docker_bin" rm -f "$container_name" >/dev/null 2>&1 || true
  sudo "$docker_bin" image rm "$image_tag" >/dev/null 2>&1 || true
}
trap cleanup_docker EXIT HUP INT TERM
sudo "$docker_bin" run -d --name "$container_name" --user "$uid:$gid" \
  --memory 512m --cpus 1 --pids-limit 128 --cap-drop ALL --security-opt no-new-privileges \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  -p 127.0.0.1:37931:37901 -p 127.0.0.1:37932:37902 \
  -v "$test_root/code:/app:ro" -v "$test_root/data:/data:rw" -w /app \
  -e TZ=Asia/Shanghai -e KLH_BENCH_LISTEN_HOST=0.0.0.0 \
  -e KLH_BENCH_MEDIA_LISTEN_HOST=0.0.0.0 \
  "$image_tag" node experiments/node/nas-suite.mjs > "$test_root/control/container-id.txt"
sudo "$docker_bin" inspect "$container_name" --format 'memory={{.HostConfig.Memory}} nanoCpus={{.HostConfig.NanoCpus}} user={{.Config.User}} readonly={{.HostConfig.ReadonlyRootfs}} privileged={{.HostConfig.Privileged}}' > "$test_root/control/container-controls.txt"
sudo "$docker_bin" wait "$container_name" > "$test_root/control/container-exit.txt"
sudo "$docker_bin" logs "$container_name" > "$test_root/control/container.log" 2>&1
sudo "$docker_bin" inspect "$container_name" --format 'oomKilled={{.State.OOMKilled}} exitCode={{.State.ExitCode}}' > "$test_root/control/container-end.txt"
echo 'Test exited; named container/image cleanup only. Evidence remains for verified export.'
