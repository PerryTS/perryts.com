#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

SERVER="root@webserver.skelpo.net"
REMOTE_DIR="/var/www/beta.perryts.com"
RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"

npm run build:site
npm run check:blog
ssh "$SERVER" "mkdir -p '$REMOTE_DIR/releases/$RELEASE/out'"
rsync -a --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r out/ "$SERVER:$REMOTE_DIR/releases/$RELEASE/out/"
scp subscribe-server.mjs "$SERVER:$REMOTE_DIR/releases/$RELEASE/subscribe-server.mjs"

# Keep earlier releases so a failed deployment can be rolled back atomically.
ssh "$SERVER" bash -s -- "$REMOTE_DIR" "$RELEASE" <<'REMOTE'
set -euo pipefail
base="$1"
release="$2"
previous=$(readlink "$base/current" || true)
ln -s "releases/$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
rollback() {
    if [ -n "$previous" ]; then
        ln -s "$previous" "$base/current.rollback"
        mv -Tf "$base/current.rollback" "$base/current"
        systemctl restart perryts-beta-subscribe
    fi
}
trap rollback ERR
systemctl restart perryts-beta-subscribe
curl --fail --silent --show-error --retry 5 --retry-connrefused --retry-delay 1 \
    http://127.0.0.1:3852/api/health
curl --fail --silent --show-error --resolve beta.perryts.com:443:127.0.0.1 \
    https://beta.perryts.com/en/ -o /dev/null
REMOTE

curl --fail --silent --show-error https://beta.perryts.com/en/ -o /dev/null
echo "Live at https://beta.perryts.com/ (release $RELEASE)"
