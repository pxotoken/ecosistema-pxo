/**
 * On-chain Constants
 */

/**
 * Fixed gas limit for ERC-20 token transfers (PXO / stablecoins).
 *
 * The PXO proxy contract needs more than a vanilla ERC-20's ~52k, and
 * thirdweb's auto-estimate can undershoot on Amoy's flaky RPCs, causing
 * "out of gas" reverts. Every place that sends or funds a token transfer
 * (server-side send-pxo / send-stablecoin, the client PXO sell, and the
 * gas-subsidy sizing) uses this single value so a subsidized wallet always
 * receives enough native to cover the transfer it will actually send.
 */
export const TOKEN_TRANSFER_GAS_LIMIT = 100_000n;
