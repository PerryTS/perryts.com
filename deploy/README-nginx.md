# nginx on webserver.skelpo.net

`deploy/nginx-prod.conf` is the source of truth. Every `deploy.sh` run uploads it and installs it with
`deploy/install-nginx.sh` (cert check → backup → `nginx -t` → reload → auto-revert on failure).

## One-time server setup (as root)

The `perryts-deploy` user is not root, so allow it exactly one privileged command. The wrapper copies the
installer from a root-owned location so a deploy cannot run arbitrary code as root:

    install -m 755 -o root -g root deploy/install-nginx.sh /usr/local/sbin/perryts-install-nginx
    echo 'perryts-deploy ALL=(root) NOPASSWD: /usr/local/sbin/perryts-install-nginx' > /etc/sudoers.d/perryts-deploy-nginx
    chmod 440 /etc/sudoers.d/perryts-deploy-nginx && visudo -c

Re-run the first `install` line whenever `install-nginx.sh` changes (the sudo path runs the root-owned copy,
not the uploaded one). Also make sure the certificate covers both names:

    certbot --nginx -d perryts.com -d www.perryts.com
