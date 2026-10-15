import React, { useState } from 'react';
import api, { getApiError } from '../../lib/api';
import { useMessages } from '../../i18n';

/**
 * Contact form from the October 2026 design.
 *
 * The design wired this to Netlify Forms (`data-netlify`, a `bot-field`
 * honeypot, and a POST to "/"), which does nothing here — the site is on
 * Vercel. It posts to `POST /api/email/contact` instead, which already exists
 * in api-email and is proxied unauthenticated by the orchestrator.
 *
 * That endpoint accepts `{ email, message }` only, with no field for a name,
 * so the name is prefixed onto the message rather than dropped — the person
 * reading the mail still gets it, and the API contract is untouched.
 */
export const ContactForm: React.FC = () => {
  const { landingV4: t } = useMessages();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'done'>('idle');
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;

    // Mirrors the design's own guard: it checked validity before sending
    // rather than relying on the browser's native bubbles.
    if (!name.trim() || !message.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setErrorText(t.contact.invalid);
      return;
    }

    setStatus('sending');
    setErrorText('');
    try {
      await api.post('/api/email/contact', {
        email: email.trim(),
        message: `${t.contact.name}: ${name.trim()}\n\n${message.trim()}`,
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorText(getApiError(err, t.contact.error));
    }
  };

  if (status === 'done') {
    return (
      <div className="card rv">
        <div className="cdone">
          <div className="ok">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h3>{t.contact.done}</h3>
          <p className="sec-p" style={{ marginTop: 0 }}>
            {t.contact.done2}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card rv">
      <form className="cform" onSubmit={handleSubmit} noValidate>
        <label htmlFor="c-name">
          <span>{t.contact.name}</span>
          <input
            id="c-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label htmlFor="c-mail">
          <span>{t.contact.mail}</span>
          <input
            id="c-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="full" htmlFor="c-msg">
          <span>{t.contact.message}</span>
          <textarea id="c-msg" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <button className="btn primary send" type="submit" disabled={status === 'sending'}>
          <span>{status === 'sending' ? t.contact.sending : t.contact.send}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <p className={`cmsg${status === 'error' ? ' err' : ''}`} aria-live="polite">
          {status === 'error' ? errorText : ''}
        </p>
      </form>
    </div>
  );
};
