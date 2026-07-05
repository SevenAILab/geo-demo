---
summary: "GEO business UI access path and service-token configuration"
read_when:
  - Running GEO separately from the OpenClaw Dashboard
  - Configuring GEO to call the OpenClaw Gateway without exposing tokens in the browser
title: "GEO business UI"
---

GEO is a separate business UI/service. Do not mount it under the OpenClaw Dashboard or Gateway front-end route such as `/geo`.

## Access paths

| Surface               | Default URL                             | Purpose                                           |
| --------------------- | --------------------------------------- | ------------------------------------------------- |
| OpenClaw Dashboard    | `http://127.0.0.1:18789/`               | System management, agents, tokens, models, config |
| GEO business UI       | `http://127.0.0.1:18790/`               | GEO assessment, reports, repair packs, monitoring |
| GEO -> OpenClaw proxy | `http://127.0.0.1:18790/api/openclaw/*` | Server-side proxy to OpenClaw Gateway APIs        |
| OpenClaw Gateway API  | `http://127.0.0.1:18789/`               | Gateway/API provider consumed by GEO server       |

The Dashboard keeps its own auth flow. Opening GEO should not require users to paste the Dashboard token in the browser.

## Configuration files

| File                                         | Purpose                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `config/openclaw.geo-demo.json`              | Project-level GEO defaults: port, host, Gateway URL, feature flags |
| `geo-scoring-kit/.env`                       | Local secrets and environment overrides for the GEO server         |
| `geo-scoring-kit/.env.example`               | Copyable template for local GEO configuration                      |
| `geo-scoring-kit/scripts/geo-dev-server.mjs` | GEO standalone dev service entrypoint                              |
| `package.json`                               | `geo:dev` and `gateway:dev` scripts                                |

## Required GEO environment

Copy the sample file and fill the token only on the GEO server side:

```bash
cp geo-scoring-kit/.env.example geo-scoring-kit/.env
```

```env
GEO_PORT=18790
GEO_HOST=127.0.0.1
GEO_CONFIG_PATH=../config/openclaw.geo-demo.json
OPENCLAW_BASE_URL=http://127.0.0.1:18789
OPENCLAW_SERVICE_TOKEN=replace-with-openclaw-service-token
```

| Variable                 | Required                     | Description                                                                                                     |
| ------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GEO_PORT`               | No                           | GEO service port. Defaults to `18790`.                                                                          |
| `GEO_HOST`               | No                           | GEO bind host. Defaults to `127.0.0.1`.                                                                         |
| `GEO_CONFIG_PATH`        | No                           | Path to the project GEO config. Defaults to `../config/openclaw.geo-demo.json` from `geo-scoring-kit/`.         |
| `OPENCLAW_BASE_URL`      | Yes                          | OpenClaw Gateway base URL, normally `http://127.0.0.1:18789`.                                                   |
| `OPENCLAW_SERVICE_TOKEN` | Yes for OpenClaw proxy calls | Service token used by the GEO backend when calling OpenClaw. Never expose it through front-end build variables. |

## Token model

| Token             | Where it lives                                | Who uses it                    | Browser-visible                               |
| ----------------- | --------------------------------------------- | ------------------------------ | --------------------------------------------- |
| Dashboard token   | OpenClaw Dashboard auth/session               | Admin users accessing `:18789` | May be entered into Dashboard auth UI         |
| GEO service token | `geo-scoring-kit/.env` or server secret store | GEO backend calling OpenClaw   | No                                            |
| GEO user session  | GEO app/session layer, if enabled             | Users accessing `:18790`       | Yes, but it is not the OpenClaw service token |

Do not use `VITE_*`, front-end config, or committed JSON files for `OPENCLAW_SERVICE_TOKEN`.

## Start locally

Run Gateway and GEO as two separate services:

```bash
pnpm gateway:dev
```

```bash
pnpm geo:dev
```

Then open:

| URL                       | Expected result                 |
| ------------------------- | ------------------------------- |
| `http://127.0.0.1:18789/` | OpenClaw Dashboard / Control UI |
| `http://127.0.0.1:18790/` | GEO business UI                 |

## Calling OpenClaw from GEO

Browser code should call the GEO server, not the OpenClaw Gateway directly:

```ts
await fetch("/api/openclaw/v1/chat/completions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
```

The GEO server forwards the request to `OPENCLAW_BASE_URL` and adds:

```http
Authorization: Bearer ${OPENCLAW_SERVICE_TOKEN}
```

This keeps OpenClaw credentials on the server and avoids leaking the service token into browser bundles, localStorage, or network requests from the browser to `:18789`.
