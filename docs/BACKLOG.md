# PXO Backlog — Working Doc

**Status:** Draft for CTO review, 2026-06-25
**Audience:** Adrian (CTO), CEO updates, future contributors
**Source documents:** [MONEY_MECHANICS.md](./MONEY_MECHANICS.md), [ENV_MATRIX.md](./ENV_MATRIX.md), [MULTICHAIN_EXPANSION_DECISION.md](./MULTICHAIN_EXPANSION_DECISION.md)

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

---

## Summary for the CEO conversation

If reduced to one slide:

- **Soft launch is achievable** with ~2-3 weeks of focused work on 8 items, most of which are configuration and documentation rather than engineering.
- **Two critical issues** must be fixed first (P0): the SELL flow is broken on mainnet due to a missing env var, and an unknown wallet address is hardcoded in the frontend.
- **Official launch is 2-4 additional months** depending on how aggressive we go on automation and compliance hygiene.
- **Multi-chain expansion is deliberately deferred** — separate decision memo exists.
- **A backoffice split is open** — decision memo to follow.
