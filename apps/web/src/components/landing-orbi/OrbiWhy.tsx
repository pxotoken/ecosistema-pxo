import React from 'react';
import { StartNowButton } from './StartNowButton';
import {
  ShieldIcon,
  GlobeIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  FileIcon,
  FlagIcon,
} from './icons';
import { SECTIONS } from './scroll';
import { useMessages } from '../../i18n';

export const OrbiWhy: React.FC = () => {
  const { why } = useMessages();

  const benefits = [
    { icon: <ShieldIcon size={15} />, label: why.benefits.infrastructure },
    { icon: <GlobeIcon size={15} />, label: why.benefits.global },
    { icon: <CheckIcon size={15} />, label: why.benefits.compliance },
    { icon: <ClockIcon size={15} />, label: why.benefits.always },
    { icon: <LockIcon size={15} />, label: why.benefits.custody },
    { icon: <FileIcon size={15} />, label: why.benefits.audit },
    { icon: <FlagIcon size={15} />, label: why.benefits.pesos },
  ];

  return (
    <section className="why-section" id={SECTIONS.why}>
      <div className="why-inner">
        <div className="section-tag">{why.tag}</div>
        <h2 className="section-title">
          {why.titleLead} <em>{why.titleAccent}</em>
          {why.titleTrail}
        </h2>
        <p className="section-sub">{why.sub}</p>

        <div className="benefits-grid">
          {benefits.map((benefit) => (
            <div className="benefit-pill" key={benefit.label}>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--purple)' }}>
                {benefit.icon}
              </span>{' '}
              {benefit.label}
            </div>
          ))}
        </div>

        <StartNowButton />
      </div>
    </section>
  );
};
