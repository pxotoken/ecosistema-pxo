export class BlockchainService {
  async verifyTransaction(_txHash: string): Promise<{
    confirmed: boolean;
    from: string;
    to: string;
    value: string;
    blockNumber: number;
  } | null> {
    // TODO: Verify transaction receipt on Polygon Amoy via Alchemy/viem
    throw new Error('Not implemented');
  }

  async isWalletActive(_address: string): Promise<boolean> {
    // TODO: Check if merchant wallet is active on Polygon Amoy
    throw new Error('Not implemented');
  }
}
