import React from 'react';
import { TermsGateModal } from '../legal/TermsGateModal';
import { useConnectWithTerms } from '../../hooks/useConnectWithTerms';
import { ArrowRightIcon } from './icons';
import { useMessages } from '../../i18n';

interface StartNowButtonProps {
  /** `hero` = white pill on the dark hero, `cta` = dark pill on light sections. */
  variant?: 'hero' | 'cta';
  /** Defaults to the localised "Empezar ahora" / "Get started". */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * "Empezar ahora" CTA. Runs the exact same action as the "Connect Wallet"
 * button: terms gate first (when not accepted yet), then wallet connect.
 */
export const StartNowButton: React.FC<StartNowButtonProps> = ({
  variant = 'cta',
  label,
  className = '',
  style,
}) => {
  const { cta } = useMessages();
  const { loading, gateOpen, start, cancelGate, acceptGate } = useConnectWithTerms();

  const btnClass = variant === 'hero' ? 'btn-hero' : 'btn-cta';
  const arrowClass = variant === 'hero' ? 'btn-hero-arrow' : 'btn-cta-arrow';

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className={`${btnClass} ${className}`.trim()}
        style={style}
      >
        {loading ? cta.connecting : (label ?? cta.startNow)}
        <span className={arrowClass}>
          <ArrowRightIcon size={16} />
        </span>
      </button>

      <TermsGateModal open={gateOpen} onCancel={cancelGate} onAllAccepted={acceptGate} />
    </>
  );
};
