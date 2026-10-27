# Developer Portal

## Running

```bash
bun install
bun dev
```

## Build

```bash
bun run build
```

## Docker

```bash
docker build -t developer-portal .
docker run -p 80:80 developer-portal
```

## Cloudflare

Pull requests get a preview at `https://<branch>-developer-portal.sia-foundation.workers.dev`, and `master` also deploys to `https://developer-portal.sia-foundation.workers.dev`. To run the Worker build locally:

```bash
bunx opennextjs-cloudflare build
bunx opennextjs-cloudflare preview
```
