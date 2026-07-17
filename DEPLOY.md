# Refinery POC — server deployment

Two PM2 processes + two nginx server blocks, per `deployment_context.md`.

## Processes

| Piece | Process | Port | Subdomain | pm2 name | Cloudflare |
| --- | --- | --- | --- | --- | --- |
| Frontend (Next.js SSR) | `next start -p 3307` | **3307** | `refinery.astrikos.xyz` | `refinery_3307` | Orange (proxied) |
| Backend (Express REST API) | `backend/src/server.js` | **4307** | `refinery-api.astrikos.xyz` | `refinery_be_4307` | **Gray** (DNS-only) |

One backend process, one port. **This POC has no websocket layer** — the backend
is REST-only and the browser polls it. The backend nginx block still carries the
websocket-upgrade headers per the convention, so it serves REST today and would
serve sockets unchanged if one is added later.

> This frontend is a **Next.js SSR app**, not a static SPA — it runs as a node
> process behind nginx (`next start`), so there is no `dist/` to `serve`.
> Env vars use the `NEXT_PUBLIC_` prefix (Next.js); `VITE_*` names would be
> inert here.

## 1. Build

`.next/` and `node_modules/` are git-ignored — build on the server after pulling.

```bash
npm run install:all      # npm install in ./frontend and ./backend
npm run build            # next build -> frontend/.next
```

The API URL is baked into the client bundle at build time from
`frontend/.env.production`. If the API subdomain or port changes, edit that file
and **rebuild the frontend**.

> ⚠️ **Do not put a `.env.local` on the server.** Next.js loads `.env.local` in
> every environment and it *overrides* `.env.production`, so a stray copy would
> silently bake `127.0.0.1` into the client bundle and the dashboard would fail
> to reach the API from a browser. It's git-ignored (dev-only). Confirm before
> building:
> ```bash
> ls frontend/.env.local 2>/dev/null && echo "REMOVE THIS BEFORE BUILDING"
> ```
> `next build` prints the files it loaded (`- Environments: ...`) — it should say
> `.env.production` only.

## 2. Start (PM2)

Both processes in one command via `ecosystem.config.js`:

```bash
pm2 start ecosystem.config.js    # refinery_3307 + refinery_be_4307
pm2 save
```

Equivalent explicit commands:

```bash
cd frontend
pm2 start node_modules/next/dist/bin/next --name "refinery_3307" -- start -p 3307

cd ../backend
PORT=4307 HOST=127.0.0.1 pm2 start src/server.js --name "refinery_be_4307"

pm2 save
```

Or the whole path in one shot: `npm run deploy` (install → build → pm2 → save).

## 3. nginx

`astrikos.conf` — frontend:

```nginx
server {
    listen 8443 ssl;
    ssl_certificate     /etc/certs/astrikos.xyz/fullchain.pem;
    ssl_certificate_key /etc/certs/astrikos.xyz/privkey.pem;
    server_name refinery.astrikos.xyz;
    location / {
        add_header 'Access-Control-Allow-Origin' '*' always;
        proxy_pass http://127.0.0.1:3307;
    }
}
```

`astriverse.conf` — backend. Needs
`map $http_upgrade $connection_upgrade { default upgrade; '' close; }` once at
the top of the file:

```nginx
server {
    listen 8443 ssl;
    ssl_certificate     /etc/certs/astrikos.xyz/fullchain.pem;
    ssl_certificate_key /etc/certs/astrikos.xyz/privkey.pem;
    server_name refinery-api.astrikos.xyz;
    location / {
        proxy_pass http://127.0.0.1:4307;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }
}
```

Apply: `sudo nginx -t && sudo systemctl reload nginx`

## 4. Cloudflare DNS

- `refinery.astrikos.xyz` → **Orange** (proxied)
- `refinery-api.astrikos.xyz` → **Gray** (DNS-only)

## 5. Verify

```bash
curl -k https://refinery.astrikos.xyz:8443              # dashboard HTML
curl -k https://refinery-api.astrikos.xyz:8443/api/health
# -> {"status":"ok","timestamp":"..."}
```

Then open `https://refinery.astrikos.xyz` — KPIs, alerts and the digital twin
should populate (the browser polls `https://refinery-api.astrikos.xyz:8443`). If
data doesn't load, the network tab shows the API URL it tried: confirm it matches
`.env.production` and that `:8443` is reachable (gray cloud / DNS-only).

> `render.yaml` and `netlify.toml` are for the managed Render/Netlify deploys and
> are **not used** by this PM2 + nginx path — ignore them here.
