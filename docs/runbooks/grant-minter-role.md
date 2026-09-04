# Granting the minter role to the operational wallet

**For:** the contract owner (CEO), who holds the key to `0xdaac7fce…6d17`.
**What it does:** lets the PXO app create tokens when a customer buys more than
the operational wallet is holding. It does **not** give away ownership, and it
does not let anyone pause or transfer the contract. It can be undone.

---

## The two values that matter

Check both of these character by character before signing anything. Granting
this to the wrong address would let a stranger create PXO.

```
Contract you are calling   0xd6f9c21A585E2D77b62Ec8C65ab9beC70e2b77d7
Address you are granting   0x9f0f2EAc50AD04D37D3Bf3359735928126aC8382
```

The first is the PXO token. The second is the app's operational wallet — the
same one customers already send PXO to.

You must be connected with the **owner** wallet, `0xdaac7fce…6d17`. Any other
wallet will have the transaction rejected by the contract.

---

## Route A — Polygonscan — **not available**

Checked 2026-09-04: the contract is **not verified** on Polygonscan, Blockscout,
Routescan or Sourcify, so there is no *Write Contract* tab to use. Verifying it
is blocked on obtaining the exact deployed source (see SL-009) and is not a
prerequisite for this — **use Route B.**

The steps below are kept for the day verification lands:

1. Click **Contract** → **Write Contract**.
2. Click **Connect to Web3** and connect the owner wallet. The address shown
   after connecting must end in **…6d17**. If it does not, stop.
3. Find the function **`addMinter`**.
4. In the `account` field paste exactly:
   `0x9f0f2EAc50AD04D37D3Bf3359735928126aC8382`
5. Click **Write**, review the wallet popup, and confirm.

The transaction costs a small amount of POL for gas — under a cent.

## Route B — your wallet's advanced send  ← **use this one**

Most wallets can send a transaction with custom data. In MetaMask this is
Send → paste the contract as the recipient → then the Hex/Data field.

```
To      0xd6f9c21A585E2D77b62Ec8C65ab9beC70e2b77d7
Value   0
Data    0x983b2d560000000000000000000000009f0f2eac50ad04d37d3bf3359735928126ac8382
```

That data is `addMinter` with the operational wallet as its only argument.

## Route C — ask Adrian to walk you through it on a call

This is a one-line change to a contract holding 50,000,000 tokens. There is no
prize for doing it alone. If anything on screen does not match what is written
above, stop and ask.

---

## Confirming it worked

Adrian can verify in a few seconds — the check is public and needs no keys:

```sh
curl -s -X POST https://polygon-bor-rpc.publicnode.com \
  -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call",
  "params":[{"to":"0xd6f9c21a585e2d77b62ec8c65ab9bec70e2b77d7",
  "data":"0xaa271e1a0000000000000000000000009f0f2eac50ad04d37d3bf3359735928126ac8382"},"latest"]}'
```

A result ending in `…0001` means the role is granted. `…0000` means it is not.

## Undoing it

The same wallet can revoke at any time with `removeMinter` and the same
address — Route A, or calldata
`0x3092afd50000000000000000000000009f0f2eac50ad04d37d3bf3359735928126ac8382`.

---

## What this does not do

- It does **not** transfer ownership. You remain the owner.
- It does **not** grant `pause`, `unpause` or `transferOwnership`.
- It does **not** move any of the 49,999,979 PXO you hold.
- It can be revoked by you at any time.
