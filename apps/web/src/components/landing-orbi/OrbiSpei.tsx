import React from 'react';
import { StartNowButton } from './StartNowButton';
import { ZapIcon, ClockIcon, BankIcon } from './icons';
import { SECTIONS } from './scroll';
import { useMessages } from '../../i18n';

export const OrbiSpei: React.FC = () => {
  const { spei } = useMessages();

  const features = [
    { icon: <ZapIcon size={17} strokeWidth={2} />, label: spei.features.transfers },
    { icon: <ClockIcon size={17} />, label: spei.features.always },
    { icon: <BankIcon size={17} strokeWidth={2} />, label: spei.features.liquidity },
  ];

  return (
    <section className="spei-section" id={SECTIONS.spei}>
      <div className="spei-card">
        <div className="spei-left">
          <h2 className="spei-title">
            {spei.titlePart1} <span className="acc">{spei.titleAccent1}</span>{' '}
            {spei.titlePart2} <span className="acc2">{spei.titleAccent2}</span>{' '}
            {spei.titlePart3}
          </h2>
          <ul className="spei-features">
            {features.map((feature) => (
              <li key={feature.label}>
                <span
                  className="feat-dot"
                  style={{ color: 'var(--purple)', display: 'flex', alignItems: 'center' }}
                >
                  {feature.icon}
                </span>{' '}
                {feature.label}
              </li>
            ))}
          </ul>
          <StartNowButton />
        </div>
        <div className="spei-right">
          <div className="spei-phone-wrap">
            <div className="spei-img-wrap">
              <img
                src="/pxo-wallet-screen.png"
                alt={spei.walletAlt}
                className="spei-wallet-img"
              />
            </div>
          </div>
          <div className="spei-tag t1">
            <span className="spei-tag-icon">↓</span> {spei.tagReceived}
          </div>
          <div className="spei-tag t2">
            <span className="spei-tag-icon">💱</span> <span>{spei.tagSold}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
