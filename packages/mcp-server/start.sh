#!/bin/bash
# Load env từ web app (dùng chung biến)
set -a
source "$(dirname "$0")/../../apps/web/.env.local"
source "$(dirname "$0")/../../packages/db/.env"
set +a

exec node "$(dirname "$0")/dist/index.js"
