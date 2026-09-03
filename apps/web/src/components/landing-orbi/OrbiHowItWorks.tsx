import React from 'react';
import { ArrowRightIcon, UserIcon, BankIcon, ZapIcon } from './icons';
import { SECTIONS } from './scroll';
import { useMessages } from '../../i18n';

export const OrbiHowItWorks: React.FC = () => {
  const { how } = useMessages();

  const steps = [
    { num: '01', icon: <UserIcon size={28} />, ...how.steps.account },
    { num: '02', icon: <BankIcon size={28} />, ...how.steps.deposit },
    { num: '03', icon: <ZapIcon size={28} />, ...how.steps.use },
  ];

  return (
    <section className="how-section" id={SECTIONS.howItWorks}>
      <div className="how-inner">
        <div className="section-tag">{how.tag}</div>
        <h2 className="section-title">{how.title}</h2>
        <p className="section-sub">{how.sub}</p>
        <div className="how-steps">
          {steps.map((step, index) => (
            <React.Fragment key={step.num}>
              {index > 0 && (
                <div className="how-arrow">
                  <ArrowRightIcon size={20} strokeWidth={2} />
                </div>
              )}
              <div className="how-step">
                <div className="how-step-num">{step.num}</div>
                <div className="how-step-icon" style={{ color: 'var(--purple)' }}>
                  {step.icon}
                </div>
                <div className="how-step-title">{step.title}</div>
                <div className="how-step-sub">{step.sub}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
