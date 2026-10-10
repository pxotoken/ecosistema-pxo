# Runbook — close the gateway bypass, phase 1 (five services)

**Status:** Not started. Written 2026-10-10.
**Owner:** Adrian (CTO)
**Tracked as:** [SL-021](../BACKLOG.md) phase 1
**Rehearsed:** yes — the whole procedure was run end to end in the Railway `dev`
environment on 2026-10-05, including the domain deletion.

---

## What this does

Puts `api-users`, `api-kyc`, `api-wallet`, `api-auth` and `api-email` behind
Railway's private network and removes their public hostnames, so the only way to
reach them is through `api-orchestrator`. Today each answers the open internet,
and each trusts the `x-pxo-wallet-address` header the gateway injects — so a
request with that header and no JWT is accepted as that user, and `requireAdmin`
reads the same header.

## What this does NOT cover

**`api-exchange` and `api-pagos` are deliberately excluded.** Their public
hostnames serve endpoints that are legitimately public and authenticate
themselves — the Bitso withdrawal webhook by RSA signature plus IP allowlist,
and `api-pagos` by merchant API key. Removing those domains would strand SPEI
withdrawals in `spei_pending`, because the webhook is the only thing that marks
a payout complete. See SL-021 phase 2: those two need the gateway-secret
variant, not domain removal.

The orchestrator keeps its public domain. That is the front door.

---

## The rule that bit us, twice

**Setting a Railway variable does not apply it.** Only a real deployment does,
or forcing one with `serviceInstanceRedeploy`. Verify from the running service,
never from the variable list.

**Railway's private network is IPv6-only.** A service bound to `0.0.0.0` is
unreachable at `*.railway.internal`. This is why step 1 exists.

**Railway injects `PORT=8080` at runtime.** The per-service defaults in
`config/env.ts` (3001-3008) apply only to local development. The first rehearsal
used them and every proxied route returned
`FST_REPLY_FROM_INTERNAL_SERVER_ERROR`. The internal URLs below use `:8080`.

---

## Preconditions

- [ ] **`42ae71b` is on `main`** (`fix(services): bind :: so Railway private
      networking can reach them`). Prod deploys from `main`. Without it the code
      default stays `0.0.0.0`, so deleting the `HOST` variable later silently
      re-breaks private networking. The variable set in step 1 makes it work
      either way; this is about not leaving a trap.
- [ ] Railway CLI authenticated as an account with access to `pxo-ecosystem`:
      `railway whoami`
- [ ] A quiet window. Steps 2-3 restart every API service; expect a short
      interruption for anyone using the app.

### Identifiers

```sh
PROJ=0a008982-8223-4ad2-b434-790b5fa2f302   # pxo-ecosystem
PROD=70425d32-201b-4055-a4b0-1666bd2517ec   # prod environment
```

| Service | Service id | Public domain id (prod) |
|---|---|---|
| api-users | `d209b6aa-522a-47f1-8581-98434c0a2df0` | `0561ec52-d261-44fd-bbc7-92488dc6c233` |
| api-kyc | `5298c02d-7010-401e-b589-fa7a41c7d15b` | `f7623671-d7ee-4f75-bc24-df01c06a4798` |
| api-wallet | `36493a03-8f07-497e-a905-c90aa121defa` | `90e0d35c-3b5b-4e4a-912c-ea613f29c4e4` |
| api-auth | `2df84518-9a57-4c0f-a4bc-e116c50cb483` | `0fa4bbe9-9826-4ce8-bd70-6f5116e1793d` |
| api-email | `f28c4359-dea6-41a6-8a62-4dc5d17ca06b` | `f592e65e-48f9-478f-81ac-a34520a487e6` |
| api-exchange | `3668d490-c2f1-41d4-a26a-e1723d2304e0` | *(phase 2 — leave alone)* |
| api-pagos | `6410b452-d300-4ab8-9e25-6593d0f5d6de` | *(phase 2 — leave alone)* |
| api-orchestrator | `a9d10217-215e-4592-8a88-b552f9af104b` | *(keep — the front door)* |

Domain ids were read on 2026-10-10 and none of the five had a custom domain.
Re-read them before step 4 if time has passed:

```sh
railway api "query { domains(projectId: \"$PROJ\", environmentId: \"$PROD\", serviceId: \"<SERVICE_ID>\") { serviceDomains { id domain } customDomains { id domain } } }"
```

---

## Step 0 — baseline

Record what "working" looks like, so step 3 has something to compare against.

```sh
O=https://pxoapi-orchestrator-prod.up.railway.app
for p in /health /api/exchange/tokens /api/exchange/liquidity; do
  printf "%-28s " "$p"; curl -s -m 20 -o /dev/null -w "%{http_code}\n" "$O$p"
done
```

Expect `200`, `200`, `200`. Also confirm the bypass is open, so you can prove it
closed later — `0x…dEaD` is the burn address, so no real account is touched:

```sh
curl -s -m 15 -w "\n%{http_code}\n" \
  -H "x-pxo-wallet-address: 0x000000000000000000000000000000000000dEaD" \
  https://pxoapi-users-prod.up.railway.app/api/users/me
```

Expect `{"error":"User not found"}` and `404` — the app's own reply, meaning the
request cleared authentication.

---

## Step 1 — bind IPv6 on all eight services

Includes `api-exchange`, `api-pagos` and the orchestrator: `::` is dual-stack, so
this is harmless for the services staying public, and it keeps the environment
uniform for phase 2.

```sh
for SID in \
  d209b6aa-522a-47f1-8581-98434c0a2df0 \
  5298c02d-7010-401e-b589-fa7a41c7d15b \
  36493a03-8f07-497e-a905-c90aa121defa \
  2df84518-9a57-4c0f-a4bc-e116c50cb483 \
  f28c4359-dea6-41a6-8a62-4dc5d17ca06b \
  3668d490-c2f1-41d4-a26a-e1723d2304e0 \
  6410b452-d300-4ab8-9e25-6593d0f5d6de \
  a9d10217-215e-4592-8a88-b552f9af104b ; do
  railway api "mutation { variableUpsert(input: { projectId: \"$PROJ\", environmentId: \"$PROD\", serviceId: \"$SID\", name: \"HOST\", value: \"::\" }) }"
done
```

Each call should return `{"data":{"variableUpsert":true}}`.

## Step 2 — point the orchestrator at internal DNS

All seven upstreams, including the two staying public — internal routing is
correct for them too; what phase 2 changes is how their *public* routes are
guarded, not how the gateway reaches them.

```sh
ORCH=a9d10217-215e-4592-8a88-b552f9af104b
for PAIR in \
  UPSTREAM_API_AUTH:pxoapi-auth \
  UPSTREAM_API_EMAIL:pxoapi-email \
  UPSTREAM_API_PAGOS:pxoapi-pagos \
  UPSTREAM_API_USERS:pxoapi-users \
  UPSTREAM_API_KYC:pxoapi-kyc \
  UPSTREAM_API_WALLET:pxoapi-wallet \
  UPSTREAM_API_EXCHANGE:pxoapi-exchange ; do
  VAR=${PAIR%%:*}; HOSTN=${PAIR#*:}
  railway api "mutation { variableUpsert(input: { projectId: \"$PROJ\", environmentId: \"$PROD\", serviceId: \"$ORCH\", name: \"$VAR\", value: \"http://$HOSTN.railway.internal:8080\" }) }"
done
```

Note the hostnames have **no `-prod` suffix** — private DNS is scoped to the
environment, so the same name resolves differently per environment.

## Step 3 — redeploy, upstreams first

Upstreams before the gateway, so the gateway never points at a service that has
not yet rebound to IPv6.

```sh
for SID in \
  d209b6aa-522a-47f1-8581-98434c0a2df0 \
  5298c02d-7010-401e-b589-fa7a41c7d15b \
  36493a03-8f07-497e-a905-c90aa121defa \
  2df84518-9a57-4c0f-a4bc-e116c50cb483 \
  f28c4359-dea6-41a6-8a62-4dc5d17ca06b \
  3668d490-c2f1-41d4-a26a-e1723d2304e0 \
  6410b452-d300-4ab8-9e25-6593d0f5d6de ; do
  railway api "mutation { serviceInstanceRedeploy(serviceId: \"$SID\", environmentId: \"$PROD\") }"
done
```

Wait until they are back up, then confirm one actually rebound — this is the
check that catches a silent failure:

```sh
# Expect: Server listening at http://[::]:8080
railway logs --service @pxo/api-users --environment prod | grep -i listening | tail -1
```

Then the gateway:

```sh
railway api "mutation { serviceInstanceRedeploy(serviceId: \"$ORCH\", environmentId: \"$PROD\") }"
```

### Verify before going further

```sh
curl -s https://pxoapi-orchestrator-prod.up.railway.app/health | python3 -m json.tool
```

Every upstream must read `http://pxoapi-<svc>.railway.internal:8080`. Then
re-run the step 0 canaries — all three must match the baseline. Log in to
pxotoken.com and load the wallet screen.

**If the canaries fail**, private networking is not working. Do not continue to
step 4 — the public domains are still in place, so reverting step 2 to the
`https://pxoapi-<svc>-prod.up.railway.app` values and redeploying the
orchestrator restores service immediately.

---

## Step 4 — remove the five public domains

**This is the step that actually closes the bypass, and the only one that is not
cleanly reversible:** a re-created Railway service domain may not get the same
hostname back. Do it only once step 3 verifies clean.

```sh
for DOMID in \
  0561ec52-d261-44fd-bbc7-92488dc6c233 \
  f7623671-d7ee-4f75-bc24-df01c06a4798 \
  90e0d35c-3b5b-4e4a-912c-ea613f29c4e4 \
  0fa4bbe9-9826-4ce8-bd70-6f5116e1793d \
  f592e65e-48f9-478f-81ac-a34520a487e6 ; do
  railway api "mutation { serviceDomainDelete(id: \"$DOMID\") }"
done
```

---

## Verification

**1. The bypass is closed.**

```sh
curl -s -m 15 -w "\n%{http_code}\n" \
  -H "x-pxo-wallet-address: 0x000000000000000000000000000000000000dEaD" \
  https://pxoapi-users-prod.up.railway.app/api/users/me
```

Expect Railway's edge `404` with `{"status":"error","code":404,"message":"Application not found"}`.
The distinction matters: the app's own `{"error":"User not found"}` would mean it
is still reachable.

**2. The gateway still reaches the service.** A 401 from the orchestrator's own
`requireAuth` proves nothing, so use the cron route, which proxies *without*
gateway auth:

```sh
curl -s -m 20 https://pxoapi-orchestrator-prod.up.railway.app/api/users/cron/supabase-keepalive
```

Expect api-users' **own** error:
`{"success":false,"error":"Missing authentication token. Provide x-cron-secret header or Bearer token"}`.
That reply can only come from the service, so the internal hop worked.

**3. The app works.** Log in at pxotoken.com, load the wallet, open Settings
(exercises api-users and api-kyc), and confirm balances render.

---

## Rollback

- **Before step 4:** set the seven `UPSTREAM_API_*` back to
  `https://pxoapi-<svc>-prod.up.railway.app` and redeploy the orchestrator.
- **After step 4:** re-create the service domain in the Railway dashboard
  (Service → Settings → Networking → Generate Domain), then point the
  orchestrator back at it. **The hostname may differ**, so update the matching
  `UPSTREAM_API_*` to whatever is generated.
- `HOST=::` never needs reverting; it is correct in both topologies.

---

## Notes

- Checked 2026-10-10: **no Vercel cron is scheduled.** Vercel cron jobs are
  declared in `vercel.json` and there is no `crons` key anywhere in the repo, so
  nothing external is calling `/api/users/cron/*`. That is why removing
  api-users' public domain is safe — and separately, it means the Supabase
  keepalive the endpoint exists for is not running at all.
- Railway log retention had already expired for the week-old prod deployments
  when this was written, so "no requests in the logs" could not be used as
  evidence either way. The `vercel.json` check above is what settles it.
- After this lands, SL-021's remaining exposure is `api-exchange` and
  `api-pagos` (phase 2) and the forgeable identity header itself (phase 3).
