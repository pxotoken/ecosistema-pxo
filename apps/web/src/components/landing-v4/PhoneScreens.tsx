import React from 'react';
import { useMessages } from '../../i18n';

/**
 * The phone mock-ups from docs/looks/landing_last_version.html. The design kept
 * these as per-locale HTML strings; here they are components reading the
 * catalogue, so there is one copy of the markup and the text follows the app's
 * locale like everything else.
 */

const Check: React.FC = () => (
  <div className="ok">
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  </div>
);

export const AccountScreen: React.FC = () => {
  const { landingV4: t } = useMessages();
  const s = t.screens.account;
  return (
    <>
      <div className="scr-top">
        {s.title}
        <i>MX</i>
      </div>
      <div className="bal">
        <small>{s.balance}</small>
        <b>12,500.00</b>
        <span>PXO · $12,500.00 MXN</span>
      </div>
      <div className="acts">
        <div>{s.buy}</div>
        <div>{s.send}</div>
        <div>{s.swap}</div>
      </div>
      <div className="tx">
        <div>
          <span>{s.txBuy}</span>
          <b className="in">+5,000 PXO</b>
        </div>
        <div>
          <span>{s.txSend}</span>
          <b>−1,200 PXO</b>
        </div>
        <div>
          <span>{s.txSwap}</span>
          <b>−2,000 PXO</b>
        </div>
      </div>
    </>
  );
};

export const SwapScreen: React.FC = () => {
  const { landingV4: t } = useMessages();
  const s = t.screens.swap;
  return (
    <>
      <div className="scr-top">
        {s.title}
        <i>⇅</i>
      </div>
      <div className="box">
        <div>
          <small>{s.pay}</small>
          <b>10,000</b>
        </div>
        <em>PXO</em>
      </div>
      <div className="sw">↓</div>
      <div className="box">
        <div>
          <small>{s.get}</small>
          <b>540.50</b>
        </div>
        <em>USDT</em>
      </div>
      <p className="note">{s.note}</p>
      <div className="sbtn">{s.action}</div>
    </>
  );
};

export const SendScreen: React.FC = () => {
  const { landingV4: t } = useMessages();
  const s = t.screens.send;
  return (
    <>
      <div className="scr-top">
        {s.title}
        <i>↗</i>
      </div>
      <Check />
      <div className="big">2,000 PXO</div>
      <p className="mid">{s.ok}</p>
      <div className="tx">
        <div>
          <span>{s.timeLabel}</span>
          <b>{s.timeValue}</b>
        </div>
      </div>
      <div className="sbtn">{s.action}</div>
    </>
  );
};

export const PayLinkScreen: React.FC = () => {
  const { landingV4: t } = useMessages();
  const s = t.screens.payLink;
  return (
    <>
      <div className="scr-top">
        {s.title}
        <i>↗</i>
      </div>
      <Check />
      <div className="big">+8,400 PXO</div>
      <p className="mid">{s.ok}</p>
      <div className="tx">
        <div>
          <span>{s.conceptLabel}</span>
          <b>{s.conceptValue}</b>
        </div>
        <div>
          <span>{s.fromLabel}</span>
          <b>{s.fromValue}</b>
        </div>
      </div>
      <div className="sbtn">{s.action}</div>
    </>
  );
};

/** A screen wrapped in the phone chrome, as used by the hero and the carousel. */
export const Phone: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** `swap-in` here replays the staggered entrance (see .screen.swap-in > *). */
  screenClassName?: string;
}> = ({ children, className = '', screenClassName = '' }) => (
  <div className={`phone ${className}`.trim()} aria-hidden="true">
    <div className={`screen ${screenClassName}`.trim()}>{children}</div>
  </div>
);
