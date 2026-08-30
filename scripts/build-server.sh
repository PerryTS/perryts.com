#!/bin/sh
set -eu

# A sibling Perry checkout lets the compiler rebuild the feature-scaled native
# stdlib (including Fastify symbols). Release installs can use their packaged
# libraries when no checkout is present, as on the production host.
if [ -f ../perry/Cargo.toml ]; then
  PERRY_WORKSPACE_ROOT=../perry
  export PERRY_WORKSPACE_ROOT
fi

perry compile native-entry/server.ts -o server
