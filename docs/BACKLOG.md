# PXO Backlog — Working Doc

**Status:** Draft for CTO review, 2026-06-25
**Audience:** Adrian (CTO), CEO updates, future contributors
**Source documents:** [MONEY_MECHANICS.md](./MONEY_MECHANICS.md), [ENV_MATRIX.md](./ENV_MATRIX.md), [MULTICHAIN_EXPANSION_DECISION.md](./MULTICHAIN_EXPANSION_DECISION.md)
**Sibling backlog:** deploy, hosting, and build-pipeline items live in [DEPLOY_BACKLOG.md](./DEPLOY_BACKLOG.md)

---

## How to read this

This is **not** a roadmap. It's a prioritized working list with three tiers:

- **🟥 Tier 1 — Soft-launch blockers.** Must be done before any friends-and-family soft launch. If a real user touches the app and one of these isn't done, something will break or be unsafe.
- **🟧 Tier 2 — Pre-official-launch.** Needed before an external/marketed launch. Compliance, audit, operational hygiene, finishing the look update.
- **🟩 Tier 3 — Post-launch.** Worth doing eventually. None of these block users today.

Each task is marked with type:

- 🔧 **Code** — I can help write/edit
- 🔍 **Discovery** — research, can mostly do together
- 📞 **External** — Adrian alone (Bitso call, find old team, legal)
- 📋 **Docs** — I can draft, Adrian validates
- 🔐 **Ops** — env vars, secrets, wallets — Adrian's hands only

**Effort estimates** are calibrated to a solo CTO with AI assistance, in focused-hours (not calendar days).

---

## Soft Launch Readiness Checklist

The Tier 1 items, as a single scannable list. When all checked, F&F launch is safe.

- [ ] **SL-001** — Identify owner of `0x9f0f…8382` and recover any orphaned PXO
- [ ] **SL-002** — Set `POLYGON_PXO_RECEIVER_ADDRESS` in Railway api-exchange
- [ ] **SL-003** — Resolve treasury wallet key model (plain vs encrypted) on Railway
- [ ] **SL-004** — Reconcile env vars across all Railway services against `ENV_MATRIX.md`
- [ ] **SL-005** — Add USDT to admin Wallet Status view
- [ ] **SL-006** — Document the treasury wallet identity (TREASURY.md)
- [ ] **SL-007** — Smoke-test BUY and SELL end-to-end on Polygon mainnet with a single test wallet
- [ ] **SL-008** — Define soft-launch communication: scope, known limitations, what testers can/can't do
- [ ] **SL-009** — Verify PXO contract source against deployed bytecode + document admin roles
- [ ] **SL-010** — *(conditional on SL-009)* Plan admin key rotation if previous team retains control
- [ ] **SL-011** — Wallet-chain mismatch protection (block/redirect on wrong network)

---

## 🟥 Tier 1 — Soft-launch blockers

### SL-001 · Identify `0x9f0f…8382` and recover any orphaned PXO
**Type:** 🔍 Discovery + 🔐 Ops
**Effort:** 1-3 hours
**Why:** Frontend has been telling users to send PXO to this hardcoded address since at least the Bitso branch. Unknown if any test PXO is sitting there or if anyone controls the keys.
**Steps:**
1. Check https://polygonscan.com/address/0x9f0f2eac50ad04d37d3bf3359735928126ac8382 — list PXO balance and inbound transactions
2. Check if it matches the treasury hot wallet (derive from `WALLET_PRIVATE_KEY_ENCRYPTED`)
3. Check if it appears in any team password manager or old wallet exports
4. If orphaned: decide remediation (write off, attempt recovery via prior team contacts)
**Done when:** The address is named in `TREASURY.md` (or `INCIDENTS.md` if orphaned), and any recoverable PXO is moved to a known wallet.

### SL-002 · Set `POLYGON_PXO_RECEIVER_ADDRESS` in Railway api-exchange
**Type:** 🔐 Ops
**Effort:** 15 minutes (after SL-001 resolves what the value should be)
**Why:** Without this env var, the backend rejects every mainnet SELL with HTTP 500. SL-001 determines what the correct address should be.
**Blocked by:** SL-001
**Done when:** Env is set, a test SELL succeeds end-to-end on mainnet.

### SL-003 · Resolve treasury wallet key model on Railway
**Type:** 🔐 Ops + 🔍 Discovery
**Effort:** 1-2 hours
**Why:** Railway api-exchange has BOTH `WALLET_PRIVATE_KEY` (plain) and `WALLET_PRIVATE_KEY_ENCRYPTED`+`ENCRYPTER_PRIVATE_KEY`. Code accepts either. This is a security smell — confirm which is canonical, delete the other.
**Steps:**
1. Read `apps/api-exchange/src/lib/wallet-key.ts` (or equivalent) to confirm precedence logic
2. Decide canonical: encrypted (recommended) or plain
3. Verify the encrypted pair actually decrypts to the same key as plain
4. Remove the non-canonical from Railway
**Done when:** Exactly one wallet-key mechanism is in Railway env, documented in `TREASURY.md`.

### SL-004 · Reconcile env vars across all Railway services
**Type:** 🔐 Ops + 🔍 Discovery
**Effort:** 3-4 hours
**Why:** The api-exchange diff already surfaced 9+ missing env vars (Bitso/Conekta block, gas subsidy caps). Other api-* services are not yet diffed. Each missing env is a silent failure waiting to happen.
**Steps:**
1. Use the diff commands documented in `ENV_MATRIX.md` against each Railway service: api-auth, api-email, api-kyc, api-orchestrator, api-pagos, api-users, api-wallet
2. For each gap: classify as missing (set it), undocumented (add to `.env.example`), dead (remove)
3. Specifically verify `FIAT_DEMO_SKIP_BITSO_FUNDING_CHECK` value per environment
**Done when:** Each api-* service has a zero diff between Railway and its `.env.example`.

### SL-005 · Add USDT to admin Wallet Status view
**Type:** 🔧 Code
**Effort:** 2-3 hours
**Why:** Admin can see PXO + USDC balances but not USDT in treasury. The buy flow accepts USDT, so we're operating blind to where a portion of inflows sits.
**Steps:**
1. Add USDT contract reads to `apps/api-wallet/src/routes/admin/status.ts` (USDT addresses already in `api-exchange/src/config/chains.ts`)
2. Update `WalletStatusPage.tsx` to render the USDT card alongside USDC
3. Visual smoke test
**Done when:** Admin sees four asset rows per chain: native, PXO, USDC, USDT.

### SL-006 · Document the treasury wallet identity (TREASURY.md)
**Type:** 📋 Docs (Claude-drafted, Adrian-validated)
**Effort:** 1-2 hours
**Why:** When the CEO or an investor asks "where's the money", you point at this doc. Today there's nothing to point at.
**Content:**
- Treasury hot wallet: address, Polygonscan link, key custody model
- Cold reserve wallet: address, custody, multisig status (or note that it's TBD per Tier 2)
- PXO Receiver Address: address, who it should be after SL-002
- Off-chain escrow: bank, instruments, attestation/audit cadence
- Rebalance SOPs (manual today): who triggers, who approves, what's logged
**Done when:** File exists in `docs/`, named addresses, links to Polygonscan/escrow records, sign-off from Adrian.

### SL-007 · Smoke-test BUY and SELL on Polygon mainnet
**Type:** 🔧 Code + 🔐 Ops
**Effort:** 2-3 hours
**Why:** Right now no human knows for a fact whether mainnet BUY works end-to-end (SL-001/002 confirms SELL is broken). Find out before a user does.
**Steps:**
1. Use a controlled test wallet with small balances (10 USDT, 10 USDC, a few PXO)
2. Execute one BUY with USDT, one BUY with USDC, one SELL
3. Confirm each step (on-chain tx, backend log, admin view updates, user balance updates)
4. Document the run in `docs/runbooks/mainnet-smoke-test.md`
**Done when:** All three flows complete successfully; runbook exists; any anomalies are filed as new backlog items.

### SL-008 · Soft-launch communication brief
**Type:** 📋 Docs
**Effort:** 1-2 hours
**Why:** F&F testers need to know what works, what's manual, what's deferred. Setting expectations is cheaper than handling surprises.
**Content:**
- What works: BUY with crypto, BUY with MXN, SELL with crypto, view balances
- Manual: SELL to MXN (SPEI), admin treasury operations, reserve refills
- Known limits: Polygon only; ~100 PXO supply for testing; MGUSD placeholder
- Reporting: how testers report bugs (Slack channel? email? form?)
- Boundaries: what testers should NOT do (move large amounts, share access, etc.)
**Done when:** Brief is sent to F&F group; questions and feedback flow back to one channel.

### SL-009 · Verify PXO contract source against deployed bytecode
**Type:** 🔍 Discovery + 🔐 Ops
**Effort:** 2-3 hours
**Why:** Lawyers are reviewing contract claims now and have no blockchain expertise — verification responsibility sits with CTO. Source has been "assured" to live in the `qa` branch of ecosistema-pxo; trust-but-verify. If the source diverges from what's on-chain, every downstream claim (audit, repo publication, legal disclosure) is built on sand.
**Deployed contract:** `0xd6f9c21A585E2D77b62Ec8C65ab9beC70e2b77d7` (Polygon mainnet, per `useWalletStore.ts:47`).
**Steps:**
1. Extract Solidity source from the `qa` branch into a working directory
2. Identify exact compiler version and optimizer settings from Polygonscan's verified source page
3. Compile with those exact settings → produce bytecode
4. Compare against deployed bytecode (or the metadata hash, which is the standard quick check)
5. Document: total supply, decimals, every admin function (owner, pauser, minter, blacklister, upgrade proxy), and current holder addresses for each role
6. **Hand verified source + roles doc to lawyers** so their review is grounded in reality
    - **Audit language flag:** if no formal third-party audit has been performed (only internal/self-review), the lawyers MUST know before signing off on any marketing or prospectus language. The phrase "the contract has been audited" creates material legal exposure when unsupported. The honest, defensible phrasing is "the contract source is published and independently verifiable on Polygonscan; no formal third-party audit has been performed." Surface this explicitly in the handoff conversation — don't assume lawyers will infer audit status from context.
**Done when:** Bytecode matches (or discrepancies documented), admin roles + holders are in a written artifact, lawyers have received it AND have been explicitly told the audit status. Triggers SL-010 if roles are held by addresses outside current team's control.

### SL-010 · *(conditional)* Admin key rotation plan
**Type:** 🔐 Ops + 🔍 Discovery
**Effort:** Variable (2 hours planning + execution depends on contract design)
**Trigger:** Only if SL-009 reveals that the previous team, an unknown wallet, or any non-sanctioned key still holds admin roles (owner, pauser, minter, upgrade authority, etc.).
**Why:** Public disclosure of the contract repo will name these addresses. If they're held by a party we don't control, that's both a security risk and a credibility problem at launch.
**Steps:**
1. List each role and current holder
2. For each: determine if rotation is needed pre-launch
3. If yes: plan the on-chain rotation (may require multisig, may require deployer cooperation, may not be possible if the contract is non-upgradeable and lacks role-transfer functions)
4. Execute, verify on-chain, update SL-009 artifact
**Done when:** Either (a) all admin roles are held by current sanctioned wallets, or (b) the residual risk is explicitly accepted in writing.
**Worst case:** If the contract has no rotation mechanism and a critical role is held by an unrecoverable wallet, the only remediation is a new contract deployment + token migration. This is a multi-month event with serious user-facing implications — flag it the moment it surfaces.

### SL-011 · Wallet-chain mismatch protection
**Type:** 🔧 Code + 📋 Docs
**Effort:** 3-4 hours
**Why (real fund-loss risk):** The buy/sell flows read `useActiveWalletChain()` and honor whatever chain the user's wallet is currently connected to. A tester who connects a MetaMask defaulting to Polygon **mainnet** — while the demo environment is running against **Amoy testnet** — will silently execute a mainnet transaction. If the treasury has no PXO on mainnet (currently the case), the user burns real USDC/USDT on-chain and gets nothing back. The 400/500 arrives only *after* the transfer is confirmed on-chain, so the funds are already gone.
**Existing state:**
- `WalletStatusPage` shows Amoy, but that's driven by api-wallet's own chain iteration — independent of the user's wallet chain
- No UI network switcher exists on the buy/sell pages
- `VITE_ENABLE_ADMIN_TESTNET=true` in web env but there's no default-chain hint for regular users
- `usePXOExchange.ts:157` already validates the chain is in `SUPPORTED_CHAIN_IDS` (137, 80002) but does NOT enforce a specific one
**Scope (pick approach in review):**
1. **Add a `VITE_DEFAULT_CHAIN_ID`** env var (e.g., `80002` for F&F demo). Buy/Sell hooks refuse to submit if `activeChain.id !== VITE_DEFAULT_CHAIN_ID`, showing a "wrong network — switch to X" message with a one-click switch button using Thirdweb's `useNetworkSwitcherModal` (already imported elsewhere).
2. **OR**: reuse the existing `FORCE_POLYGON_MAINNET` semantics but inverted — introduce `VITE_LOCK_CHAIN_ID` that pins the required chain and rejects everything else.
3. Add a visible chain-mismatch banner at the top of the balance card / buy page when the wallet is on the wrong chain, before the user even clicks Buy.
**Done when:** A wallet connected to the wrong chain cannot initiate a buy/sell transaction that reaches on-chain execution. User sees a clear "switch network" prompt instead.
**Notes:**
- Consider whether admin users should be exempt (they already have `VITE_ENABLE_ADMIN_TESTNET` semantics for chain flexibility)
- SPEI deposit flow (`buy-pxo-mxn`) still passes `chainId` to the backend; make sure the guard applies there too
- The `WalletStatusPage` admin view showing Amoy despite user being on mainnet is a related-but-separate UX issue; document but don't fix in this task

---

## 🟧 Tier 2 — Pre-official-launch

### OL-001 · Add Bitso balance to admin view
**Type:** 🔧 Code
**Effort:** 3-4 hours
**Why:** Fiat reserves (MXN in Bitso) are invisible from the app. Today you trust the Bitso dashboard and a human watching it.
**Done when:** WalletStatusPage shows Bitso MXN balance, last-update timestamp, link to Bitso ops dashboard.

### OL-002 · Document and verify cold reserve wallet
**Type:** 📋 Docs + 🔐 Ops + 📞 External
**Effort:** 4-8 hours
**Why:** The 50M PXO supply lives in a wallet we can't fully describe. Pre-launch audit/compliance will ask.
**Steps:**
1. Identify cold reserve address
2. Verify multisig configuration on-chain (or confirm single-sig)
3. If single-sig: decide whether to migrate to multisig before official launch (recommended)
4. Document signing process, key custody, recovery procedure
**Done when:** Cold reserve is documented in `TREASURY.md`; if multisig migration is decided, that becomes a new task.

### OL-003 · Reconciliation dashboard / proof-of-reserves view
**Type:** 🔧 Code + 📋 Docs
**Effort:** 2-3 days
**Why:** A user/investor must be able to verify the three ledger rows in `MONEY_MECHANICS.md` balance. Today there's no view of this.
**Scope:** Read-only admin page showing per-chain on-chain balances (treasury, receiver, cold reserve), Bitso MXN balance, escrow attestation reference. Not a real-time PoR system — a daily snapshot is enough.
**Done when:** Page exists, refreshes on demand, can be screenshotted for an investor.

### OL-004 · T&C acceptance backend persistence
**Type:** 🔧 Code
**Effort:** 1 day
**Why:** Today, acceptance is localStorage-only. No audit trail; lost on browser clear. Compliance will care.
**Scope:** Add `tnc_accepted_at`, `tnc_version` to `users` table; api-users endpoint to record acceptance; frontend writes both localStorage and backend.
**Done when:** New users always have a backend-recorded acceptance; existing users get a one-time migration prompt.

### OL-005 · Backend env-prefix cleanup
**Type:** 🔧 Code
**Effort:** 1-2 days
**Why:** Backend APIs read `VITE_THIRDWEB_CLIENT_ID` and `NEXT_PUBLIC_SUPABASE_URL`. These are frontend bundler prefixes — misleading in backend, obscures consolidation.
**Scope:** Rename backend reads to `THIRDWEB_CLIENT_ID`, `SUPABASE_URL`, etc. Update `.env`, `.env.example`, Railway. Keep frontend `VITE_*` as-is.
**Done when:** No backend code references `VITE_*` or `NEXT_PUBLIC_*`; `ENV_MATRIX.md` updated; Railway updated.

### OL-006 · Backoffice extraction decision
**Type:** 🔍 Discovery + 📋 Docs
**Effort:** 4 hours (decision), 2-3 weeks (if go)
**Why:** Open question from 2026-06-25 conversation. Decision should be made deliberately, not by default.
**Done when:** Decision memo exists with the trade-offs and a go/no-go. If go: separate epic.

### OL-007 · Look-update polish & legacy cleanup
**Type:** 🔧 Code
**Effort:** 1 day
**Why:** Loose ends from the look update epic (2026-06-24).
**Items:**
- Sidebar duplicate logo header (already in TopBar when sidebar shows)
- Delete orphaned `PxoBalanceCard.tsx` and `WalletOverview.tsx` if confirmed unused
- Fix broken `handleLogin`/`handleLogout` destructures in `HeroSection`, `CTASection` (they reference fields that don't exist on AuthContext)
- Confirm Spanish/English copy on landing matches intended audience
**Done when:** Lint clean, no dead components, broken references closed.

### OL-009 · Create public contract repo (private first, public at launch)
**Type:** 🔧 Code + 📋 Docs
**Effort:** 4-6 hours initial setup + ongoing curation
**Blocked by:** SL-009 (must have verified source) and SL-010 if triggered (roles must be in known hands)
**Why:** De facto standard for token projects, especially those making a peg/backing claim. Lawyers' interpretation may treat it as a hard requirement for official launch. Polygonscan's verified source already exposes the code publicly; a repo is the curated, navigable, integrator-ready version.
**Structure:** Separate repository (not inside ecosistema-pxo monorepo). Foundry-based. See conversation 2026-06-25 for full file tree.
**Initial state:** **PRIVATE.** Grant read access to lawyers, F&F testers, select inversionistas. Allows pre-launch transparency with the trusted circle without inviting wider scrutiny while operational hygiene is still being closed.
**Required content:**
- Solidity source matching deployed bytecode (from SL-009)
- README with: address per network, Polygonscan link, total supply, decimals, admin roles + holders, audit status, license
- `SECURITY.md` with disclosure contact + scope
- `audits/NONE.md` or actual audit reports
- `ROLES.md` from SL-009 work
- `deployments/polygon-mainnet.json` with address, deployer, tx hash, block
- Foundry tests (even minimal — at least standard ERC20 behavior + any custom functions)
- Integration docs for devs adding PXO support
**Done when:** Private repo exists, all sections of README populated, lawyers + F&F have read access, contract version tag matches what's deployed.

### OL-009b · Flip contract repo to public
**Type:** 🔐 Ops
**Effort:** 5 minutes (the click); ~2 hours coordination with marketing/legal
**Blocked by:** OL-009 + official launch decision
**Why:** Coordinated with launch comms for maximum credibility moment. Public + unverified = worse than private + thorough; public + verified + coordinated = strong launch signal.
**Steps:**
1. Final review of repo content vs current state (anything need redaction or polish?)
2. Confirm SECURITY.md disclosure contact is monitored
3. Confirm any audit findings are addressed or disclosed
4. Flip visibility in repo settings
5. Announce alongside launch comms
**Done when:** Repo is public, link is in official launch announcement, security contact is responsive.

### OL-008 · KYC validation flow review
**Type:** 🔍 Discovery + 🔧 Code (likely)
**Effort:** 1-2 days
**Why:** The app gates fiat flows on `KYC_status === 'VALIDATED'`. KYC submission/review flow exists but hasn't been stress-tested. Pre-launch, walk through it as a real user.
**Done when:** Documented happy path, edge cases logged, missing pieces filed as separate tasks.

### OL-010 · Confirm Bitso funding `details` sender-CLABE field name
**Type:** 🔍 Discovery + 🔐 Ops
**Effort:** 30 minutes (once first live SPEI arrives)
**Why:** Iter 2 introduced the SPEI matching worker (`apps/api-exchange/src/workers/deposit-matching-worker.ts`). The worker extracts the source CLABE from a Bitso funding via `extractSenderClabe` in `apps/api-exchange/src/lib/bitso.ts`, which probes several plausible keys (`sender_clabe`, `origin_clabe`, `sender_account`, `source_clabe`, `clabe`) because Bitso doesn't publish a stable schema for `details`. First real funding will confirm the actual key.
**Steps:**
1. On the first live SPEI test, tail api-exchange logs for the funding event; log the full `details` blob at info level (temporary added logging is fine)
2. Identify which key holds the sender's 18-digit CLABE
3. Simplify `extractSenderClabe` to that one key (or leave the probe list if multiple funding methods land)
4. Remove the temporary logging
**Done when:** Matching worker verifies against a single confirmed key; comment in `bitso.ts` cites the observed field name.
**Blocking:** Not needed for demo mode (worker won't run without a real Bitso funding). Blocks confidence in production SPEI flow.

### OL-011 · Delete retired Conekta files
**Type:** 🔧 Code
**Effort:** 1-2 hours
**Why:** Iter 2 unregistered the Conekta webhook route in `apps/api-exchange/src/index.ts` and rewrote `buy-pxo-mxn.ts` to be SPEI-based. Runtime is clean but files remain: `apps/api-exchange/src/lib/conekta.ts`, `apps/api-exchange/src/routes/webhooks/conekta.ts`, `CONEKTA_*` env vars in `env.ts`, and any Conekta-typed exports in `packages/shared`. Left in place for one-cycle grep recoverability; safe to delete now that the SPEI flow is verified.
**Steps:**
1. Delete the two files above
2. Delete `CONEKTA_*` block from `env.ts`
3. Remove `CONEKTA_*` entries from Railway api-exchange env
4. Update `ENV_MATRIX.md` to remove the Conekta rows
5. Search `packages/shared` for Conekta types; delete if unused
6. Verify build is green
**Done when:** `grep -r conekta apps/api-exchange` returns zero non-comment results.

### OL-012 · Add "pending deposits" pane to admin Wallet Status
**Type:** 🔧 Code
**Effort:** 3-4 hours
**Why:** The matching worker runs silently. Today, if it's stuck or misconfigured (see OL-010), admin has no visibility beyond scraping logs. A pane in `WalletStatusPage.tsx` showing rows from `deposit_intents` with `status IN ('PENDING', 'MATCHED', 'FAILED')` from the last 24-48h gives an at-a-glance health check.
**Bundles well with:** SL-005 (USDT visibility) and OL-001 (Bitso balance) — same admin page.
**Fields to surface per row:** created_at, user (email or wallet slice), source_clabe (masked), destination_clabe (masked), mxn_amount, status, TTL remaining, bitso_funding_id, pxo_tx_hash. Click-through to Bitso funding on their dashboard when possible.
**Done when:** Admin can distinguish a healthy worker (PENDING → COMPLETED regularly, low FAILED count) from a broken one (many PENDING → EXPIRED, or FAILED spike).

### OL-013 · CLABE verification via micro-SPEI
**Type:** 🔧 Code + 📋 Docs
**Effort:** 1-2 days
**Why:** Currently anyone can register any 18-digit CLABE with only the unique-across-users constraint. There's no proof the CLABE actually belongs to the user. A small verification deposit (configurable, e.g. `CLABE_VERIFICATION_MIN_MXN=10`) sent from the CLABE to our Bitso account proves ownership. Users can only use *verified* CLABEs for regular deposits.
**Scope:**
1. Add `users.CLABE_verified_at TIMESTAMPTZ` column
2. New endpoint `POST /verify-clabe` in api-exchange creates a verification intent (marked as `verification` type on `deposit_intents`, no PXO issued on match)
3. Worker recognizes verification intents; on match, sets `users.CLABE_verified_at = now()` and refunds the micro-deposit (or keeps it as small onboarding cost — decision)
4. Frontend Settings: "Verify CLABE" step after registration; buy-with-SPEI blocks unverified CLABEs
**Also bundles:** amount-match guard on the matching worker — reject a funding if `funding.amount != intent.mxn_amount ± epsilon` (currently the worker FIFO-matches without checking amount).
**Done when:** Buy-with-SPEI refuses unverified CLABEs; a verification path exists in Settings; the amount-match guard is in the worker.
**Decision needed:** Refund the verification deposit or keep it? Refunding is user-friendly; keeping it as a small "onboarding fee" is simpler operationally.

### OL-014 · Single active deposit intent per user + true Cancel
**Type:** 🔧 Code
**Effort:** 4-6 hours (well-scoped, plan drafted 2026-07-14)
**Status:** Proposed 2026-07-14 by Adrian, decision pending — needs more thought before greenlight.
**Why (two coupled problems):**
1. **Multi-intent edge case.** Backend today lets a user hold multiple `PENDING` deposit intents simultaneously. Matching worker resolves ambiguity via FIFO on `(user_id, source_clabe)`. Simplifying to single-active-intent eliminates the ambiguity entirely and shrinks the mental model.
2. **Cancel button is UI-only (real bug).** `handleReset()` in `BuyPxoWithMxn.tsx` clears local state but does not touch the backend intent. The intent stays PENDING server-side until the worker matches or expires it (24h TTL by default). Combined with the single-active-intent rule, a user who "cancels" and immediately retries would be blocked by their own ghost intent.
**Scope:**
- **Backend** — `apps/api-exchange/src/routes/buy-pxo-mxn.ts`:
  - Add `CANCELLED` to the state machine (user-initiated terminal state)
  - `POST /buy-pxo-mxn`: pre-check for existing active intent (`PENDING` or `MATCHED`); return 409 `ACTIVE_INTENT_EXISTS` with the existing intent's ID so the frontend can hydrate it
  - `GET /buy-pxo-mxn/active`: new endpoint, returns the user's active intent or 404
  - `POST /buy-pxo-mxn/:id/cancel`: atomic `PENDING → CANCELLED`; cascades to `trading_orders.status = 'CANCELLED'`; rejects with 409 `CANNOT_CANCEL` if intent is already `MATCHED` (mid-fulfillment, uncancellable)
- **Frontend** — `apps/web/src/components/fiat/BuyPxoWithMxn.tsx`:
  - On mount, `GET /active`; hydrate `intent` state if present, skip the empty form
  - Add `cancelled` to `UiStatus`, treat `CANCELLED` as terminal in the polling loop
  - Cancel button calls the backend `POST /:id/cancel` (was local-only reset)
  - Confirm dialog on Cancel: *"¿Ya enviaste el SPEI? Si sí, no canceles y contacta a soporte."* — prevents the footgun of cancelling after sending real money
  - Handle 409 from POST create by hydrating existing intent (edge case: user opens two tabs)
**Decisions already made (2026-07-14) — flag if Adrian changes his mind:**
- Cancel only allowed in `PENDING`. Once `MATCHED`, worker has claimed the funding and PXO issuance is in-flight; cancelling mid-flight would leave the treasury short.
- No admin override for cancelling stuck intents in this scope; that belongs in OL-012 (pending deposits admin pane).
- Worker code needs no changes. Its FIFO ordering becomes redundant but stays as defensive belt-and-suspenders.
- CLABE lock in api-users (`hasActiveDepositIntent`) already considers `PENDING`+`MATCHED`; `CANCELLED` correctly unlocks CLABE editing.
**Done when:** Users can only ever have one active intent at a time; Cancel button actually cancels server-side; refreshing the page while an intent is pending re-shows it instead of a blank form.
**Open for Adrian's consideration:**
- Is the 24h TTL fallback still useful with single-active-intent + real Cancel, or is TTL redundant?
- Should re-opening the page mid-flow always resume the pending intent, or is there a case where the user wants to see the empty form (perhaps a "Start over" affordance next to the resumed intent)?

### OL-015 · Determine Bitso webhook verification model + implement
**Type:** 🔍 Discovery + 🔧 Code + 📞 External
**Effort:** 2-4 hours once Bitso confirms (discovery) + 1-2 hours implementation
**Why (real security posture, not urgent for F&F but urgent for anyone paying real money):** Iter 2A registered a Bitso stage webhook successfully (2026-07-30) but Bitso's registration response returned **no signing secret** — just a plain success message. This is unusual. Three possible models are in play and we don't know which is real:
1. **Separate webhook secret** returned at registration → the response is broken/incomplete or the secret is elsewhere (dashboard, headers, `GET /webhooks/` listing)
2. **Reuse the API secret** → Bitso signs webhooks with `BITSO_API_SECRET`. In this case our current `BITSO_WEBHOOK_SECRET` env var is redundant; verification should read `BITSO_API_SECRET` directly.
3. **No signing, IP allowlist** → Bitso relies on request origin. Would require IP-whitelisting on api-exchange.
**Current code assumes:** `apps/api-exchange/src/routes/webhooks/bitso.ts` uses `BITSO_WEBHOOK_SECRET` for HMAC verification (Pattern #1). Which is set to empty per `.env`. Which means: **inbound Bitso webhooks currently fail signature verification** and either return 401 or are accepted-with-warning depending on the code path.
**Discovery steps:**
1. Test `GET https://stage.bitso.com/api/v3/webhooks` (authed) — does it return the registered webhook with a `secret`/`signing_secret` field?
2. Log the response headers from the register call — some APIs return secrets in headers
3. Wait for a real Bitso stage webhook to hit our endpoint; log full request (headers + body) and inspect what signature format arrives; test `HMAC-SHA256(rawBody, BITSO_API_SECRET)` against it
4. If none of the above resolves it, ask Bitso Business support directly (one message): "For Bitso Business stage webhooks, how does the receiving endpoint verify authenticity? Is the signing secret returned at registration, do webhooks HMAC with the account's API secret, or is verification IP-based?"
**Implementation once known:**
- Pattern #1: keep current code path, populate `BITSO_WEBHOOK_SECRET` from wherever it lives
- Pattern #2: change `bitso.ts` webhook handler to verify with `BITSO_API_SECRET` instead; deprecate `BITSO_WEBHOOK_SECRET` env var
- Pattern #3: remove verification code; add IP allowlist middleware; document Bitso's webhook source IPs in `TREASURY.md`
**Interim posture for F&F demo:** temporarily loosen verification in `apps/api-exchange/src/routes/webhooks/bitso.ts` to log-and-accept, with a clear TODO comment. Small transaction amounts + human monitoring is acceptable risk for demo. **DO NOT ship to prod without verification.**
**Done when:** Webhook verification model is documented (which of #1/#2/#3), code implements it correctly, `BITSO_WEBHOOK_SECRET` is either populated or removed from env, verification succeeds against a real Bitso stage webhook.

---

## 🟩 Tier 3 — Post-launch

### PL-001 · Mint-on-deposit research
**Type:** 🔍 Discovery + 📋 Docs
**Effort:** 1 week (research only, not implementation)
**Why:** Adrian's stated ideal: MXN into escrow → new PXO minted. Today PXO is fully pre-minted. Implementing mint-on-deposit is a tokenomics + smart-contract decision, not a pure engineering task.
**Done when:** Memo exists comparing mint-on-deposit vs current pre-mint model with regulatory implications.

### PL-002 · Automated treasury rebalancing
**Type:** 🔧 Code + 🔐 Ops
**Effort:** 2-3 weeks
**Why:** Today, every refill (PXO reserve → treasury, USDT/USDC top-up, MXN ↔ escrow) is manual. Acceptable for soft launch; brittle for scale.
**Done when:** Triggered rebalance flows exist for at least PXO refill, with approval workflow.

### PL-003 · Multi-chain expansion (Stellar first)
**Type:** Separate epic
**Reference:** `MULTICHAIN_EXPANSION_DECISION.md`
**Status:** Decision memo exists, no commit. Re-evaluate after F&F launch with usage data.

### PL-004 · Backoffice extraction
**Type:** Separate epic if OL-006 returns "go"
**Reference:** `OL-006`

### PL-005 · Audit trail / on-chain proof of reserves
**Type:** 🔧 Code + 📋 Docs
**Effort:** Variable (1-4 weeks depending on rigor)
**Why:** Investor and regulator confidence improves dramatically with a published, verifiable reserve proof.
**Done when:** Public PoR page (or attestation cadence) exists.

### PL-006 · Pagos POS terminal review
**Type:** 🔍 Discovery
**Effort:** 2 days
**Why:** `apps/pagos` is in the repo but its production status is unclear. Has 8+ dead env vars. Determine if it's live, deferred, or abandoned.
**Done when:** Status documented; if live, add to monitoring; if abandoned, archive.

---

## 🚫 Explicitly out of scope (for now)

These come up in conversations. They're not on the backlog. They're not being deferred quietly — they're being said-no-to deliberately.

| Item | Why not | Where it would live if revisited |
|---|---|---|
| Native PXO on other chains (Stellar/Tron/Solana) | Doubles tokenomics, treasury, audit surface for marginal user benefit | A separate decision memo, not this backlog |
| Outbound redemption automation to non-EVM chains | Tied to multi-chain decision; out of scope until that ships | Same |
| BSC pay-in expansion | Scope was explicitly dropped earlier this phase | Memory: project_chain_scope |
| Mint-on-deposit implementation | Research first (PL-001), then decision | After PL-001 |
| Dedicated mobile apps | No demand signal | n/a |
| Live bridge integrations | UX cost, not infra cost | Phase 2 of multi-chain epic if it happens |

---

## 🔍 Open discovery questions

Not backlog items, but things we don't have answers to. Each becomes a task as it gets prioritized.

1. Whose wallet is `0x9f0f…8382`? → SL-001
2. Cold reserve multisig status? → OL-002
3. Bitso → escrow operational SOP (who signs, who approves)?
4. Has any test PXO been sold by an investor (and rejected by the 500-erroring backend)?
5. KYC review SLA — who watches the queue?
6. Conekta fee structure — is it priced into the rate users see?
7. Reserve escrow audit cadence — quarterly? annual? attestation provider?
8. Insurance / bonding on escrow assets — what's the legal claim mechanism if there's a peg break?
9. Does the deployed PXO contract have admin functions (owner, pauser, minter, upgrade proxy)? → SL-009
10. Who holds the admin/owner keys for the PXO contract today? → SL-009
11. Was the contract formally audited by a third party, or only self-reviewed? → SL-009 / OL-009
12. Which field in Bitso's SPEI funding `details` blob contains the sender's CLABE? → OL-010
13. Should CLABE-verification micro-deposits be refunded or kept as an onboarding cost? → OL-013 decision needed
14. Single-active-intent rule vs multi-intent FIFO — worth the constraint? → OL-014, pending Adrian's decision
15. Does Bitso Business stage sign webhooks with a dedicated secret, reuse the API secret, or rely on IP allowlist? → OL-015

---

## Summary for the CEO conversation

If reduced to one slide:

- **Soft launch is achievable** with ~2-3 weeks of focused work on 8 items, most of which are configuration and documentation rather than engineering.
- **Two critical issues** must be fixed first (P0): the SELL flow is broken on mainnet due to a missing env var, and an unknown wallet address is hardcoded in the frontend.
- **Official launch is 2-4 additional months** depending on how aggressive we go on automation and compliance hygiene.
- **Multi-chain expansion is deliberately deferred** — separate decision memo exists.
- **A backoffice split is open** — decision memo to follow.
