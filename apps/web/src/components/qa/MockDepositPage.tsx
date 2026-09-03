import { useState } from 'react';
import { Loader2, FlaskConical, Copy, Check } from 'lucide-react';
import api, { getApiError } from '../../lib/api';

interface MockDepositResponse {
  success: boolean;
  deposit: {
    amount: string;
    tracking_code: string;
    receiver_clabe: string;
    receiver_name: string;
    created_at: string;
  };
  matching: {
    fundingId: string | null;
    senderClabe: string | null;
    note: string;
  };
}

function CopyableInline({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('CopyableInline: clipboard failed', err);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-pxo-primary hover:underline"
    >
      {value}
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function MockDepositPage() {
  const [amount, setAmount] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MockDepositResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError('Enter a positive MXN amount.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<MockDepositResponse>(
        '/api/exchange/qa/mock-bitso-deposit',
        {
          amountMxn: parsed,
          receiverName: receiverName.trim() || undefined,
        },
      );
      setResult(data);
    } catch (err) {
      setError(getApiError(err, 'Mock deposit failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <FlaskConical className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl font-semibold text-light-text dark:text-dark-text">
            Mock SPEI Deposit
          </h1>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
            QA-only tool. Triggers a simulated MXN deposit via Bitso's stage endpoint into the
            configured Business CLABE. Not available in production.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 space-y-4"
      >
        <label className="block text-sm font-medium text-light-text dark:text-dark-text">
          Amount (MXN)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2 text-base focus:outline-none focus:border-pxo-primary/50"
          />
        </label>

        <label className="block text-sm font-medium text-light-text dark:text-dark-text">
          Receiver name (optional — server auto-fills from env)
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Leave blank to use BITSO_BUSINESS_BENEFICIARY_NAME"
            className="mt-1 w-full rounded-lg border border-light-border dark:border-dark-border bg-light-base dark:bg-dark-base px-3 py-2 text-base focus:outline-none focus:border-pxo-primary/50"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-opacity ${
            submitting ? 'bg-pxo-primary/50 cursor-not-allowed' : 'bg-pxo-primary hover:opacity-90'
          }`}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Triggering…
            </span>
          ) : (
            'Trigger mock deposit'
          )}
        </button>
      </form>

      {result && (
        <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium">Deposit submitted to Bitso</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Amount</span>
              <span className="font-mono text-light-text dark:text-dark-text">
                ${result.deposit.amount} MXN
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">
                Tracking code
              </span>
              <CopyableInline value={result.deposit.tracking_code} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">
                Receiver CLABE
              </span>
              <CopyableInline value={result.deposit.receiver_clabe} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">
                Receiver name
              </span>
              <span className="text-light-text dark:text-dark-text">
                {result.deposit.receiver_name}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Created</span>
              <span className="font-mono text-light-text dark:text-dark-text">
                {result.deposit.created_at}
              </span>
            </div>
          </div>

          <div className="border-t border-light-border dark:border-dark-border pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
              Matching worker context
            </p>
            {result.matching.senderClabe ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">
                    Sender CLABE (assigned by Bitso)
                  </span>
                  <CopyableInline value={result.matching.senderClabe} />
                </div>
                {result.matching.fundingId && (
                  <div className="flex justify-between gap-4">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">
                      Bitso funding id
                    </span>
                    <span className="font-mono text-xs text-light-text dark:text-dark-text">
                      {result.matching.fundingId}
                    </span>
                  </div>
                )}
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary italic">
                  {result.matching.note}
                </p>
              </div>
            ) : (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary italic">
                {result.matching.note}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
