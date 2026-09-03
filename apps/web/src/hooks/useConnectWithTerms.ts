import { useCallback, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { hasAcceptedTerms, markTermsAccepted } from '../lib/termsAcceptance';

interface ConnectWithTerms {
  /** Wallet connection is in flight. */
  loading: boolean;
  /** Whether the terms gate modal should be shown. */
  gateOpen: boolean;
  /** Entry point for any "connect / start" CTA. */
  start: () => void;
  /** User dismissed the terms gate. */
  cancelGate: () => void;
  /** User accepted every document in the gate — persist and connect. */
  acceptGate: () => void;
}

/**
 * Wallet connection gated by the terms & conditions acceptance.
 * Shared by the header "Connect Wallet" button and the landing CTAs so both
 * follow the exact same flow.
 */
export const useConnectWithTerms = (): ConnectWithTerms => {
  const { loading, connect } = useAuthContext();
  const [gateOpen, setGateOpen] = useState(false);

  const start = useCallback(() => {
    if (hasAcceptedTerms()) {
      connect();
      return;
    }
    setGateOpen(true);
  }, [connect]);

  const cancelGate = useCallback(() => setGateOpen(false), []);

  const acceptGate = useCallback(() => {
    markTermsAccepted();
    setGateOpen(false);
    connect();
  }, [connect]);

  return { loading, gateOpen, start, cancelGate, acceptGate };
};
