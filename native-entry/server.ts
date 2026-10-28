// Compile entry for the static file server (see scripts/build-server.sh and deploy.sh).
// It originally lived outside the project root so Perry would not mistake the old
// Next.js build for a standalone server; the path is kept so deploys stay unchanged.
import "../server.ts";
