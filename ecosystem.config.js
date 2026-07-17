// PM2 process file for the Astrikos Refinery POC.
// Starts BOTH processes with one command:  pm2 start ecosystem.config.js
//
//   refinery_frontend_3202 -> Next.js SSR server (next start)  on :3202  (orange in CF)
//   refinery_backend_3008  -> Express REST API (src/server.js) on :3008  (gray  in CF)
//
// Ports/subdomains are documented in DEPLOY.md. If you change the frontend port,
// update the nginx block; if you change the backend port, update BACKEND_INTERNAL_URL
// below AND frontend/.env.production (then rebuild the frontend).

const path = require('path');

module.exports = {
  apps: [
    {
      name: 'refinery_frontend_3202',
      cwd: path.join(__dirname, 'frontend'),
      // Run the Next.js production server directly (needs `npm run build` first).
      script: path.join(__dirname, 'frontend', 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start -p 3202',
      env: {
        NODE_ENV: 'production',
        // Same-host internal URL for server-component fetches (skips TLS + Cloudflare).
        BACKEND_INTERNAL_URL: 'http://127.0.0.1:3008',
      },
    },
    {
      name: 'refinery_backend_3008',
      cwd: path.join(__dirname, 'backend'),
      script: path.join(__dirname, 'backend', 'src', 'server.js'),
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
      },
    },
  ],
};
