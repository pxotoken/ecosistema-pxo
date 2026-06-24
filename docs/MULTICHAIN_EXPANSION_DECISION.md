# Decision Memo: Multi-Chain Pay-In Expansion

**Status:** Proposed — directional decision requested
**Date:** 2026-06-23
**Author:** Engineering / Architect
**Stakeholders:** Founders, Investors, Product, Compliance
**Decision needed by:** Within 30 days post-launch (2026-08-01)
**Decision requested:** Approve sequencing for post-launch evaluation. No resource commitment requested today.

---

## TL;DR

Three candidate chains for inbound pay-in expansion: **Stellar, Tron, Solana**. All three are 3-5 weeks of engineering. Build cost is the cheap part — ongoing operations cost 0.5-1 day/week per chain, forever.

**Recommended path:** sequence Stellar → Tron → Solana. Do not parallelize. Do not start before 30 days post-launch. **First action is a call with Bitso** — it may collapse the entire memo into a config change.

---

## Context

Earlier this phase, multi-chain was deliberately descoped: Polygon-only, BSC deferred. That decision is reflected end-to-end in the code (type system, routes, contract maps, SDK imports — verified 2026-06-23). The app accepts USDT/USDC on Polygon only.

Stakeholder questions are now surfacing: *"Can users buy PXO with USDT from Tron / USDC from Solana / USDC from Stellar?"* The answer today is no. This memo provides the menu so the answer can become "here are the options, costs, and trade-offs" rather than "it depends."

This memo proposes a path. It does not propose committing to it before launch.

---

## Scope

**In scope of this memo:** Inbound pay-in rails from non-EVM chains using a **custodial-swap pattern** — user sends stablecoin to your treasury on that chain, backend detects, backend transfers Polygon PXO to user's Polygon wallet. PXO itself stays Polygon-native.

**Explicitly out of scope:**
- Issuing PXO natively on other chains (multi-supply tokenomics — separate, much larger epic)
- Outbound / redemption to non-EVM chains (gated by redemption strategy)
- BSC (separate prior decision)
- Live bridges (Allbridge/Wormhole) as user-facing flows (Phase 2 idea, not now)

---

## Options compared

### Engineering effort (custodial swap pattern)

| Dimension | **Stellar** | **Tron** | **Solana** |
|---|---|---|---|
| SDK maturity | `@stellar/stellar-sdk` — mature, clean | `tronweb` — mature, rougher DX | `@solana/web3.js` — mature, large community |
| Asset choice | USDC native (Circle) ✅ | **USDT only** — Circle deprecated USDC on Tron in 2024 | USDC native (Circle) ✅ |
| Payment-intent matching | Native 32-byte memo ✅ | **No native memo on TRC20** — requires HD-derived per-intent deposit addresses | Memo Program (extra instruction) ✅ |
| Account model friction | Trustline (one-time per asset) | Direct, like EVM | Token accounts (ATA) — ~$0.02 SOL rent for first-time users |
| RPC infrastructure | Horizon (free tier scales) | TronGrid free tier OK | **Paid RPC essentially mandatory** (Helius/Triton/QuickNode, $50-500/mo) |
| Resource/gas model | Per-tx fee in XLM (~$0.0001) | Energy/bandwidth system — must maintain TRX balance | Per-tx fee in SOL + ATA rent |
| **Build estimate** | **3-4 weeks** | **4-5 weeks** | **3-4 weeks** |

### Operational / strategic dimensions (ongoing, not one-time)

| Dimension | **Stellar** | **Tron** | **Solana** |
|---|---|---|---|
| Compliance reputation | Payments-first, clean | **USDT-TRC20 carries AML/sanctions scrutiny** — banks and some exchanges flag it | Clean, US-friendly stablecoin |
| LATAM fit | Smaller user base, payments-native | **Largest USDT remittance network in LATAM** — strong Mexico fit | Strong DeFi/retail, weaker remittance focus |
| Treasury rebalance routes | Allbridge, CEX swaps (Kraken) — moderate liquidity | Many CEXes (Binance prime), Wormhole — best USDT liquidity globally | Wormhole, deBridge, Allbridge — strongest bridge ecosystem |
| Multisig / treasury security | Native multisig (clean) | Multisig via contract or exchange custody | Squads protocol (mature) |
| Network uptime track record | Excellent | Excellent | **Multiple multi-hour outages 2022-2023** (improved since) |
| Bitso (current custodian) supports? | **TBD — must verify** | **TBD — must verify** | **TBD — must verify** |

### Marginal-cost model

- **First chain: 3-4 weeks engineering**, includes building a reusable chain-adapter abstraction (~30% upfront tax).
- **Each subsequent chain: 2-3 weeks** if the abstraction exists. Without it: 3-4 weeks each, plus accumulating divergence.
- **Ongoing operations: 0.5-1 day/week per chain, perpetually** — treasury monitoring, rebalance execution, alerting, support for mis-sends, compliance attestation.

Three chains live → **1.5-3 days/week of perpetual operational load**. Engineering is a one-time cost; operations are a forever cost. This is the line that should drive the decision, not "is the SDK ready."

---

## Recommendation

### Sequence: Stellar → Tron → Solana. Ship → measure → decide.

#### Why this order

1. **Stellar first** — cleanest tech, payments-native architecture, no compliance baggage. Smallest user base but also smallest risk surface. The right place to build the chain-adapter abstraction that makes (2) and (3) cheaper.
2. **Tron second** — largest USDT remittance volume in LATAM = highest user impact for the Mexican market. Worth the memo workaround and the USDT-only constraint, *if* compliance signs off.
3. **Solana third** — only if data shows demand. Strong tech but the LATAM remittance fit is weaker than Tron's.

#### Why sequence, not parallel

- Each shipped chain reveals real usage, real treasury cost, real compliance friction.
- Parallelizing triples treasury risk and ops load *before* product-market fit is known.
- Investor capital efficiency: one chain in production teaches more than three half-built.

#### Pre-conditions (do not start without)

- Launch is stable post-2026-07-01 and investor gate is cleared.
- **Bitso confirmation per chain** — they may already custody one or more of these, which would collapse the treasury question into a config change. This single call could reframe the whole memo. Do this first.
- Compliance/legal sign-off per chain, especially **Tron** (AML/sanctions reputation of USDT-TRC20).

#### Estimated investment

| Phase | Window | Engineering | Ops onboarding |
|---|---|---|---|
| Stellar | Month 1-2 post-launch | 3-4 weeks (1 engineer) + ~30% abstraction tax | ~1 week treasury setup + dashboards |
| Tron | Month 3-4 post-launch | 2-3 weeks (1 engineer) if Stellar shipped | ~1 week |
| Solana | Month 5+, data-gated | 2-3 weeks (1 engineer) if prior shipped | ~1 week |

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Treasury key compromise (per chain) | Low | Catastrophic | Encrypted-key pattern; native multisig where supported |
| Bitso does not custody the target chain | Medium | Increases treasury operations scope significantly | **Verify before commit** |
| Compliance blocks Tron specifically (USDT-TRC20 reputation) | Medium | Tron path becomes non-viable | Legal review pre-engineering |
| Operational load underestimated; team burnout | Medium | Quality/reliability erosion | Hire ops capacity before chain #2 |
| Network outage (Solana especially) | Low/Medium | Settlement delays | Settlement intent TTL + manual reconciliation SOP |
| Wrong-asset / wrong-chain user deposits | Medium | Refund operations workload | Strong frontend guards + documented refund SOP |
| Liquidity gap on rebalance route | Medium | Temporary pause of pay-in on affected chain | Pre-established rebalance lanes + pause switch per chain |

---

## Open questions for stakeholders

1. **Bitso's custody coverage per chain** — answers may collapse this memo entirely. *Owner: Founders. Recommended ASAP, even pre-launch.*
2. **CNBV/SAT reporting posture** on non-EVM pay-in rails. *Owner: Compliance.*
3. **Tron-specific compliance position** — does USDT-TRC20's AML/sanctions reputation conflict with the brand's regulatory positioning? *Owner: Compliance + Founders.*
4. **Demand signal** — is a specific investor, partner, or user segment asking for one of these, or is this hypothetical reach expansion? *Owner: Product.* (Drives whether to start Phase 1 at all.)

---

## What we are explicitly NOT proposing

- Issuing PXO natively on Stellar/Tron/Solana
- Outbound / redemption to those chains
- BSC expansion (separate prior decision)
- Live bridges as user-facing flows
- Starting any of this before the 2026-07-01 launch stabilizes

---

## Decision requested

**From stakeholders:** Approve the *option* to pursue Phase 1 (Stellar) post-launch, contingent on:
- Bitso custody confirmation
- Compliance sign-off
- Stable launch + investor gate cleared

This memo requests **directional alignment**, not resource commitment. The "go / no-go" for engineering work happens at a second decision point, after the Bitso conversation and compliance review.

**From engineering:** No action required pending directional decision.

---

## Appendix A — Why custodial swap and not live bridge

| | Custodial swap (proposed) | Live bridge (Allbridge/Wormhole) |
|---|---|---|
| User UX | One signature, one address | Two signatures, 10-30 min wait, bridge fees + slippage |
| New custody risk | Yes — you hold treasuries on N chains | No — funds transit, never custodied by you |
| Build time | 3-5 weeks per chain | 4-6 weeks (frontend orchestration + bridge integration + failure handling) |
| Ongoing ops cost | Treasury rebalance | Bridge monitoring, user-support for stuck bridges |
| Best for | Predictable UX, simpler flows | Custody-averse architectures |

Custodial swap is recommended for Phase 1 because the team already operates a Polygon treasury — the operational pattern is known. Live bridge is a Phase 2 consideration only if treasury operations become unsustainable.

---

## Appendix B — Why Stellar first (vs Tron's larger LATAM footprint)

Tron has objectively higher LATAM USDT volume than Stellar. Putting Stellar first is not a denial of that — it's a sequencing call:

- Stellar carries no compliance friction; it can ship without waiting on a legal review.
- Stellar's native memo support means the chain-adapter abstraction can be designed against a clean reference case first, then extended to handle Tron's memo workaround.
- A Stellar pilot teaches the team the operational pattern (treasury, rebalance, alerting) at lower regulatory risk.
- Tron-first means the first integration is also the one most likely to be blocked or delayed by compliance — high schedule risk.

If compliance pre-clears Tron quickly, the sequence is open to revision.
