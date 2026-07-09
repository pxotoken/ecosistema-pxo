import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { TERMS_DOCUMENTS, type TermsDocument } from './termsContent';
import { TermsTextModal } from './TermsTextModal';

interface TermsGateModalProps {
  open: boolean;
  onCancel: () => void;
  onAllAccepted: () => void;
}

type AcceptedState = Record<TermsDocument['key'], boolean>;

const initialState: AcceptedState = { pxo: false, finlatam: false };

export const TermsGateModal: React.FC<TermsGateModalProps> = ({
  open,
  onCancel,
  onAllAccepted,
}) => {
  const [accepted, setAccepted] = useState<AcceptedState>(initialState);
  const [activeDoc, setActiveDoc] = useState<TermsDocument | null>(null);

  if (!open) return null;

  const bothAccepted = accepted.pxo && accepted.finlatam;

  const openDoc = (doc: TermsDocument) => setActiveDoc(doc);
  const closeDoc = () => setActiveDoc(null);

  const handleAcceptDoc = () => {
    if (!activeDoc) return;
    setAccepted((prev) => ({ ...prev, [activeDoc.key]: true }));
    setActiveDoc(null);
  };

  const handleToggle = (doc: TermsDocument) => {
    if (accepted[doc.key]) {
      setAccepted((prev) => ({ ...prev, [doc.key]: false }));
    } else {
      openDoc(doc);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-title"
    >
      <div className="bg-white w-full max-w-xl max-h-[calc(100vh-3rem)] rounded-lg shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="terms-gate-title" className="text-lg font-semibold text-gray-900">
            Before you continue
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {TERMS_DOCUMENTS.map((doc) => (
            <label
              key={doc.key}
              className="flex items-start gap-3 p-3 rounded-md border border-gray-200 hover:border-pxo-primary/50 transition cursor-pointer"
            >
              <input
                type="checkbox"
                checked={accepted[doc.key]}
                onChange={() => handleToggle(doc)}
                className="mt-0.5 h-4 w-4 accent-pxo-primary cursor-pointer"
              />
              <span className="text-sm text-gray-700 leading-snug">
                {doc.consentLine}{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    openDoc(doc);
                  }}
                  className="text-pxo-primary underline hover:opacity-80"
                >
                  Read {doc.shortLabel}
                </button>
              </span>
            </label>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            disabled={!bothAccepted}
            onClick={onAllAccepted}
            className={`w-full px-5 py-3 rounded-md text-sm font-semibold text-white transition ${
              bothAccepted
                ? 'bg-pxo-primary hover:opacity-90'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Submit
          </button>
        </div>
      </div>

      {activeDoc && (
        <TermsTextModal
          open={true}
          title={activeDoc.modalTitle}
          body={activeDoc.body}
          onDisagree={closeDoc}
          onAccept={handleAcceptDoc}
        />
      )}
    </div>,
    document.body
  );
};
