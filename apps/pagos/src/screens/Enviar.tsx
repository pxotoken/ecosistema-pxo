import { useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { ChevronRightIcon, CopyIcon, QrIcon, WalletIcon } from '../components/icons';
import { contacts, initialEnvAmount, quickAmounts } from '../data/mockData';
import type { ScreenId } from '../types';

interface Props {
  onBack: () => void;
  onSuccess: (title: string, subtitle: string, amount: string) => void;
  onNavigate: (id: ScreenId) => void;
}

function sanitizeAmount(raw: string): string {
  let v = raw.replace(/[^0-9.]/g, '');
  const parts = v.split('.');
  if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`;
  if (parts[1] && parts[1].length > 2) v = `${parts[0]}.${parts[1].slice(0, 2)}`;
  return v;
}

export function Enviar({ onBack, onSuccess, onNavigate }: Props) {
  const [amount, setAmount] = useState(initialEnvAmount);
  const [dest, setDest] = useState('');
  const [error, setError] = useState(false);
  const [activeChip, setActiveChip] = useState<number | null>(
    initialEnvAmount ? Number(initialEnvAmount) : null,
  );
  const destRef = useRef<HTMLInputElement | null>(null);

  const onAmount = (raw: string) => {
    setAmount(sanitizeAmount(raw));
    setActiveChip(null);
  };

  const onChip = (value: number) => {
    setAmount(String(value));
    setActiveChip(value);
  };

  const pasteWallet = async () => {
    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        setDest(text.trim());
        return;
      } catch {
        /* fallback below */
      }
    }
    setDest('0x9F2c8B5e3D4A1c7E6f8B9d0A2c3E4f5B6d7A8c9E');
  };

  const formatShortAddress = (value: string) => {
    return value.length > 16 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
  };

  const formatAmountDisplay = (raw: string) => (raw.includes('.') ? raw : `${raw}.00`);

  const sendToWallet = () => {
    const target = dest.trim();
    if (!target) {
      setError(true);
      destRef.current?.focus();
      setTimeout(() => setError(false), 1500);
      return;
    }
    if (!amount || parseFloat(amount) <= 0) return;
    onSuccess('¡Enviado!', `Tu envío a ${formatShortAddress(target)} fue confirmado.`, `${amount} PXO`);
  };

  const sendToContact = (name: string) => {
    const base = amount || '500';
    onSuccess('¡Enviado!', `Tu envío a ${name} fue confirmado.`, `${formatAmountDisplay(base)} PXO`);
  };

  const emptyContacts = contacts.length === 0;

  return (
    <>
      <ScreenHeader title="Enviar dinero" onBack={onBack} />

      <div className="amount-display">
        <div className="amount-currency">Monto en PXO</div>
        <input
          className="field-amount"
          placeholder="0"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
        />
      </div>

      <div className="quick-amts">
        {quickAmounts.map((value) => (
          <div
            key={value}
            className={`qa-chip${activeChip === value ? ' on' : ''}`}
            onClick={() => onChip(value)}
          >
            ${value.toLocaleString('es-MX')}
          </div>
        ))}
      </div>

      <div className="contacts">
        <div className="contacts-title">Enviar a una wallet nueva</div>

        <div className={`wallet-input-wrap${error ? ' error' : ''}`}>
          <div className="wallet-input-icon">
            <WalletIcon />
          </div>
          <input
            ref={destRef}
            className="wallet-input"
            placeholder="0x... o alias.pxo"
            autoComplete="off"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
          />
          <button className="wallet-paste" onClick={pasteWallet} title="Pegar">
            <CopyIcon />
          </button>
          <button
            className="wallet-scan"
            onClick={() => onNavigate('pagar')}
            title="Escanear QR"
          >
            <QrIcon width={16} height={16} />
          </button>
        </div>
        <button className="btn-primary" style={{ marginBottom: 24 }} onClick={sendToWallet}>
          Enviar a esta wallet
        </button>

        <div className="contacts-title" style={{ marginTop: 8 }}>
          O enviá a un contacto
        </div>

        {emptyContacts ? (
          <div className="act-empty" style={{ padding: '30px 0' }}>
            <div className="act-empty-txt">
              Todavía no tenés contactos.
              <br />Pegá una wallet arriba para enviar.
            </div>
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className="contact" onClick={() => sendToContact(contact.name)}>
              <div className={`contact-ava ${contact.avatarClass}`}>{contact.initials}</div>
              <div className="contact-info">
                <div className="contact-name">{contact.name}</div>
                <div className="contact-sub">{contact.subtitle}</div>
              </div>
              <div className="contact-arrow">
                <ChevronRightIcon />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
