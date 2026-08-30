#!/bin/bash
set -euo pipefail

SERVER="root@webserver.skelpo.net"
REMOTE_DIR="/var/www/perryts.com"
SERVICE="perryts"

echo "==> Building site..."
npm run build:site

echo "==> Uploading server sources, helper, and static files..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR/native-entry"
scp server.ts "$SERVER:$REMOTE_DIR/server.ts"
scp native-entry/server.ts "$SERVER:$REMOTE_DIR/native-entry/server.ts"
scp subscribe-server.mjs "$SERVER:$REMOTE_DIR/subscribe-server.mjs"
rsync -a --delete out/ "$SERVER:$REMOTE_DIR/out/"

echo "==> Compiling server on remote..."
ssh "$SERVER" "cd $REMOTE_DIR && perry compile native-entry/server.ts -o server && rm -f server.o _perry_stubs.*"

echo "==> Restarting services..."
ssh "$SERVER" "systemctl restart $SERVICE perryts-subscribe"

echo "==> Verifying..."
sleep 2
STATUS=$(curl -sL -o /dev/null -w "%{http_code}" https://perryts.com/)
if [ "$STATUS" = "200" ]; then
  echo "==> Live at https://perryts.com/ (HTTP $STATUS)"
else
  echo "==> WARNING: https://perryts.com/ returned HTTP $STATUS"
  ssh "$SERVER" "systemctl status $SERVICE --no-pager -l"
fi
