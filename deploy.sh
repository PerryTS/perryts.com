#!/bin/bash
#
# perry-landing-skelpo deploy → beta.perryts.com.
#
# Same shape as ~/projects/gscmaster.com/api/deploy.sh:
#   - Linux worker (84.32.98.120) has Perry; we cross-compile there.
#   - This Mac doesn't have a Linux Perry build, so we relay the binary
#     from worker → Mac → webserver.
#   - webserver.skelpo.net runs pm2 + nginx + MySQL.
#
# Run from this directory:  ./deploy.sh
#
# Skip steps:
#   --skip-compile   reuse the binary already on the webserver
#   --skip-css       don't rebuild Tailwind CSS
#   --node-fallback  ship src + npm install on the webserver, run via tsx
#                    (use when Perry compile blocks; sets up a working
#                    beta while the compile blocker is fixed upstream)

set -euo pipefail

WORKER=root@84.32.98.120
WEB=root@webserver.skelpo.net
APP_DIR=/opt/beta-perryts
WORKER_BUILD=/tmp/beta-perryts-build
SRC_ROOT="$(cd "$(dirname "$0")" && pwd)"

SKIP_COMPILE=0
SKIP_CSS=0
NODE_FALLBACK=0
for a in "$@"; do
  case "$a" in
    --skip-compile)  SKIP_COMPILE=1 ;;
    --skip-css)      SKIP_CSS=1 ;;
    --node-fallback) NODE_FALLBACK=1 ;;
    *) echo "unknown flag: $a"; exit 2 ;;
  esac
done

# ── 1. Build the Tailwind CSS on the Mac (fast, no need on worker) ──
if [ "$SKIP_CSS" = "0" ]; then
  echo "==> 1. Build Tailwind CSS"
  cd "$SRC_ROOT" && npm run build:css >/dev/null
  echo "    public/styles.css → $(wc -c <public/styles.css | tr -d ' ') bytes"
fi

# ── 2. Rsync sources to worker ──────────────────────────────────────
if [ "$SKIP_COMPILE" = "0" ] && [ "$NODE_FALLBACK" = "0" ]; then
  echo "==> 2. Rsync src → worker ($WORKER:$WORKER_BUILD)"
  ssh "$WORKER" "mkdir -p $WORKER_BUILD"
  rsync -az --delete \
    --exclude node_modules --exclude dist --exclude '*.o' \
    --exclude '__perry_js_bundle.js' --exclude '.perry-cache' \
    --exclude 'public/styles.css' \
    "$SRC_ROOT/src/" "$WORKER:$WORKER_BUILD/src/"
  # The compile pulls in deps from node_modules, so the worker installs.
  scp -q "$SRC_ROOT/package.json" "$SRC_ROOT/package-lock.json" \
    "$SRC_ROOT/tsconfig.json" "$SRC_ROOT/perry.config.json" \
    "$WORKER:$WORKER_BUILD/"

  # ── 3. npm ci on worker (needed for compilePackages) ─────────────
  echo "==> 3. Worker: npm ci"
  ssh "$WORKER" "cd $WORKER_BUILD && rm -rf node_modules && npm ci --omit=dev --no-audit --no-fund 2>&1 | tail -5"

  # ── 4. Perry compile ────────────────────────────────────────────
  echo "==> 4. Worker: perry compile"
  ssh "$WORKER" "cd $WORKER_BUILD \
    && mkdir -p dist \
    && /opt/perry-src/target/release/perry --version \
    && /opt/perry-src/target/release/perry compile src/server.tsx -o dist/perry-landing --enable-js-runtime 2>&1 | tail -10"

  # ── 5. Pull binary back to Mac ──────────────────────────────────
  echo "==> 5. Pull binary back"
  TMP=$(mktemp -d -t beta-deploy.XXXX)
  trap 'rm -rf "$TMP"' EXIT
  scp -q "$WORKER:$WORKER_BUILD/dist/perry-landing" "$TMP/perry-landing"
  echo "    binary: $(stat -f '%z' "$TMP/perry-landing") bytes"

  # ── 6. Ship binary + public assets to webserver ─────────────────
  echo "==> 6. Ship binary + public/ → $WEB:$APP_DIR"
  ssh "$WEB" "mkdir -p $APP_DIR/public"
  scp -q "$TMP/perry-landing" "$WEB:$APP_DIR/perry-landing.new"
  rsync -az --delete "$SRC_ROOT/public/" "$WEB:$APP_DIR/public/"
fi

# ── Node-fallback path: don't compile, ship src + tsx ───────────────
if [ "$NODE_FALLBACK" = "1" ]; then
  echo "==> Node fallback: rsync src + run via tsx on webserver"
  ssh "$WEB" "mkdir -p $APP_DIR/src $APP_DIR/public"
  rsync -az --delete \
    --exclude node_modules --exclude dist --exclude '*.o' \
    --exclude '__perry_js_bundle.js' --exclude '.perry-cache' \
    "$SRC_ROOT/src/" "$WEB:$APP_DIR/src/"
  rsync -az --delete "$SRC_ROOT/public/" "$WEB:$APP_DIR/public/"
  scp -q "$SRC_ROOT/package.json" "$SRC_ROOT/package-lock.json" \
    "$SRC_ROOT/tsconfig.json" "$SRC_ROOT/perry.config.json" \
    "$SRC_ROOT/ecosystem.config.cjs" \
    "$WEB:$APP_DIR/"
  # Node-fallback needs tsx (devDep) to run TypeScript on the server.
  ssh "$WEB" "cd $APP_DIR && npm ci --no-audit --no-fund 2>&1 | tail -3"
fi

# ── 7. Atomic swap + pm2 restart ──────────────────────────────────
echo "==> 7. PM2 restart"
ssh "$WEB" "set -e
  cd $APP_DIR
  if [ -f perry-landing.new ]; then
    [ -f perry-landing ] && mv perry-landing perry-landing.bak.\$(date +%s)
    mv perry-landing.new perry-landing
    chmod +x perry-landing
  fi
  if pm2 describe beta-perryts >/dev/null 2>&1; then
    pm2 restart beta-perryts
  else
    pm2 start ecosystem.config.cjs
    pm2 save
  fi
"

# ── 8. Smoke check ────────────────────────────────────────────────
echo "==> 8. Sanity check"
sleep 2
ssh "$WEB" "pm2 describe beta-perryts | grep -E 'status|restarts' | head -3"
echo
if curl -fsS https://beta.perryts.com/healthz >/dev/null 2>&1; then
  echo "==> deploy complete — beta.perryts.com/healthz OK"
elif curl -fsS "http://127.0.0.1:4200/healthz" >/dev/null 2>&1; then
  echo "==> deploy complete (couldn't reach public URL yet — DNS or nginx pending)"
else
  echo "    /healthz FAILED — recent logs:"
  ssh "$WEB" "pm2 logs beta-perryts --lines 30 --nostream"
  exit 1
fi
