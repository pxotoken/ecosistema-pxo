# Runbook — give production its own database

**Status:** Not started. Written 2026-09-04.
**Do not execute before the investor review on 2026-09-07.** See *Timing*.
**Owner:** Adrian (CTO)
**Tracked as:** DEP-011 in [DEPLOY_BACKLOG.md](../DEPLOY_BACKLOG.md)

---

## Why

`dev`, `qa` and **`prod` all point at the same Supabase instance** —
`fraczjfaqjalvzexzcsp.supabase.co`. Verified 2026-09-04 by reading
`NEXT_PUBLIC_SUPABASE_URL` from all three Railway environments.

There is one `users` table, one `deposit_intents`, one `trading_orders`. So:

- local development and QA write to the data production serves;
- a destructive dev migration destroys production;
- test accounts sit alongside real ones in the table the deposit matcher and
  KYC flows query;
- there is no environment in which it is safe to try something.

It also raises the likelihood of SL-016: the "someone registers one of those
five CLABEs" scenario is not limited to real customers, because dev and test
accounts live in the same `users` table.

## Timing

**Do not do this before Monday 2026-09-07.** Investors review the app that day.
This is a multi-day change with a real chance of leaving the app broken
mid-flight, and the shared instance has survived months — three more days
change nothing.

**Until then, one free mitigation:** tell the team not to run destructive work
against Supabase until after the review. Any dev writing this weekend lands in
the data the investors will see. That is a message, not a code change.

---

## Decide these before touching anything

**1. Copy the data, or start clean?**

Starting clean is simpler and probably correct — the beta has not begun, so
production holds test data, not customers. But confirm rather than assume:

```sql
select count(*) from users;
select count(*) from users where "CLABE" is not null;
select count(*) from kyc_submissions;
select count(*) from trading_orders;
select count(*) from deposit_intents where status <> 'EXPIRED';
```

If any of those represent real people or real money, this stops being a schema
exercise. In particular `kyc_submissions` and the `pxos-files` bucket hold
**identity documents** — copying personal data between systems is a decision
with legal weight, not an engineering convenience. Involve whoever owns that.

**2. Does anything depend on Supabase Auth, or only on the `users` table?**
Login is thirdweb-based, but confirm no Supabase Auth users need migrating
before assuming the table is the whole story.

**3. Which environment keeps the old instance?** Recommended: `dev` and `qa`
stay on `fraczjfaqjalvzexzcsp`, `prod` moves to the new one. That way the risky
change is confined to the environment you can verify, and dev keeps its history.

---

## Pre-flight inventory

**13 tables in use**, from `.from('…')` across the services:

```
api_logs          gas_subsidies     merchants     payments      pos_devices
pricing_rules     redemption_intents  deposit_intents  tokens   trading_orders
transactions      users             kyc_submissions
```

**One storage bucket:** `pxos-files` (KYC documents, referenced from
`KycDetailsModal.tsx`).

**Schema lives in four places with colliding numbering.** This is the part most
likely to go wrong, so the order below is explicit.

| File | Adds |
|---|---|
| `db/migrations/000_initial_schema.sql` | the superset — 14 tables incl. `users`, `payments`, `merchants`, `pos_devices`, `kyc_submissions`, plus `updated_at` triggers |
| `db/migrations/001_payments_direction.sql` | indexes only |
| `db/migrations/002_clabe_unique_index.sql` | unique index on `users."CLABE"` |
| `apps/api-exchange/migrations/001_fiat_extensions.sql` | `redemption_intents` (**not** in 000) |
| `apps/api-exchange/migrations/002_deposit_intents.sql` | `deposit_intents` (**not** in 000) |
| `apps/api-kyc/migrations/002_kyc_submissions_rls.sql` | RLS policies for `kyc_submissions` |
| `apps/api-pagos/database/{merchants,payments}.sql` | `merchants`, `pos_devices`, `payments` — **already in 000** |

### Two ambiguities to resolve before applying

- **`apps/api-kyc/` has three files that each create `kyc_submissions`** —
  `001_kyc_submissions.sql` (34 lines), `002_kyc_submissions_rls.sql` (103,
  5 RLS statements) and `_apply_in_supabase.sql` (81, 4 RLS statements). All
  three differ (distinct checksums). Diff them and decide which is
  authoritative **before** applying; do not apply all three and hope
  `IF NOT EXISTS` sorts it out, because the RLS policies differ and the last
  one applied wins.
- **`apps/api-pagos/database/*.sql` redefine tables that `000` already
  creates.** Diff the column lists. If they match, skip them. If pagos' are
  newer, `000` is stale and that needs settling rather than papering over.

### Recommended apply order

```
1. db/migrations/000_initial_schema.sql
2. db/migrations/001_payments_direction.sql
3. db/migrations/002_clabe_unique_index.sql
4. apps/api-exchange/migrations/001_fiat_extensions.sql
5. apps/api-exchange/migrations/002_deposit_intents.sql
6. the authoritative api-kyc file (see above)
7. api-pagos files — only if the diff shows they add something
```

Apply to a **scratch Supabase project first**, not to the new prod one. Getting
a clean run on a throwaway is what tells you the order is right.

---

## Cutover

Every place a Supabase credential lives. Confirmed 2026-09-04.

**Railway — 8 services, `prod` environment only.** Each has exactly two:

```
NEXT_PUBLIC_SUPABASE_URL     ← yes, the NEXT_PUBLIC_ name is load-bearing on the
SUPABASE_SECRET_KEY            backend; Node does not prefix-filter process.env
```

Services: `api-auth`, `api-email`, `api-exchange`, `api-kyc`,
`api-orchestrator`, `api-pagos`, `api-users`, `api-wallet`.

**Vercel — `ecosistema-pxo-web` production only:**

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

`ecosistema-pxo-landing` and `ecosistema-pxo-pagos` hold no Supabase vars.

### The trap

**On this Railway project, setting a variable does not apply it.** Established
2026-09-03. `--skip-deploys` stores only; without it there is still no
auto-deploy; `railway restart` reuses the deployment's env snapshot; re-setting
an unchanged value is a no-op. What applies it is a real deployment, or forcing
one:

```
railway api 'mutation { serviceInstanceRedeploy(serviceId: "<id>", environmentId: "<envId>") }'
```

Service ids: query `project(id:…){ services{ edges{ node{ id name } } } }`.
Prod environment id: `70425d32-201b-4055-a4b0-1666bd2517ec`.

**Verify from the running service, never from the variable list.** A stored
value proves nothing about the container.

Vercel is the mirror image: `VITE_*` values are baked in at build time, so
setting them changes nothing until the project is **redeployed**.

### Order of operations

1. Put the app in a state where nobody is transacting. Disable the deposit
   worker (`DEPOSIT_MATCH_WORKER_ENABLED=false`) if it has been re-enabled by
   then.
2. Apply the schema to the new instance and verify it independently.
3. Create the `pxos-files` bucket with the same access policy as the original.
4. Migrate data, if that was the decision.
5. Update the 16 Railway variables, then force a redeploy per service.
6. Update the 2 Vercel variables, then redeploy `ecosistema-pxo-web`.
7. Verify (below).
8. Only once verified: revoke or rotate the old instance's keys in prod so
   nothing can silently fall back.

---

## Verification

Do not accept a green deploy as evidence — that is what hid the nine-day
crash loop in DEP-005.

```sh
# every service healthy
for s in auth email exchange kyc orchestrator pagos users wallet; do
  curl -s -o /dev/null -w "$s %{http_code}\n" https://pxoapi-$s-prod.up.railway.app/health
done

# each service is talking to the NEW instance
railway variable list -s @pxo/<svc> -e prod -p <proj> --kv | grep NEXT_PUBLIC_SUPABASE_URL

# and no service logs a Supabase error on boot
railway logs -s @pxo/<svc> -e prod -p <proj> --lines 60 | grep -iE "supabase|error"
```

Then exercise the paths that actually touch the database:

- log in through `https://pxotoken.com` (writes/reads `users`)
- open the admin Wallet Status view (reads balances + `tokens`)
- submit a KYC document (writes `kyc_submissions` **and** the `pxos-files`
  bucket — the bucket is the half most likely to be forgotten)
- create a deposit intent and confirm the row lands in the new instance

## Rollback

Point the 16 Railway variables and 2 Vercel variables back at
`fraczjfaqjalvzexzcsp`, force redeploys, redeploy web. Keep the old instance
untouched and its keys valid until the new one has been verified under real
use — a rollback that requires restoring a backup is not a rollback.

## After

- Give `dev` and `qa` their own instances too, so the same class of accident
  cannot recur between those two.
- Consolidate the four migration locations into one ordered directory. The
  ambiguity documented above is a defect in its own right; the next person will
  not have this runbook.
- Record the new instance in `ENV_MATRIX.md` and note which environment uses
  which.
