# Refinery POC — server deployment

Two PM2 processes + two nginx server blocks, same shape as your other apps
(astriverse / dso / gpuaas).

| Piece | Process | Port | nginx subdomain | Cloudflare |
| --- | --- | --- | --- | --- |
| Frontend (Next.js dashboard) | `next start -p 3202` | **3202** | `refinery.astrikos.xyz` | Orange (proxied) |
| Backend REST API | `backend/src/server.js` | **3008** | `api-refinery.astrikos.xyz` | **Gray** (bypass CF, like your socket subdomains) |

Unlike gpuaas (static SPA), this frontend is a **Next.js SSR server**, so it runs
as a node process (`next start`) behind nginx, exactly like astriverse/dso. The
browser polls the backend REST API cross-origin; the backend already sends
`Access-Control-Allow-Origin: *`, so no CORS config is needed in nginx.

> The API URL is baked into the frontend build from `frontend/.env.production`
> (`NEXT_PUBLIC_API_URL=https://api-refinery.astrikos.xyz:8443`). It's a **gray**
> subdomain hit directly on `:8443` (bypasses Cloudflare), like your socket
> subdomains. If your API subdomain/port differs, edit `.env.production` and
> **rebuild** the frontend.

---

## One-command path (minimum steps)

From the repo root on the server:

```bash
npm run deploy
```

That runs: install frontend + backend deps → build the frontend → start **both**
PM2 processes (`ecosystem.config.js`) → `pm2 save`. That's it.

If you prefer the individual steps, they're below.

---

## 1. Build

`.next/` and `node_modules/` are git-ignored, so build on the server after pulling.

```bash
npm run install:all      # npm install in ./frontend and ./backend
npm run build            # next build -> frontend/.next
```

## 2. Start the PM2 processes

```bash
pm2 start ecosystem.config.js   # starts refinery_frontend_3202 + refinery_backend_3008
pm2 save
```

Quick check:
`curl -k https://api-refinery.astrikos.xyz:8443/api/health` →
`{"status":"ok","timestamp":"..."}`.

## 3. Cloudflare DNS

- `refinery.astrikos.xyz` → **Orange cloud** (proxied), like astriverse/dso/gpuaas.
- `api-refinery.astrikos.xyz` → **Gray cloud** (DNS-only), like your existing
  `socket.*` subdomains — the API is hit directly on nginx `:8443`, bypassing CF.

---

## BLOCK 1 — app subdomain (frontend, ORANGE)

```
server{
        listen 8443 ssl;
        ssl_certificate /etc/certs/astrikos.xyz/fullchain.pem;
        ssl_certificate_key /etc/certs/astrikos.xyz/privkey.pem;
        server_name refinery.astrikos.xyz;

        location / {
                add_header 'Access-Control-Allow-Origin' '*' always;
                proxy_pass http://127.0.0.1:3202;
                proxy_set_header Host $host;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
        }
}
```

## BLOCK 2 — API subdomain (GRAY CLOUD in Cloudflare → bypasses CF)

```
server {
    listen 8443 ssl;
    ssl_certificate     /etc/certs/astrikos.xyz/fullchain.pem;
    ssl_certificate_key /etc/certs/astrikos.xyz/privkey.pem;
    server_name api-refinery.astrikos.xyz;

    location / {
        proxy_pass http://127.0.0.1:3008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}
```

Then `sudo nginx -t && sudo systemctl reload nginx`.

---

## Verify

1. `curl -k https://api-refinery.astrikos.xyz:8443/api/health` → `{"status":"ok",...}`.
2. Open `https://refinery.astrikos.xyz` on a laptop → the dashboard loads and KPIs /
   alerts / digital-twin data populate (the browser is polling the API subdomain).
3. If data doesn't load, the browser console/network tab shows the API URL it tried —
   confirm it matches `https://api-refinery.astrikos.xyz:8443` and that `:8443` is
   reachable (gray cloud / DNS-only in Cloudflare).

> `render.yaml` and `netlify.toml` are for the managed Render/Netlify deploys and are
> **not used** by this PM2 + nginx path — ignore them here.
