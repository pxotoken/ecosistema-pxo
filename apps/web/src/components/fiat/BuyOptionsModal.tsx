import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Wallet } from 'lucide-react';
import { PATHS } from '../../routes/paths';

interface BuyOptionsModalProps {
  open: boolean;
  onClose: () => void;
}

interface OptionRowProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  tags: string[];
  onSelect: () => void;
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded bg-pxo-primary/10 text-pxo-primary dark:bg-pxo-primary/20 dark:text-white/90">
      {label}
    </span>
  );
}

function OptionRow({ icon, name, description, tags, onSelect }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-start gap-4 px-4 py-3 text-left rounded-lg hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
    >
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-xl">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-light-text dark:text-dark-text">{name}</div>
        <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5 leading-relaxed">
          {description}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Buy PXO chooser — portaled modal, presented like Send/Receive.
 * Reachable from the balance-card Buy button and the top-nav Buy link.
 */
export function BuyOptionsModal({ open, onClose }: BuyOptionsModalProps) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-options-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-light-surface dark:bg-dark-surface w-full max-w-md max-h-[calc(100vh-3rem)] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-light-border dark:border-dark-border"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
          <h3
            id="buy-options-title"
            className="text-lg font-semibold text-light-text dark:text-dark-text"
          >
            Buy PXO
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

        <div className="px-4 py-4 overflow-y-auto space-y-6">
          <section>
            <h4 className="text-sm font-semibold text-light-text dark:text-dark-text px-2 mb-2">
              Digital Dollars
            </h4>
            <OptionRow
              icon={<Wallet className="w-6 h-6 text-pxo-primary" />}
              name="Wallet Balance"
              description="Buy PXO using your Digital Dollar balance from your wallet."
              tags={['Zero-fee', 'Immediate']}
              onSelect={() => handleSelect(PATHS.dashboard.exchangeBuy)}
            />
          </section>

          <section>
            <h4 className="text-sm font-semibold text-light-text dark:text-dark-text px-2 mb-2">
              Bank
            </h4>
            <OptionRow
              icon={<span aria-label="Mexico">🇲🇽</span>}
              name="SPEI"
              description="Deposit from your bank accounts."
              tags={['Zero-fee', 'Up to 24h']}
              onSelect={() => handleSelect(PATHS.dashboard.fiatBuy)}
            />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
