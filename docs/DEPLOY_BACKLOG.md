# PXO Deploy & Infrastructure Backlog

**Status:** Opened 2026-08-31
**Audience:** Adrian (CTO), future contributors
**Scope:** Deployment, hosting, build pipeline, and runtime-packaging issues only. Product and money-flow work lives in [BACKLOG.md](./BACKLOG.md).

---

## How to read this

Same conventions as the main backlog. Tiers here are keyed to deploy risk rather than launch phase:

- **🟥 Tier 1 — Before the next production deploy.** Something is broken, silently degraded, or will break on the next push.
- **🟧 Tier 2 — Dated deadline.** Externally imposed cutoffs. Not urgent today, hard-stop later.
- **🟩 Tier 3 — Hygiene.** Reduces the chance of the next outage; nothing is on fire.

Types: 🔧 Code · 🔍 Discovery · 🔐 Ops · 📋 Docs · 📞 External

---

## Checklist

- [ ] **DEP-001** — Give `@pxo/shared` a real build instead of shipping TypeScript source
- [ ] **DEP-002** — Replace non-erasable enums in `@pxo/shared` and enable `erasableSyntaxOnly`
- [ ] **DEP-003** — Migrate Railway Config as Code → Infrastructure as Code (hard cutoff 2026-12-01)
- [ ] **DEP-004** — Codify per-environment deploy settings for services that can't use Config as Code
- [ ] **DEP-005** — Make a dead service visible without a human reading deploy logs
- [ ] **DEP-006** — Decide the build-trigger scope per service (root directory vs explicit watch paths)
- [ ] **DEP-007** — Confirm Vercel issues its own TLS cert for `pxotoken.com` before 2026-11-14 (recovery otherwise complete)
- [ ] **DEP-008** — Inventory third-party account ownership and write a contributor offboarding checklist
- [ ] **DEP-009** — Production was never configured for this version of the app (Railway + Vercel)
- [ ] **DEP-010** — `apps/api-exchange` has no ESLint config; repo-wide lint fails there

---

## 🟥 Tier 1 — Before the next production deploy

### DEP-001 · Give `@pxo/shared` a real build instead of shipping TypeScript source
**Type:** 🔧 Code
**Effort:** 3-5 hours
**Why:** `packages/shared/package.json` maps every export at `./src/**/*.ts`, and `packages/shared/tsconfig.json` sets `noEmit: true` — the package is never built. In production the API services run `node dist/index.js`, so Node loads that TypeScript directly through native type-stripping. Type-stripping only deletes characters; it never rewrites specifiers or generates code. That makes the whole package hostage to what one particular Node feature happens to support, and it already caused a nine-day fleet-wide outage (see Resolved log below).

The interim fix (`.ts` extensions everywhere + `allowImportingTsExtensions` / `rewriteRelativeImportExtensions` in the eight API tsconfigs) works and is verified, but it is a workaround: it keeps raw TS on the production runtime and leaves DEP-002 live.

**Steps:**
1. In `packages/shared`: drop `noEmit`, keep `outDir: dist`, add `"build": "tsc"` to scripts, emit declarations.
2. Rewrite the 30 relative specifiers from `./x.ts` to `./x.js` (standard NodeNext emit style).
3. Point `exports` at `./dist/**/*.js` with `types` at the matching `.d.ts`.
4. Revert `allowImportingTsExtensions` / `rewriteRelativeImportExtensions` in `apps/api-*/tsconfig.json` (note `api-email` originally pinned `allowImportingTsExtensions: false` — someone hit this edge before).
5. Turbo's `build` task already declares `dependsOn: ["^build"]`, so dependent apps will build shared first with no pipeline change. **Verify** that Railway's build command per service actually routes through turbo, or shared's `dist` won't exist at build time.
6. `dev` in `turbo.json` has no `dependsOn` — confirm local `pnpm dev` still works for web and the APIs, or add `^build`.
**Done when:** No `.ts` file is loaded at runtime in production; `pnpm build` is green; a built API service boots and answers `/health` with 200 locally via `node dist/index.js`.
**Watch for:** `apps/web` and `apps/pagos` consume shared through Vite, which resolves either form — they will not tell you if this regresses. Test the APIs.

### DEP-002 · Replace non-erasable enums in `@pxo/shared`, then enable `erasableSyntaxOnly`
**Type:** 🔧 Code
**Effort:** 2-3 hours
**Bundles with:** DEP-001
**Why:** Five `export enum` declarations exist in the shared package — `KYCStatus` (`src/types/user.ts`) and `OrderSide`, `OrderType`, `TimeInForce`, `EndpointStatus` (`src/types/binance.ts`). An enum is a *value*, not a type: it compiles to a runtime IIFE (plus a reverse map for numeric enums), which type-stripping cannot synthesise. Loading the root barrel `@pxo/shared` under plain Node fails today with `TypeScript enum is not supported in strip-only mode`.

Nothing breaks right now because no API service imports the root barrel as a value — only `/helpers`, `/consts`, and `/schemas/*`. **The first service that writes `import { KYCStatus } from '@pxo/shared'` as a value crashes in production exactly like the DEP-001 outage did, while passing type-check, lint, and local dev.** That is the trap worth closing.

**Steps:**
1. Convert each enum to the erasable pattern:
   ```ts
   export const KYCStatus = { PENDING: 'PENDING', /* … */ } as const;
   export type KYCStatus = typeof KYCStatus[keyof typeof KYCStatus];
   ```
   Value and type usage both keep working; the reverse mapping is lost (rarely wanted).
2. Grep for reverse-map usage (`KYCStatus[someValue]`) before converting.
3. Set `erasableSyntaxOnly: true` in `packages/config/tsconfig.base.json` (TS 5.8+; repo is on 5.9.3). It errors on anything that can't be stripped — enums, `namespace` with runtime members, constructor parameter properties, `import x = require()`.
**Done when:** `node -e "import('packages/shared/src/index.ts')"` resolves, and `erasableSyntaxOnly` is on with a green build.
**Note:** Turning the flag on *before* converting will fail the build on these five enums — convert first. If DEP-001 lands first, the flag becomes optional rather than load-bearing, but it's still worth having.

### DEP-007 · Confirm Vercel issues its own TLS certificate for `pxotoken.com`
**Type:** 🔐 Ops
**Effort:** 10 minutes to check; unknown if intervention is needed
**Status:** Domain recovery **complete and verified 2026-09-02** — site live, email intact. What remains is a single deferred risk: the certificate.

**Background:** The domain is registered in our Hostinger account, but the registry `NS` pointed at `ns1`/`ns2.vercel-dns.com` — a Vercel account belonging to a developer who had left. We held the registrar; we did not hold the DNS. Hostinger greyed out its zone editor because it wasn't authoritative, so we could not add the `_vercel` ownership-verification TXT, or any other record, without going back through him. The zone was moved to Hostinger's nameservers on 2026-09-02 (registry updated 13:54 UTC), Vercel verified ownership, and the domain was attached to our project.

**Verified working, 2026-09-02** (authoritative nameservers plus 8.8.8.8 / 1.1.1.1 / 9.9.9.9 / 208.67.222.222, all in agreement — propagation completed far ahead of the 48h registry TTL):

```
NS (registry)  ns1.dns-parking.com / ns2.dns-parking.com    both in sync, SOA 2026082701
A     @        216.198.79.1    the target Vercel asked for, propagated everywhere
CNAME www      pxotoken.com    www 307 -> apex; http 308 -> https
apex           HTTP 200, <title>PXO - The Mexican Digital Peso</title>
MX    @        Google Workspace, priorities 1 / 5 / 5 / 10 / 10 — survived byte-for-byte
TXT   @        "v=spf1 include:_spf.google.com ~all"    SPF was missing before; added
TXT   _dmarc   "v=DMARC1; p=none"
TXT   _vercel  "vc-domain-verify=pxotoken.com,083a606ce023b5567963"
CAA   @        (none — the old letsencrypt/pki.goog/sectigo pinning did not carry over)
```

**The open risk.** Vercel did **not** issue a new certificate when the domain was attached. Certificate Transparency shows nothing issued since 2026-08-16, and apex and `www` are both served by the previous account's wildcard cert — `CN=*.pxotoken.com`, serial `056CDCBCB57EF5371424F7DB89080FF2A7E0`, expiring **2026-11-14**. This works because a certificate is bound to the domain name, not to the account.

Let's Encrypt renews at roughly 30 days out, so the decision point is **mid-October**. If Vercel provisions its own cert, this closes itself. If it does not, the site fails on 2026-11-14 with an expired certificate on a live production domain — green right up until it isn't, the same shape as the nine-day crash loop in DEP-005.

**Steps:**
1. Check Vercel → Project → Settings → Domains now and read the certificate status against the domain. If it reports the 2026-11-14 cert, we have inherited the old one; if it shows pending or freshly issued, we are clear.
2. Let `scripts/check-cert-renewal.sh` watch it. Exits 0 while the situation is fine or still early, 1 once inside the renewal window with no new cert, 2 when urgent. Scheduled to run through October.
3. If nothing is issued by ~2026-10-20: removing and re-adding the domain in Vercel forces issuance. Brief downtime — do it outside business hours, and confirm no CAA record is blocking the CA first.
4. **Only after** a new certificate appears in CT, restore the three `CAA` entries (`letsencrypt.org`, `pki.goog`, `sectigo.com`). All issuance on this domain has been Let's Encrypt, so restoring them would probably be harmless — but adding a new constraint immediately before the one issuance that matters is the wrong sequencing. No CAA is permissive, not broken; this is hardening, not a fix.
5. Ask the dev to remove the domain from his Vercel account entirely (Domains tab, not just the project) so no stale claim remains.
6. Confirm no subdomain is meant to reach Railway. The wildcard `*` sends every unclaimed name to Vercel — this matches the old zone, so nothing regressed, but it has never been checked deliberately.
**Done when:** `pxotoken.com` serves a certificate issued to our own Vercel account (a serial other than `056CDCB…`), and the CAA records are back.
**Lesson recorded (for DEP-008):** With **no** MX records present, RFC 5321 has senders fall back to the `A` record — which during a registrar migration is the host's parking page, and that refuses SMTP, producing hard bounces rather than retries. An empty MX set is worse than a wrong one. On any future nameserver move, MX is the first record restored, not the last. Second lesson: recovering a domain does not recover its certificate, and the inherited one hides the gap until it expires.
**Follow-up:** DEP-008 — this was avoidable, and the same gap probably exists on other accounts.


---

## 🟧 Tier 2 — Dated deadline

### DEP-003 · Migrate Railway Config as Code → Infrastructure as Code
**Type:** 🔐 Ops + 🔧 Code
**Effort:** 4-6 hours, plus a dry-run cycle per environment
**Deadline:** **2026-12-01 (hard cutoff — `railway.json` stops being read).**
**Why:** Eight `apps/api-*/railway.json` files are deprecated. Railway keeps reading them for *existing* services until the cutoff, and they override dashboard values for those services. This is not a file-format swap — the model is different in four ways that matter:
- **CLI-only.** `.railway/railway.ts` is evaluated by `railway config plan` / `railway config apply`. It is **not** read on GitHub-triggered deploys the way `railway.json` is, so deploy settings stop applying automatically from the repo.
- **"One project definition, one apply, omit means delete."** Resources and variables present in the project but absent from the file are deleted on apply. Across eight services holding Bitso, thirdweb, and Supabase secrets, a careless apply is destructive.
- **One file per environment.** Per-service files aren't supported; the eight configs collapse into a single `.railway/railway.ts`.
- **No documented restart policy.** `service()` accepts `source`, `build`, `start`, `healthcheck`, `healthcheckTimeout`, `replicas`, `env`, `domains`, `volumeMounts`. Nothing maps to `restartPolicyType` / `restartPolicyMaxRetries`, so a literal migration silently drops today's `ON_FAILURE` / 10-retry behaviour.

**Current values to preserve** (identical across all eight `railway.json` files):

| Setting | Value |
|---|---|
| `healthcheckPath` | `/health` |
| `healthcheckTimeout` | `300` (equals Railway's default — no action needed) |
| `restartPolicyType` | `ON_FAILURE` |
| `restartPolicyMaxRetries` | `10` |

**Steps:**
1. Inventory exact service names and all variables per environment (dashboard export or the public API).
2. Resolve the restart-policy gap — ask Railway support whether IaC supports it, or accept setting it out-of-band.
3. Author `.railway/railway.ts` with `github("<org>/ecosistema-pxo", { rootDirectory: "apps/api-<x>" })` per service; use `preserve()` for secrets you don't want in the repo.
4. `railway config plan` against the **dev** environment first and read the whole diff before any apply. Never plan-free apply.
5. Decide how apply gets run after migration (manual step, or a CI job) since deploys no longer pick it up.
6. Delete the eight `railway.json` files only after a successful apply.
**Done when:** Every environment deploys from `.railway/railway.ts`, restart policy is accounted for, and the legacy files are gone.
**Docs:** [IaC](https://docs.railway.com/infrastructure-as-code) · [IaC reference](https://docs.railway.com/infrastructure-as-code/reference) · [Config as Code](https://docs.railway.com/config-as-code)

---

## 🟩 Tier 3 — Hygiene

### DEP-004 · Codify per-environment deploy settings for new services
**Type:** 🔐 Ops
**Effort:** 2 hours
**Why:** **New Railway services cannot opt into Config as Code.** Any service created from now on ignores its `railway.json` entirely — no healthcheck path, no restart policy — until DEP-003 lands. This is how the dev environment ended up with no healthcheck at all. The F&F environment will hit the same thing the day it's created.

Settings live on the *service instance*, meaning the (service × environment) pair — the API mutation takes both `serviceId` and `environmentId`. Setting them with production selected does nothing for QA.

**Steps:**
1. Write `scripts/railway-env-settings.sh`: takes an environment ID, loops the eight services, applies `healthcheckPath` / `restartPolicyType` / `restartPolicyMaxRetries` via `serviceInstanceUpdate`.
   - Endpoint `https://backboard.railway.com/graphql/v2`, header `Authorization: Bearer <token>`.
   - `mutation($s:String!,$e:String!,$i:ServiceInstanceUpdateInput!){serviceInstanceUpdate(serviceId:$s,environmentId:$e,input:$i)}`
   - `ServiceInstanceUpdateInput` also carries `rootDirectory`, `startCommand`, `buildCommand`, `numReplicas` — a fresh monorepo service needs `rootDirectory` set or it builds the wrong app.
2. Run it whenever an environment is created; retire it when DEP-003 lands.
**Done when:** Standing up a new environment is one scripted command, not 24 dashboard fields.

### DEP-005 · Make a dead service visible without reading deploy logs
**Type:** 🔍 Discovery + 🔐 Ops
**Effort:** Half a day
**Why:** Every API service crash-looped for **nine days** (2026-08-20 → 2026-08-31) and nothing surfaced it. With no healthcheck configured, Railway marked deploys green while the container was exiting 1 on a loop. It was found only because a deprecation notice prompted a manual look. Before real money flows through F&F, a dead service must announce itself.
**Steps:**
1. Confirm every service in every environment has a healthcheck configured (DEP-004 covers new ones).
2. Decide the alert channel — Railway's built-in deploy/crash notifications to Slack or email is the cheap first step.
3. Consider an external uptime ping against each `/health` (any free uptime monitor) so a dead service is caught even when nobody is deploying.
**Done when:** A service that stops answering `/health` produces a notification to a human within minutes, with no dashboard visit required.

### DEP-006 · Decide the build-trigger scope per service
**Type:** 🔐 Ops + 🔍 Discovery
**Effort:** 1-2 hours
**Why:** Railway's **Root Directory** setting doubles as the implicit change-trigger scope: a service with root `apps/api-kyc` only redeploys when files under that path change. In a monorepo where every service compiles `packages/shared`, that is wrong by construction — a shared-package fix is invisible to the very services that need it. This bit us on 2026-08-31 (see Resolved log): five of eight services silently skipped the fix that unbroke the fleet.

Root directory has been removed from all eight services, which restores correctness — every push to the branch now rebuilds everything. The open question is whether to keep that or trade it for precision:

| Option | Correct? | Cost |
|---|---|---|
| No root directory (current) | Yes — every service sees every change | Every push rebuilds all 8 APIs, including web-only commits |
| Explicit watch paths | Yes, **if** the pattern list is complete | Fewer builds; a missing entry silently reintroduces the 2026-08-31 failure |

**If watch paths are chosen**, the minimum per service is:
```
apps/api-<name>/**
packages/shared/**
pnpm-lock.yaml
turbo.json
```
**Do not** re-introduce root directory as a filtering mechanism — it changes the build context as well as the trigger scope, and the two are not separable.
**Done when:** The choice is deliberate and written down, and if watch paths are used, a `packages/shared` change is verified to trigger all eight services.
**Note:** DEP-003's IaC migration is the natural moment to settle this, since the trigger scope then lives in version control instead of eight dashboard forms.
### DEP-009 · Production was never configured for this version of the app
**Type:** 🔐 Ops
**Effort:** 2-3 hours, plus a redeploy of every frontend
**Why:** Nobody has looked at the production environments in 3+ months. The audit on 2026-09-02 (`railway variable list` and `vercel env ls` across every service, key names only) found that `dev` is the environment tracking this version of the app, and `prod` largely is not. **None of the values below are deliberate** — this is drift from inattention, not decisions.

**Railway — `pxo-ecosystem`, environment `prod`.** Counts exclude the 18 `RAILWAY_*` vars the platform injects. `PORT` is *not* a real gap: Railway supplies it at runtime rather than listing it, so its absence from all eight services is expected.

| Service | documented | in prod | gap |
|---|---|---|---|
| api-exchange | 43 | 18 | **26 missing** |
| api-pagos | 34 | 26 | 10 missing, 3 undocumented |
| api-orchestrator | 16 | 16 | 1 missing, 2 undocumented |
| api-auth | 12 | 10 | 1 missing |
| api-wallet | 14 | 14 | 1 undocumented |
| api-email / api-kyc / api-users | 11 / 7 / 7 | 10 / 6 / 6 | clean |

`api-exchange` is the serious one. Absent in prod: **the entire Bitso block** (`BITSO_API_KEY`, `BITSO_API_SECRET`, `BITSO_API_BASE_URL`, `BITSO_BUSINESS_CLABE`, `BITSO_BUSINESS_BENEFICIARY_NAME`, `BITSO_TICKER_BASE_URL`, `BITSO_USDC_CORRECTION_ENABLED`), the entire Conekta block, all three gas-subsidy caps, all three deposit-worker settings, `PRICE_PROVIDER`, and both `*_DEFAULT_TOKEN` vars. `dev` has 45 keys including all of Bitso. **The fiat rail is configured in dev and absent in prod.**

Also missing: `WEBHOOK_INBOUND_SECRET`, `WEBHOOK_OUTBOUND_SECRET`, `PAYMENT_TTL_MINUTES`, `PAYMENTS_CHAIN_ID` on api-pagos; `UPSTREAM_API_LEGACY` on api-orchestrator. Present in prod but undocumented: `WALLET_PRIVATE_KEY` on api-exchange, api-pagos and api-wallet (SL-003's plain-vs-encrypted question, still open), plus `BINANCE_API_KEY`, `ALLOWED_ORIGINS`, `PXO_TOKEN_ADDRESS_MAINNET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`.

**`FORCE_POLYGON_MAINNET`** is `true` on api-exchange and api-wallet but **absent on api-pagos**, which the pre-launch checklist requires across all three.

**Vercel — `ecosistema-pxo-web`, target production.** 12 vars set, 11 documented ones absent. Four (`NEXT_PUBLIC_*`) are Next.js leftovers surviving only as fallbacks in `EnvStatus.tsx:5-7`; delete them from `.env.example` rather than adding them. The seven real gaps:

```
VITE_POLYGON_PXO_RECEIVER_ADDRESS   <- routes production sales to 0x9f0f...8382 (SL-001)
VITE_CHAINS_ENVIRONMENT             <- defaults to "PROD" at useWalletStore.ts:111
VITE_MOCK_DEPOSITS_ENABLED
VITE_AUTO_RENEW_ON_ACTIVITY
VITE_JWT_EXPIRATION_TIME
VITE_SIGNATURE_TIMEOUT_SECONDS
VITE_BSC_PXO_RECEIVER_ADDRESS       <- BSC is out of scope per the chain decision; likely delete
```

**`VITE_*` is baked in at build time.** A missing var ships as `undefined` with no startup error, and setting one in the dashboard changes nothing until the project is **redeployed**. That is the mechanism behind SL-001.

`ecosistema-pxo-landing` and `ecosistema-pxo-pagos` have 9 and 12 production vars and **no `.env.example` to diff against**, so they are currently unauditable. Landing's prod config points at testnet (`VITE_PXO_TOKEN_ADDRESS_TESTNET`, `VITE_POLYGON_AMOY_PXO_RECEIVER_ADDRESS`, `VITE_ENABLE_ADMIN_TESTNET`) — confirm that is intended for a production landing page.

**One piece of good news.** The dangerous flags fail safe when unset: `MOCK_DEPOSITS_ENABLED` and `FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK` are both `=== 'true'` comparisons in `config/env.ts`, so absent means `false`. Production is not silently running in demo mode, and `NODE_ENV=production` is set everywhere. One behaviour *is* decided by omission: `PRICE_PROVIDER` defaults to `'binance'`, so prod prices off Binance rather than Bitso.

**Correction found while remediating (2026-09-02).** The `NEXT_PUBLIC_*` false positive applies to the **frontends only**. Node reads `process.env` with no prefix filtering, so on Railway the name is load-bearing: `api-auth/src/config/env.ts:6` and `api-email/src/config/env.ts:17` both read **`NEXT_PUBLIC_SUPABASE_URL`** as their `SUPABASE_URL`. Deleting it from Railway breaks authentication and email. An earlier draft of this item did not make that distinction and would have caused an outage.

Two other things surfaced during remediation:

- **`apps/landing`'s testnet-looking prod config is inert.** Eight of its nine Vercel vars are referenced nowhere in `apps/landing/src`; the app reads only `VITE_API_URL`. Delete them from Vercel rather than reasoning about them.
- **`BINANCE_API_KEY` is dead.** Set in Railway prod, read by no `api-*` service. The Binance ticker used for pricing is public and unauthenticated. Delete it.

**Steps:**
1. Set the seven real Vercel vars on `ecosistema-pxo-web` production, **then redeploy**. `VITE_POLYGON_PXO_RECEIVER_ADDRESS` first — that one is SL-001.
2. Copy the Bitso block from Railway `dev` to `prod` on api-exchange, using production Bitso credentials rather than stage. Add `BITSO_WEBHOOK_API_BASE_URL` and `BITSO_WEBHOOK_IP_ALLOWLIST` (`52.15.91.227,18.216.72.107,18.219.140.132`).
3. ~~Delete `BITSO_WEBHOOK_SECRET` from Railway `dev`.~~ **Done 2026-09-02**, verified absent.
4. ~~Decide Conekta.~~ **Removed entirely, 2026-09-02.** It had been dismissed on 2026-07-12 for chargeback risk, with the files kept "for grep recoverability" and the route left commented out at `index.ts:17`. That half-wired state is exactly what hid the Bitso webhook bug — the raw-body parser lived in `conekta.ts`, a route that was never registered, so it never applied anywhere. Deleted: `lib/conekta.ts`, `routes/webhooks/conekta.ts`, the commented import, the five `CONEKTA_*` config entries and their `.env.example` block. Railway held no `CONEKTA_*` vars in any environment. Recoverable from git history if card pay-in returns.
5. Fill the api-pagos and api-orchestrator gaps. ~~Add `FORCE_POLYGON_MAINNET=true` to api-pagos.~~ **Done 2026-09-02** with `--skip-deploys`, so it applies on the next deploy rather than forcing one now.

   **Still open here:** `WEBHOOK_INBOUND_SECRET`, `WEBHOOK_OUTBOUND_SECRET`, `PAYMENT_TTL_MINUTES` and `PAYMENTS_CHAIN_ID` on api-pagos; `UPSTREAM_API_LEGACY` on api-orchestrator. The two secrets need values.

   **Deliberately not done: deleting `BINANCE_API_KEY` from Railway prod.** It is dead config and should go, but `railway variable delete` has no `--skip-deploys` flag (only `set` does), so removing it forces a **production redeploy** of api-exchange. With DEP-001 and DEP-002 still open, that redeploy is the risk, not the variable. Fold it into the next intentional deploy.
6. ~~Add every undocumented prod var to the matching `.env.example` and to `ENV_MATRIX.md`, or delete it if dead.~~ **Done 2026-09-02.** `WALLET_PRIVATE_KEY` documented on api-exchange/api-pagos/api-wallet with a pointer to SL-003; `ALLOWED_ORIGINS` and `PXO_TOKEN_ADDRESS_MAINNET` on api-pagos; `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` on api-orchestrator. `BINANCE_API_KEY` documented as dead rather than required. Re-running the diff now leaves only that one entry, by design.
7. ~~Create `.env.example` for `apps/landing` and `apps/pagos`.~~ **Done 2026-09-02**, derived from what the code actually reads (`import.meta.env.*` grep), not from what happens to be set in Vercel. This surfaced that `apps/pagos` reads two vars that production does not set: `VITE_SIGNATURE_TIMEOUT_SECONDS`, and `VITE_PXO_TOKEN_ADDRESS_BSC` (BSC is out of scope — remove the code reference rather than setting the var).
8. Re-run the diffs until every service reads zero.

**Environment changes applied 2026-09-02:** `BITSO_WEBHOOK_SECRET` deleted from Railway dev; `FORCE_POLYGON_MAINNET=true` set on api-pagos prod (skip-deploys); the eight unused vars deleted from the `ecosistema-pxo-landing` Vercel project, which now carries only `VITE_API_URL`, matching its new `.env.example`.

**Also done 2026-09-02:** the dead `NEXT_PUBLIC_*` fallbacks were removed from `apps/web` — `EnvStatus.tsx` (which mislabelled its panel with variable names that do not exist), `KycDetailsModal.tsx`, and `authActions.ts` (where the effective fallback was always `window.location.host`) — together with the four `.env.example` entries.

**Blocked on values or decisions, not on work:** steps 1, 2, 4 and 5 need the controlled receiver wallet address, production Bitso credentials, a Conekta keep-or-delete call, and the api-pagos webhook secrets.
**Done when:** Every service and frontend project diffs clean against its `.env.example`, and `ENV_MATRIX.md` records the audit date.
**Watch for:** Two false positives will reappear on every future audit unless they stay written down — `PORT` on Railway, and `NEXT_PUBLIC_*` on Vercel. Both are noise.

### DEP-010 · `apps/api-exchange` has no ESLint config
**Type:** 🔧 Code
**Effort:** 30 minutes
**Why:** `pnpm --filter @pxo/api-exchange lint` exits 2 with *"ESLint couldn't find an eslint.config.(js|mjs|cjs) file"*. Five packages have one (`packages/config`, `apps/web`, `apps/landing`, `apps/api-pagos`, `apps/pagos`); api-exchange does not — so the service that moves money is the one with no lint gate, and a repo-wide `pnpm lint` fails there and masks whatever runs after it.
**Steps:** add `eslint.config.js` extending the shared config in `packages/config`, then triage what it surfaces.
**Done when:** `pnpm --filter @pxo/api-exchange lint` runs to completion.


### DEP-008 · Inventory third-party account ownership and write a contributor offboarding checklist
**Type:** 🔐 Ops + 📋 Docs
**Effort:** 3-4 hours
**Why:** DEP-007 happened because the domain's DNS lived in a departed developer's personal Vercel account, and nobody noticed until the site went down. Recovery depended entirely on his goodwill — he cooperated, but that was luck, not control. Nothing in the repo records who holds what outside it, so we have no way to know where else this is true. Infrastructure that lives outside version control sits outside every handover we have done.

The on-chain equivalent of this risk is already tracked as SL-009 / SL-010 in [BACKLOG.md](./BACKLOG.md) (contract admin roles possibly still held by the previous team). This item covers the off-chain half.

**Steps:**
1. Enumerate every third-party account the product depends on. For each, record: the owning entity (company vs. an individual's personal account), who has admin, who has billing, and whether MFA/recovery is company-controlled. At minimum — Hostinger (registrar), Vercel, Railway, Supabase, Google Workspace, thirdweb, Bitso, Conekta, the GitHub org, and any monitoring or email-sending vendor.
2. Flag every row where the owner is a person rather than the company, or where one individual is the only admin. Those are the DEP-007 shape.
3. Transfer ownership, or add a company-held admin, for each flagged row. Where a vendor supports only one owner, document the recovery path instead.
4. Write `docs/runbooks/offboarding.md`: what to run when anyone with access leaves — accounts to transfer, credentials to rotate, registrar/DNS/hosting to verify, on-chain roles to check.
5. Move credentials into a company password manager rather than individual ones.
**Done when:** A document in `docs/` lists every external dependency against a named company-held owner, no row depends solely on an individual, and the offboarding checklist exists and has been run once retroactively against the departed dev.
**Note:** Do this before any further contributor joins or leaves. The cost of the audit is a few hours; the cost of the next DEP-007 is however long it takes to find someone who has stopped answering.


---

## ✅ Resolved

### 2026-08-31 · Fleet-wide crash loop: `ERR_MODULE_NOT_FOUND` on `@pxo/shared`
**Symptom:** All eight API services failed deploy at `Network › Healthcheck` after the 300s timeout. Containers were exiting immediately with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/packages/shared/src/helpers/sanitize'
    imported from /app/packages/shared/src/helpers/index.ts
```
**Root cause:** `@pxo/shared` is consumed as raw TypeScript. Node's type-stripping doesn't rewrite import specifiers, and ESM requires explicit extensions, so the 30 extensionless relative imports inside the package were unresolvable. Commit `69442e5` (2026-08-20, "reinforced health check … + graceful shutdown") added `import { registerGracefulShutdown } from '@pxo/shared/helpers'` to all eight `index.ts` files — the first *runtime* import from the shared barrel. Everything before it was `import type`, which the compiler erases, so nothing had ever loaded that file at runtime.
**Why it went unnoticed for nine days:** No healthcheck was configured on these services, so Railway had nothing to gate on and reported every deploy as successful. Adding a healthcheck is what surfaced it.
**Fix:** `.ts` extensions on all 30 specifiers, plus `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` in the eight API tsconfigs (the second flag is what permits `.ts` specifiers alongside emit on TS 5.9). `.js` specifiers were tested first and rejected by Node — the file on disk is `.ts` and nothing rewrites the specifier.
**Verified:** all five runtime entry points (`helpers`, `consts`, `schemas/users`, `schemas/kyc`, `schemas/email`) load under plain `node`; `pnpm type-check` and `pnpm build` green 11/11; `api-exchange` and `api-orchestrator` built and booted via `node dist/index.js`, both answering `/health` with 200.
**Follow-ups:** DEP-001 (durable fix), DEP-002 (the enum trap this left behind), DEP-005 (why nobody noticed).

### 2026-08-31 · Five of eight services silently skipped the fix
**Symptom:** After pushing `a9c4b89` (the `@pxo/shared` fix), only api-orchestrator, api-exchange and api-auth redeployed. The other five showed no new deployment and kept running the pre-fix image — still crash-looping, but no longer reporting it, because nothing had redeployed to fail.
**Root cause:** Those five had **Root Directory** set to `apps/<service-name>`. In Railway that setting also scopes which file changes trigger a build, so a commit touching `packages/shared/**` didn't register as a change for them — despite their builds depending on that package. (The commit did also touch each service's own `tsconfig.json`, which sits outside `src`; the three unaffected services had no root directory set at all, matching the deploy log's `/app/apps/api-exchange` build context.)
**Fix:** Root directory removed from the five services; redeployed; all green.
**Follow-up:** DEP-006 — decide deliberately between "no root directory" (current, always correct, rebuilds everything) and explicit watch paths (cheaper, silently wrong if incomplete).

### 2026-08-31 · `type-check` scripts were silently no-ops
**Symptom:** `pnpm type-check` passed while the app had ~32 type errors.
**Root cause:** Two independent faults. `apps/web`, `apps/landing`, and `apps/pagos` had references-only root tsconfigs (`"files": []`), so plain `tsc --noEmit` compiled an empty file list; and `apps/web/src/components/CTAStrip.tsx` carried a JSX syntax error, which makes `tsc` report syntactic diagnostics and skip the semantic pass entirely — hiding every other error in the app.
**Fix:** scripts changed to `tsc --noEmit -p tsconfig.app.json` in the three affected apps; the stale duplicated `<div>` in CTAStrip removed; all 32 surfaced errors triaged and fixed (3 genuine bugs, 3 files with dead wiring, 24 unused declarations, 2 declaration-emit issues).
**Note:** ESLint is still red (~39 pre-existing errors, mostly `no-explicit-any`). Not deploy-scoped — belongs in the main backlog if it gets prioritised.
