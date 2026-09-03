import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check } from 'lucide-react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import QRCode from 'qrcode';

interface ReceiveFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAIN_LABELS: Record<number, string> = {
  56: 'BNB Chain',
  137: 'Polygon',
  80002: 'Polygon Amoy',
};

export const ReceiveFundsModal: React.FC<ReceiveFundsModalProps> = ({ isOpen, onClose }) => {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const address = account?.address ?? null;
  const chainLabel = activeChain?.id ? CHAIN_LABELS[activeChain.id] ?? `Chain ${activeChain.id}` : null;

  useEffect(() => {
    if (!isOpen || !address) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(address, { width: 256, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('ReceiveFundsModal: QR generation failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, address]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch (err) {
      console.error('ReceiveFundsModal: clipboard write failed', err);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-modal-title"
    >
      <div className="bg-light-surface dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden border border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
          <h3
            id="receive-modal-title"
            className="text-lg font-semibold text-light-text dark:text-dark-text"
          >
            Receive funds
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-light-text-secondary dark:text-dark-text-secondary hover:opacity-80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center gap-4">
          {!address ? (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary py-8">
              No wallet connected.
            </p>
          ) : (
            <>
              <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Wallet address QR code"
                    className="w-64 h-64"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Generating QR…</span>
                )}
              </div>

              {chainLabel && (
                <p className="text-xs uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
                  {chainLabel}
                </p>
              )}

              <div className="w-full">
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
                  Your wallet address
                </p>
                <div className="flex items-center gap-2 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-lg px-3 py-2">
                  <span className="flex-1 font-mono text-xs text-light-text dark:text-dark-text break-all">
                    {address}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy address"
                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-light-surface dark:hover:bg-dark-surface transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-pxo-primary" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary text-center">
                Only send tokens on {chainLabel ?? 'the active network'} to this address. Sending
                from another network will result in loss of funds.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
