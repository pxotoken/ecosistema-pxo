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
