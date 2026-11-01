#!/bin/bash
# Run as root on the web server: install-nginx.sh <new-config-file>
# Installs the repo-managed nginx config, validates it, reloads, and reverts on any failure.
set -Eeuo pipefail
new="$1"
target=/etc/nginx/sites-available/perryts.com
cert=/etc/letsencrypt/live/perryts.com/fullchain.pem

# The canonical host must be covered by the certificate, or browsers get a TLS error.
openssl x509 -in "$cert" -noout -ext subjectAltName | grep -q 'DNS:www\.perryts\.com' \
    || { echo "cert $cert does not cover www.perryts.com; run: certbot --nginx -d perryts.com -d www.perryts.com" >&2; exit 1; }

if [ -f "$target" ] && cmp -s "$new" "$target"; then
    echo "nginx config already up to date"
    exit 0
fi

backup=""
if [ -f "$target" ]; then
    backup="$target.bak-$(date -u +%Y%m%dT%H%M%SZ)"
    cp -p "$target" "$backup"
fi
revert() {
    echo "nginx config install failed; reverting" >&2
    if [ -n "$backup" ]; then cp -p "$backup" "$target"; fi
    nginx -t && systemctl reload nginx || true
}
trap revert ERR
install -m 644 "$new" "$target"
ln -sfn "$target" /etc/nginx/sites-enabled/perryts.com
nginx -t
systemctl reload nginx
trap - ERR
echo "nginx config installed and reloaded"
