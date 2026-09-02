# Environment Variable Matrix

Single source of truth for which env vars each app needs and **where** they need to be set (local `.env`, Vercel, Railway).

Use this file every time you add a new env var. If it's not here, it doesn't exist.

**Last audit:** 2026-09-02 — first audit of the **deployed** environments, not just this doc. Findings and remediation live in [DEPLOY_BACKLOG.md](./DEPLOY_BACKLOG.md) DEP-009. Headline: production had not been touched in 3+ months and was never configured for this version of the app; `dev` was. `api-exchange` prod is missing 26 of 43 documented vars including the whole Bitso block. *(Previous audit: 2026-06-12, after Bitso/Conekta integration.)*

### Two standing false positives

Every future audit will surface these. They are noise, not gaps:

- **`PORT` on Railway.** Railway supplies it at runtime and does not list it as a variable, so it reads as missing on all eight services. Expected.
- **`NEXT_PUBLIC_*` on Vercel.** Next.js leftovers in `apps/web/.env.example`. `apps/web` is Vite, which only exposes `VITE_*`; these survive solely as fallbacks in `EnvStatus.tsx:5-7`. Delete them from `.env.example` rather than setting them.

### The one that bit us

`VITE_*` vars are **baked into the bundle at build time**. A missing one ships as `undefined` with no startup error, and setting it in the Vercel dashboard changes nothing until the project is **redeployed**. `VITE_POLYGON_PXO_RECEIVER_ADDRESS` being unset on production is why `usePXOSell.ts:31` fell through to a hardcoded address nobody controls — see SL-001. Treat every `VITE_*` gap as a silent-failure candidate, never a loud one.

## How to use this doc

- **Required**: app crashes or silently misbehaves if missing
- **Optional**: has a code default, override only when you need to
- **Local only**: dev-time convenience, NOT set in deployed envs
- **Hosts**: `L` = local `.env`, `V` = Vercel dashboard, `R` = Railway dashboard

When you change a row here, also update the relevant `.env.example`.

---

## Shared values (consolidation candidates)

These values are the SAME across multiple apps. Today they're duplicated in each `.env`. Recommendation: keep duplicated but treat **one app** as canonical (the source of truth), and copy from there.

| Logical value | Canonical owner | Consumers | Notes |
|---|---|---|---|
| Supabase URL | `api-auth` | web, landing, all api-* | Same project across all envs |
| Supabase secret/anon keys | `api-auth` | web, landing, all api-* | Anon for frontend, secret for backend |
| Thirdweb client id | `api-auth` | web, landing, api-auth, api-orchestrator, api-pagos, api-exchange, api-wallet | |
| Thirdweb admin private key | `api-auth` | api-auth, api-orchestrator | Treasury signer |
| PXO token addresses | `api-exchange` | web, api-pagos, api-exchange, api-wallet | Per chain (mainnet, amoy, bsc) |
| PXO receiver addresses | `api-exchange` | web, api-pagos, api-exchange | Per chain |
| Polygon/BSC RPC URLs | `api-pagos` | api-pagos, api-exchange | Provider-specific |

**Naming inconsistency to fix later (Standard scope):** backend APIs read `VITE_THIRDWEB_CLIENT_ID` and `NEXT_PUBLIC_SUPABASE_URL`. These prefixes are bundler conventions, not Node. They work but obscure ownership.

---

## apps/web — Vite + React (Vercel)

| Var | Required | Hosts | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | yes | L, V | |
| `VITE_SUPABASE_ANON_KEY` | yes | L, V | |
| `VITE_THIRDWEB_CLIENT_ID` | yes | L, V | |
| `VITE_THIRDWEB_AUTH_DOMAIN` | yes | L, V | |
| `VITE_CHAINS_ENVIRONMENT` | yes | L, V | `PROD` or `STAGING` — controls mainnet vs testnet |
| `VITE_FORCE_POLYGON_MAINNET` | optional | L, V | Default `false` |
| `VITE_ENABLE_ADMIN_TESTNET` | optional | L, V | Default `false` |
| `VITE_PXO_TOKEN_ADDRESS_MAINNET` | yes | L, V | |
| `VITE_PXO_TOKEN_ADDRESS_TESTNET` | yes | L | Local dev only if `CHAINS_ENVIRONMENT != PROD` |
| `VITE_POLYGON_PXO_RECEIVER_ADDRESS` | yes | L, V | |
| `VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS` | optional | L | Testnet only |
| `VITE_BSC_PXO_RECEIVER_ADDRESS` | optional | L, V | Only if BSC enabled |
| `VITE_API_URL` | optional | V | Empty for dev (proxy); set to orchestrator URL in Vercel |
| `VITE_SESSION_WARNING_THRESHOLD` | optional | L, V | Default `120` |
| `VITE_JWT_EXPIRATION_TIME` | optional | L, V | Default `1800`, MUST match `api-auth` |
| `VITE_SIGNATURE_TIMEOUT_SECONDS` | optional | L, V | Default `120` |
| `VITE_AUTO_RENEW_ON_ACTIVITY` | optional | L, V | Default `true` |
| `NEXT_PUBLIC_*` fallbacks | deprecated | — | Legacy; migrate consumers to `VITE_*` |

**Known drift risk:** `VITE_*` vars are baked into the build. If a var is missing on Vercel, the bundle silently ships `undefined` — no startup error. **Cross-check this table against `vercel env pull` output before every deploy.**

---

## apps/api-auth (Railway) — clean reference

| Var | Required | Hosts |
|---|---|---|
| `PORT` | yes | L (default `3002`); Railway provides `PORT` automatically |
| `HOST` | yes | L, R |
| `NODE_ENV` | yes | L, R |
| `ALLOWED_ORIGINS` | yes | L, R |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | L, R |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | L, R |
| `SUPABASE_SECRET_KEY` | yes | L, R |
| `VITE_THIRDWEB_CLIENT_ID` | yes | L, R |
| `VITE_THIRDWEB_AUTH_DOMAIN` | yes | L, R |
| `THIRDWEB_ADMIN_PRIVATE_KEY` | yes | L, R |
| `THIRDWEB_SECRET_KEY` | yes | L, R |
| `JWT_EXPIRATION_TIME` | yes | L, R | Must match web `VITE_JWT_EXPIRATION_TIME` |

✅ `.env` and `.env.example` are in sync. Use this app as the template for the others.

---

## apps/api-orchestrator (Railway)

Pure router. Reads upstream URLs and JWT verification keys.

| Var | Required | Hosts | Notes |
|---|---|---|---|
| `PORT`, `HOST`, `NODE_ENV`, `ALLOWED_ORIGINS` | yes | L, R | |
| `UPSTREAM_API_AUTH` | yes | L, R | |
| `UPSTREAM_API_EMAIL` | yes | L, R | |
| `UPSTREAM_API_PAGOS` | yes | L, R | |
| `UPSTREAM_API_USERS` | yes | L, R | |
| `UPSTREAM_API_KYC` | yes | L, R | |
| `UPSTREAM_API_WALLET` | yes | L, R | |
| `UPSTREAM_API_EXCHANGE` | yes | L, R | **Was missing from both files — added 2026-06-12** |
| `JWT_EXPIRATION_TIME` | yes | L, R | |
| `THIRDWEB_ADMIN_PRIVATE_KEY` | yes | L, R | |
| `VITE_THIRDWEB_CLIENT_ID`, `VITE_THIRDWEB_AUTH_DOMAIN` | yes | L, R | |

---

## apps/api-exchange (Railway)

Most complex app. Pricing + fiat on-ramp orchestration.

| Var | Required | Hosts | Notes |
|---|---|---|---|
| Server (PORT/HOST/NODE_ENV/ALLOWED_ORIGINS) | yes | L, R | |
| Supabase | yes | L, R | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` |
| Thirdweb | yes | L, R | `VITE_THIRDWEB_CLIENT_ID`, `THIRDWEB_SECRET_KEY` |
| Treasury wallet | yes | L, R | `WALLET_PRIVATE_KEY_ENCRYPTED` + `ENCRYPTER_PRIVATE_KEY` (preferred), or `WALLET_PRIVATE_KEY` (fallback, dev only) |
| `PXO_TOKEN_ADDRESS_MAINNET` | yes | L, R | |
| `PXO_TOKEN_ADDRESS_TESTNET` | yes | L | |
| `FORCE_POLYGON_MAINNET` | optional | L, R | Default `false` |
| `POLYGON_PXO_RECEIVER_ADDRESS` | yes | L, R | **Was silent dep — added 2026-06-12** |
| `POLYGON_AMOY_PXO_RECEIVER_ADDRESS` | yes | L | **Was silent dep — added 2026-06-12** |
| `BSC_PXO_RECEIVER_ADDRESS` | optional | L, R | **Was silent dep — added 2026-06-12**. Required only if BSC enabled |
| `POLYGON_DEFAULT_TOKEN`, `POLYGON_AMOY_DEFAULT_TOKEN`, `BSC_DEFAULT_TOKEN` | yes per active chain | L, R | **Were silent deps — added 2026-06-12** |
| `GAS_SUBSIDY_MIN_INTERVAL_MINUTES` | yes | L, R | **Silent dep — added 2026-06-12** |
| `MAX_GAS_SUBSIDIES_PER_DAY` | yes | L, R | **Silent dep — added 2026-06-12** |
| `MAX_GAS_SUBSIDY_DAILY_AMOUNT_WEI` | yes | L, R | **Silent dep — added 2026-06-12** |
| `BINANCE_API_BASE_URL` | yes | L, R | |
| Conekta block | yes | L, R | `CONEKTA_*` — fiat on-ramp |
| Bitso block | yes | L, R | `BITSO_*` — SPEI custody. Stage URL until prod cutover |
| `FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK` | **MUST be `false` in prod** | L, R | Demo mode bypasses funding verification |
| `ALCHEMY_API_KEY` | yes | L, R | Was missing from .example — add explicitly |

---

## apps/api-pagos (Railway)

Payment processing + reconciliation + webhooks.

| Var | Required | Hosts | Notes |
|---|---|---|---|
| Server + Supabase + Thirdweb + Wallet | yes | L, R | Same shape as api-exchange |
| `POLYGON_AMOY_PXO_RECEIVER_ADDRESS` + `VITE_*` mirror | yes | L | Mirrored vars are messy — clean up in Standard scope |
| `PXO_TOKEN_ADDRESS_TESTNET` + `VITE_*` mirror | yes | L | Same |
| `ALCHEMY_API_KEY` | yes | L, R | |
| Binance | yes | L, R | `BINANCE_API_KEY`, `BINANCE_API_BASE_URL` |
| Resend | yes | L, R | `RESEND_*` block |
| Upstash Redis | yes | L, R | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| `CRON_SECRET` | yes | L, R | Used by Vercel cron endpoints |
| `PAYMENTS_CHAIN_ID` | yes | L, R | **Silent dep — added 2026-06-12** |
| `PXO_TOKEN_ADDRESS_BSC` | optional | L, R | **Silent dep — added 2026-06-12** |
| `POLYGON_MAINNET_RPC_URL` | yes | L, R | **Silent dep — added 2026-06-12** |
| `BSC_RPC_URL` | optional | L, R | **Silent dep — added 2026-06-12** |
| `PAYMENT_TTL_MINUTES` | optional | L, R | **Silent dep — added 2026-06-12**. Default `15` |
| `EXPIRATION_WORKER_INTERVAL_MS` | optional | L, R | **Silent dep — added 2026-06-12**. Default `60000` |
| `RECONCILIATION_WORKER_INTERVAL_MS` | optional | L, R | **Silent dep — added 2026-06-12**. Default `30000` |
| `WEBHOOK_INBOUND_SECRET` | yes | L, R | **Silent dep — added 2026-06-12** |
| `WEBHOOK_OUTBOUND_SECRET` | yes | L, R | **Silent dep — added 2026-06-12** |

---

## apps/api-users (Railway, but cron via Vercel)

| Var | Required | Hosts |
|---|---|---|
| `PORT`, `HOST`, `NODE_ENV`, `ALLOWED_ORIGINS` | yes | L, R |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | L, R |
| `SUPABASE_SECRET_KEY` | yes | L, R |
| `CRON_SECRET` | yes | L, R | **Missing from local `.env` — add it before next deploy.** Generate: `openssl rand -base64 32` |

---

## apps/api-wallet (Railway)

| Var | Required | Hosts |
|---|---|---|
| Server + Supabase + Thirdweb + Wallet | yes | L, R | Same shape as api-exchange |
| `PXO_TOKEN_ADDRESS_MAINNET` | yes | R | **Missing from local `.env`** — mainnet won't resolve locally |
| `PXO_TOKEN_ADDRESS_TESTNET` | yes | L | |
| `FORCE_POLYGON_MAINNET` | optional | L, R | |
| `ALCHEMY_API_KEY` | yes | L, R | |

---

## apps/api-email (Railway)

| Var | Required | Hosts | Notes |
|---|---|---|---|
| Server + Supabase | yes | L, R | |
| `RESEND_*` (4 vars) | yes | L, R | |
| `VERCEL_URL` | yes | R | **Missing from local `.env`** — set to public web URL for email link generation |

---

## apps/api-kyc (Railway) — clean reference

| Var | Required | Hosts |
|---|---|---|
| Server + Supabase | yes | L, R |
| `KYC_ADMIN_WALLETS` | yes | L, R | Comma-separated admin addresses |

✅ `.env` and `.env.example` are in sync.

---

## apps/landing (Vercel)

Same `VITE_*` shape as `apps/web` but landing-only subset. Currently no `.env.example` — duplicate from `apps/web/.env.example` once landing is in scope.

## apps/pagos (Vite + React, deployed where?)

POS terminal simulator. Uses non-standard `env.example` filename. Most `.env` keys are dead — clean up when there's bandwidth.

---

## Diffing local vs deployed

### Railway (api-* apps)

For each api-* service, log into Railway CLI and export keys only:

```sh
# Install once
npm i -g @railway/cli && railway login

# For each service (link to the right project/service first):
railway link
railway variables --kv | sort | cut -d= -f1 > /tmp/railway-<service>.keys
sort apps/<service>/.env.example | grep -E '^[A-Z]' | cut -d= -f1 > /tmp/local-<service>.keys
diff /tmp/local-<service>.keys /tmp/railway-<service>.keys
```

Anything in `local` but not in `railway` is a deploy-time bug waiting to happen.
Anything in `railway` but not in `local` is either dead config or undocumented in this repo (add it to `.env.example` and this matrix).

### Vercel (apps/web)

```sh
cd apps/web
vercel link
vercel env pull .env.vercel.local
grep -E '^[A-Z]' .env.vercel.local | cut -d= -f1 | sort > /tmp/vercel-web.keys
grep -E '^[A-Z]' .env.example | cut -d= -f1 | sort > /tmp/local-web.keys
diff /tmp/local-web.keys /tmp/vercel-web.keys
rm .env.vercel.local  # don't commit
```

---

## Pre-launch checklist (before 2026-07-01)

- [ ] Run Railway diff for every api-* service; reconcile to zero
- [ ] Run Vercel diff for apps/web; reconcile to zero
- [ ] Confirm `FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK=false` in production Railway for api-exchange
- [ ] Confirm `VITE_CHAINS_ENVIRONMENT=PROD` on Vercel for apps/web
- [ ] Confirm `FORCE_POLYGON_MAINNET=true` (or chain selection matches chain scope decision) across api-exchange, api-pagos, api-wallet
- [ ] Add `CRON_SECRET` to api-users local `.env` and confirm it's set in Railway
- [ ] Add `VERCEL_URL` to api-email Railway env (public web hostname)
- [ ] Create `.env.example` for apps/landing
