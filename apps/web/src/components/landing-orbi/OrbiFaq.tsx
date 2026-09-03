import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './icons';
import { SECTIONS } from './scroll';
import { useMessages } from '../../i18n';

export const OrbiFaq: React.FC = () => {
  const { faq } = useMessages();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items = [faq.items.what, faq.items.howToGet, faq.items.usage, faq.items.safety];

  return (
    <section className="faq-section" id={SECTIONS.faq}>
      <div className="faq-inner">
        <div className="faq-left">
          <h2>{faq.title}</h2>
          {/* Placeholder from the design — no help center exists yet. */}
          <a href="#" className="btn-help" onClick={(e) => e.preventDefault()}>
            {faq.helpLink}
          </a>
        </div>
        <div className="faq-list">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div className={`faq-item ${isOpen ? 'open' : ''}`} key={item.q}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  {item.q}
                  <span className="faq-chevron">
                    {isOpen ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                  </span>
                </button>
                <div className="faq-a">{item.a}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
