import React from 'react';
import { TermsGateModal } from '../legal/TermsGateModal';
import { useConnectWithTerms } from '../../hooks/useConnectWithTerms';
import { useMessages } from '../../i18n';

interface AccountCtaProps {
  /** Maps to the design's .btn modifiers. */
  variant?: 'primary' | 'light';
  label: string;
  /** The nav CTA has no arrow in the design. */
  withArrow?: boolean;
  className?: string;
}

const Arrow: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * "Crea tu cuenta" / "Abre tu cuenta".
 *
 * The design pointed these at an external APP_URL. Here the landing *is* the
 * app, so the CTA runs the same gated flow as every other entry point: the
 * terms gate first when they have not been accepted yet, then wallet connect.
 */
export const AccountCta: React.FC<AccountCtaProps> = ({
  variant = 'primary',
  label,
  withArrow = true,
  className = '',
}) => {
  const { cta } = useMessages();
  const { loading, gateOpen, start, cancelGate, acceptGate } = useConnectWithTerms();

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className={`btn ${variant} ${className}`.trim()}
      >
        <span>{loading ? cta.connecting : label}</span>
        {withArrow && <Arrow />}
      </button>
      <TermsGateModal open={gateOpen} onCancel={cancelGate} onAllAccepted={acceptGate} />
    </>
  );
};
