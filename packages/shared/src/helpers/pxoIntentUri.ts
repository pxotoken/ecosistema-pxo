export interface PxoIntent {
  wallet: string;
  version: number;
}

export interface BuildPxoIntentInput {
  wallet: string;
  version?: number;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const PXO_INTENT_RE = /^pxo:\/\/pay\?(.*)$/;

const CURRENT_VERSION = 1;

export function buildPxoIntentUri(input: BuildPxoIntentInput): string {
  if (!EVM_ADDRESS_RE.test(input.wallet)) {
    throw new Error(`Invalid EVM address: ${input.wallet}`);
  }
  const v = input.version ?? CURRENT_VERSION;
  const params = new URLSearchParams({ wallet: input.wallet, v: String(v) });
  return `pxo://pay?${params.toString()}`;
}

export function parsePxoIntentUri(uri: string): PxoIntent | null {
  const match = uri.trim().match(PXO_INTENT_RE);
  if (!match) return null;

  const params = new URLSearchParams(match[1]);
  const wallet = params.get('wallet');
  const vRaw = params.get('v');
  if (!wallet || !EVM_ADDRESS_RE.test(wallet)) return null;

  const version = vRaw ? Number(vRaw) : NaN;
  if (!Number.isInteger(version) || version < 1) return null;

  return { wallet, version };
}

export const PXO_INTENT_CURRENT_VERSION = CURRENT_VERSION;
