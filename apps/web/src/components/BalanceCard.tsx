import { useCallback, useEffect, useState } from 'react';
import { Loader2, ArrowLeftRight, Send, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getBalance } from 'thirdweb/extensions/erc20';
import type { Chain } from 'thirdweb';
import { getThirdwebClient } from '../lib/client';
import useWalletStore from '../store/useWalletStore';
import { useAuthContext } from '../contexts/AuthContext';
import { usePXOPrices } from '../hooks/usePXOPrices';
import { useToast } from './ui/Toast';
import { SendFundsModal, ReceiveFundsModal } from './crypto';
import { PATHS } from '../routes/paths';

const client = getThirdwebClient();
const POLL_INTERVAL_MS = 10_000;

// Row order matches the spec: PXO, USDT, USDC, MGUSD.
const DISPLAY_SYMBOLS = ['PXO', 'USDT', 'USDC'] as const;

type BalanceState = Record<string, { loading: boolean; value: string }>;

const initialState: BalanceState = DISPLAY_SYMBOLS.reduce((acc, s) => {
  acc[s] = { loading: true, value: '0' };
  return acc;
}, {} as BalanceState);

function formatAmount(raw: string): string {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * USD total across the three tokens the card shows.
 *
 * USDT and USDC are treated as 1 USD each — they are dollar stablecoins and
 * the app already quotes them that way throughout. PXO is peso-denominated,
 * so it is converted at the PXO/USDC *sell* rate: what the holder would
 * actually receive for it, which is the honest number for a balance. Using
 * the buy rate would value the holding at what it costs to acquire, which is
 * always the less favourable side.
 *
 * Returns null while any input is missing, so the caller can show a spinner
 * rather than a figure that is wrong but confident — a total reading $0.00
 * because a rate had not loaded is worse than no total at all.
 */
function usdTotal(
  balances: BalanceState,
  pxoSellRate: number,
): number | null {
  if (DISPLAY_SYMBOLS.some((s) => balances[s]?.loading)) return null;
  if (!Number.isFinite(pxoSellRate) || pxoSellRate <= 0) return null;

  let total = 0;
  for (const symbol of DISPLAY_SYMBOLS) {
    const amount = parseFloat(balances[symbol]?.value ?? '0');
    if (!Number.isFinite(amount)) return null;
    total += symbol === 'PXO' ? amount * pxoSellRate : amount;
  }
  return total;
}

export function BalanceCard() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { tokens } = useWalletStore();
  const { user } = useAuthContext();
  const { addToast } = useToast();
  const [balances, setBalances] = useState<BalanceState>(initialState);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  // PXO/USDC: the sell leg converts a PXO holding into its USD equivalent.
  const { sell: pxoSellRate, loading: ratesLoading } = usePXOPrices('USDC');

  const availableTokens = activeChain && activeChain.id in tokens ? tokens[activeChain.id] : [];

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async (withLoading: boolean) => {
      if (!account?.address || !activeChain) return;

      await Promise.all(
        DISPLAY_SYMBOLS.map(async (symbol) => {
          const token = availableTokens.find((t) => t.symbol === symbol);
          if (!token) {
            if (!cancelled) {
              setBalances((prev) => ({ ...prev, [symbol]: { loading: false, value: '0' } }));
            }
            return;
          }
          if (withLoading && !cancelled) {
            setBalances((prev) => ({ ...prev, [symbol]: { ...prev[symbol], loading: true } }));
          }
          try {
            const result = await getBalance({
              contract: { client, address: token.address as `0x${string}`, chain: activeChain as Chain },
              address: account.address,
            });
            if (!cancelled) {
              setBalances((prev) => ({
                ...prev,
                [symbol]: { loading: false, value: result.displayValue },
              }));
            }
          } catch (err) {
            console.error(`BalanceCard: ${symbol} fetch error`, err);
            if (!cancelled) {
              setBalances((prev) => ({ ...prev, [symbol]: { loading: false, value: '0' } }));
            }
          }
        })
      );
    };

    fetchAll(true);
    const id = setInterval(() => fetchAll(false), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [account?.address, activeChain?.id, availableTokens.length]);

  // Send requires KYC; mirrors the guard in DashboardLayout's transfers handler.
  const handleSendClick = useCallback(() => {
    if (user?.KYC_status !== 'VALIDATED') {
      addToast({
        type: 'info',
        title: 'KYC Verification Required',
        description: 'Complete your KYC verification in Settings to send funds.',
        duration: 6000,
      });
      navigate(PATHS.dashboard.settings);
      return;
    }
    setShowSendModal(true);
  }, [user, addToast, navigate]);

  const total = ratesLoading ? null : usdTotal(balances, pxoSellRate);

  const actionButtonClass =
    'flex flex-col items-center justify-center gap-1 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-pxo-primary dark:text-dark-text rounded-lg py-2.5 text-xs font-medium hover:border-pxo-primary hover:bg-pxo-primary/5 transition-colors';

  return (
    <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-glass overflow-hidden">
      <div className="border-b border-light-border dark:border-dark-border px-4 py-5">
        <span className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
          Total balance
        </span>
        <span className="mt-1 flex items-baseline gap-1.5 text-2xl font-semibold text-light-text dark:text-dark-text tabular-nums">
          {total === null ? (
            <Loader2 className="h-6 w-6 animate-spin opacity-60" />
          ) : (
            <>
              {total.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                USD
              </span>
            </>
          )}
        </span>
      </div>

      <div className="divide-y divide-light-border dark:divide-dark-border">
        {DISPLAY_SYMBOLS.map((symbol) => {
          const state = balances[symbol];
          return (
            <div key={symbol} className="flex items-center justify-between px-4 py-4">
              <span className="text-sm font-semibold text-light-text dark:text-dark-text">
                {symbol}
              </span>
              <span className="text-base font-medium text-light-text dark:text-dark-text tabular-nums">
                {state.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                ) : (
                  `$${formatAmount(state.value)}`
                )}
              </span>
            </div>
          );
        })}
        {/* MGUSD placeholder — token not on-chain in current scope. */}
        {/* <div className="flex items-center justify-between px-4 py-4">
          <span className="text-sm font-semibold text-light-text dark:text-dark-text">
            MGUSD
          </span>
          <span className="text-base font-medium text-light-text dark:text-dark-text tabular-nums">
            $0.00
          </span>
        </div> */}
      </div>

      <div className="grid grid-cols-4 gap-2 p-3 bg-light-glass/40 dark:bg-dark-glass/40">
        {/* Convert spans the two columns Buy and Sell used to occupy. */}
        <button
          type="button"
          onClick={() => navigate(PATHS.dashboard.exchange)}
          className={`${actionButtonClass} col-span-2`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Convert</span>
        </button>
        <button onClick={handleSendClick} className={actionButtonClass}>
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
        <button onClick={() => setShowReceiveModal(true)} className={actionButtonClass}>
          <Download className="w-4 h-4" />
          <span>Receive</span>
        </button>
      </div>

      <SendFundsModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} />
      <ReceiveFundsModal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)} />
    </div>
  );
}
