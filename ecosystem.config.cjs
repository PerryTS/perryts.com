// PM2 config for beta.perryts.com. Reads env from ./.env on the
// webserver (deploy.sh writes that file out separately).

const fs = require('fs');
const path = require('path');

const envVars = {};
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envVars[t.slice(0, eq).trim()] = v;
  }
}

// Default to native binary; if it isn't present, try the tsx fallback.
const binary = path.join(__dirname, 'perry-landing');
const useBinary = fs.existsSync(binary);

module.exports = {
  apps: [{
    name: 'beta-perryts',
    cwd: __dirname,
    script: useBinary ? './perry-landing' : 'node_modules/.bin/tsx',
    args: useBinary ? [] : ['src/server.tsx'],
    env: envVars,
    autorestart: true,
    max_restarts: 30,
    restart_delay: 2000,
  }],
};
