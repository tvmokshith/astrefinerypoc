// PM2 process file for the Astrikos Refinery POC.
// Starts BOTH processes with one command:  pm2 start ecosystem.config.js
//
//   refinery_3307    -> Next.js SSR server (next start) on :3307  (orange in CF)
//   refinery_be_4307 -> Express REST API (src/server.js) on :4307 (gray  in CF)
//
// Ports/subdomains are documented in DEPLOY.md. If you change the frontend port,
// update the nginx block; if you change the backend port, update frontend/
// .env.production (BACKEND_INTERNAL_URL + NEXT_PUBLIC_API_URL) and rebuild.

const path = require('path');

module.exports = {
  apps: [
    {
      name: 'refinery_3307',
      cwd: path.join(__dirname, 'frontend'),
      // Run the Next.js production server directly (needs `npm run build` first).
      script: path.join(__dirname, 'frontend', 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'start -p 3307',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'refinery_be_4307',
      cwd: path.join(__dirname, 'backend'),
      script: path.join(__dirname, 'backend', 'src', 'server.js'),
      env: {
        NODE_ENV: 'production',
        PORT: 4307,
        HOST: '127.0.0.1',
      },
    },
  ],
};
