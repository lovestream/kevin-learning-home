#!/bin/sh
# Read-only. Python >=3.8; never installs dependencies or elevates privileges.
set -eu
exec python3 "$(dirname "$0")/nas_preflight.py" "$@"
