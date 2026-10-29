# Runbook — turning on PXO minting and the deposit matcher

**Status:** code is written, tested and merged to `dev`. Nothing is enabled.
**Written:** 2026-09-04.
**Pick this up after** the CEO has run `addMinter` — see
[grant-minter-role.md](./grant-minter-role.md).

Two independent switches. Neither is on. Each can be turned on without the
other, and each is reversible.

---

## Before anything: the rule that bit us twice this week

**On this Railway project, setting a variable does not apply it.**
`--skip-deploys` stores it; without the flag there is still no auto-deploy;
`railway restart` reuses the deployment's env snapshot; re-setting an unchanged
value is a no-op. Only a real deployment applies it, or forcing one:

```sh
SVC=$(railway api 'query { project(id: "0a008982-8223-4ad2-b434-790b5fa2f302") {
  services { edges { node { id name } } } } }' \
  | python3 -c "import sys,json;raw=sys.stdin.read();i=raw.find('{');d,_=json.JSONDecoder().raw_decode(raw[i:]);
[print(e['node']['id']) for e in d['data']['project']['services']['edges'] if e['node']['name'].endswith('api-exchange')]")

railway api "mutation { serviceInstanceRedeploy(serviceId: \"$SVC\",
  environmentId: \"70425d32-201b-4055-a4b0-1666bd2517ec\") }"
```

**Verify from the running service, never from the variable list.** A stored
value proves nothing about the container.

---

# Part 1 — PXO minting

## What is already true

`sendPXOToUser()` — the single path both the crypto buy (`routes/buy-pxo.ts`)
and the SPEI buy (the deposit worker) use — now decides between moving existing
balance and creating supply:

| `PXO_ISSUANCE_MODE` | behaviour |
|---|---|
| unset (or `auto`) | transfer when the operational wallet covers the whole order; mint otherwise; refuse if it cannot do either |
| `transfer` | move balance only, never create supply |
| `mint` | always create |

Two properties worth knowing before you rely on it:

- **The minter role is read from the chain, not from config.** `isMinter()` is
  checked against the PXO contract and cached for 60 seconds. So the moment the
  CEO's `addMinter` transaction confirms, minting starts working **on its own —
  no deploy, no env change**, within about a minute.
- **Until then `auto` degrades, it does not fail.** Orders the wallet can cover
  are served by transfer exactly as today. Only an order larger than the balance
  is refused, with a message naming the shortfall and the missing role.

So **there is nothing to enable for minting.** `PXO_ISSUANCE_MODE` is unset in
prod, which is `auto`, which is what you want. The env var exists to *override*.

## Confirm the role landed

```sh
curl -s -X POST https://polygon-bor-rpc.publicnode.com \
  -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call",
  "params":[{"to":"0xd6f9c21a585e2d77b62ec8c65ab9bec70e2b77d7",
  "data":"0xaa271e1a0000000000000000000000009f0f2eac50ad04d37d3bf3359735928126ac8382"},"latest"]}'
```

`…0001` = granted. `…0000` = not granted.

## Then verify the app actually mints

The honest test is a real purchase for **more PXO than the wallet holds**, so
the mint branch is exercised rather than the transfer branch. The wallet held
9.44 PXO on 2026-09-04, so an order of, say, 20 PXO forces a mint.

```sh
# supply before
curl -s -X POST https://polygon-bor-rpc.publicnode.com -H 'content-type: application/json' \
 -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0xd6f9c21a585e2d77b62ec8c65ab9bec70e2b77d7","data":"0x18160ddd"},"latest"]}'
```

Place the order, then read supply again. It should increase by exactly the
order amount, and the app log line should say `PXO minted to the buyer`.

If the wallet **can** cover the order, supply must **not** change — that is the
`auto` mode working correctly, not a failure.

## Rolling back

`PXO_ISSUANCE_MODE=transfer` + forced redeploy stops all minting immediately
regardless of the on-chain role. The CEO revoking with `removeMinter` also
works and takes effect within the 60-second cache window.

## What backs minted PXO

A USDC/USDT purchase creates PXO backed, at that moment, by the stablecoin
received. **The CFO converts it** — selling the USDC/USDT on Bitso for MXN so
the reserve ends up in pesos. That is manual, and owned by the CFO along with
reconciling `unmatched_fundings`. Automation is tracked as PL-008.

Two consequences to keep in view while it is manual:

1. **The conversion is not instantaneous, so the treasury carries FX exposure
   between the mint and the sale.** PXO is minted against an MXN price quoted
   at purchase, but the pesos are realised when the CFO sells. If USDC/MXN
   moves in between, the reserve ends up slightly over- or under-funded per
   trade. Negligible at beta volumes, and nothing currently measures it.
2. **Supply only grows.** There is no burn-on-redemption, and the contract has
   no `burnFrom` — redemption must be transfer-to-treasury then `burn(uint256)`.
   The CFO conversion fixes *what backs* the supply, not that it keeps rising.

---

# Part 2 — the deposit matcher

## What changed

The matcher used to pair a Bitso funding to a deposit intent on **sender CLABE
alone** — no amount check, no date check (SL-016). It now requires all of:

- the sender's CLABE is registered to a user;
- that user has a `PENDING` intent with that `source_clabe`;
- **the intent was created before the money arrived**;
- **the amounts are equal to the cent.**

Anything failing a condition is written once to `unmatched_fundings` with a
reason, instead of being re-logged every 30 seconds and lost on restart.

The chronology rule is why this is safe to turn on: a deposit cannot pay for an
intent that did not exist when it landed, so the nine historical fundings
(1,780,207.50 MXN, Feb–Mar 2026) can never match anything, whoever registers
those CLABEs later.

## Enabling, in order

**1. Apply the migration.** `apps/api-exchange/migrations/003_unmatched_fundings.sql`,
via the Supabase SQL editor.

Note this lands on the **shared** instance — prod has no database of its own
until DEP-011. It is additive (one new table, three indexes) so dev and qa are
unaffected beyond gaining the table.

Without it the matcher still behaves correctly; it just warns that it could not
record. So this is not a hard prerequisite, only a strongly advisable one.

**2. Flip the flag and force a redeploy.**

```sh
railway variable set DEPOSIT_MATCH_WORKER_ENABLED=true \
  --service @pxo/api-exchange --environment prod \
  --project 0a008982-8223-4ad2-b434-790b5fa2f302 --skip-deploys
# then the serviceInstanceRedeploy mutation at the top of this document
```

**3. Confirm from the logs, not the variable.**

```sh
railway logs --service @pxo/api-exchange --environment prod \
  --project 0a008982-8223-4ad2-b434-790b5fa2f302 --lines 40
```

You want `deposit-matching-worker: started`, and you want **no**
`sender_clabe not registered` spam — those now go to the table instead.

**4. Check the reconciliation table caught the history.**

```sql
select reason, count(*), sum(amount) from unmatched_fundings
where resolved_at is null group by reason order by 3 desc;
```

Expect the nine fundings under `clabe_not_registered`, totalling
1,780,207.50 MXN. That is the correct outcome: they are recorded, visible, and
unmatched.

**5. Nothing should have been fulfilled.**

```sql
select count(*) from deposit_intents
where status <> 'PENDING' and updated_at > now() - interval '1 hour';
```

Zero, unless somebody genuinely bought something.

## Rolling back

`DEPOSIT_MATCH_WORKER_ENABLED=false` + forced redeploy. The table can stay; it
is inert when the worker is off.

## Still open

Reconciling the nine fundings themselves — 1.78M MXN that arrived in the
treasury's Bitso account and which nothing in this system accounts for. Sent to
the team 2026-09-04. Recording them is not the same as explaining them.
