import { createPublicClient, http, type PublicClient } from 'viem';
import { getChainConfig, type PaymentsChainId } from '../config/chains.js';

/**
 * Minimal viem definition for each supported chain. We don't import from
 * `viem/chains` so the build stays independent of viem's chain registry.
 */
function viemChain(chainId: PaymentsChainId) {
  const cfg = getChainConfig(chainId);
  return {
    id: chainId,
    name: cfg.name,
    nativeCurrency: { name: cfg.name, symbol: 'NATIVE', decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
  } as const;
}

const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface VerifiedTransfer {
  confirmed: boolean;
  from: string;
  to: string;
  value: string;
  blockNumber: bigint;
  contractAddress: string;
}

export class BlockchainService {
  private readonly client: PublicClient;
  private readonly pxoContractAddress: string;
  private readonly chainId: PaymentsChainId;

  constructor(chainId?: number) {
    const cfg = getChainConfig(chainId);
    this.client = createPublicClient({
      chain: viemChain(cfg.chainId),
      transport: http(cfg.rpcUrl),
    }) as PublicClient;
    this.pxoContractAddress = cfg.pxoTokenAddress;
    this.chainId = cfg.chainId;
  }

  /**
   * Read the receipt of a tx hash and extract the first Transfer(from, to, value)
   * log emitted by the PXO contract. Returns null if no such log is present,
   * or if the tx has not been mined yet.
   */
  async verifyTransaction(txHash: string): Promise<VerifiedTransfer | null> {
    try {
      const receipt = await this.client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      if (!receipt || receipt.status !== 'success') return null;

      const expectedToken = this.pxoContractAddress.toLowerCase();
      for (const log of receipt.logs ?? []) {
        if ((log.address ?? '').toLowerCase() !== expectedToken) continue;
        const topics = log.topics ?? [];
        if (topics[0] !== TRANSFER_TOPIC) continue;
        const from = topics[1] ? '0x' + topics[1].slice(-40) : '';
        const to = topics[2] ? '0x' + topics[2].slice(-40) : '';
        const value = log.data && log.data !== '0x' ? BigInt(log.data).toString() : '0';
        return {
          confirmed: true,
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          value,
          blockNumber: receipt.blockNumber,
          contractAddress: expectedToken,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  getChainId(): PaymentsChainId {
    return this.chainId;
  }
}
