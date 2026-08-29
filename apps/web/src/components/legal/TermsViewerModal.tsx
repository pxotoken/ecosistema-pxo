import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getTermsDocuments, type TermsDocument } from './termsContent';
import { useLocale } from '../../i18n';

interface TermsViewerModalProps {
  open: boolean;
  /** Header text; defaults to the localised "Terms & Conditions". */
  title?: string;
  onClose: () => void;
}

/**
 * Read-only view of the legal documents. Deliberately has no acceptance
 * mechanics: the consent flow lives in TermsGateModal / TermsTextModal and is
 * only reachable from the wallet connect action.
 */
export const TermsViewerModal: React.FC<TermsViewerModalProps> = ({
  open,
  title,
  onClose,
}) => {
  const { locale, messages } = useLocale();
  const documents = useMemo(() => getTermsDocuments(locale), [locale]);
  const [activeKey, setActiveKey] = useState<TermsDocument['key']>(documents[0].key);

  // Always reopen on the first document.
  useEffect(() => {
    if (open) setActiveKey(documents[0].key);
  }, [open, documents]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeDoc = documents.find((doc) => doc.key === activeKey) ?? documents[0];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-viewer-title"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[calc(100vh-3rem)] rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="terms-viewer-title" className="text-lg font-semibold text-gray-900">
            {title ?? messages.legal.viewerTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.legal.close}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {documents.length > 1 && (
          <div className="flex gap-1 px-6 pt-4" role="tablist">
            {documents.map((doc) => {
              const isActive = doc.key === activeDoc.key;
              return (
                <button
                  key={doc.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveKey(doc.key)}
                  className={`px-4 py-2 rounded-t-md text-sm font-medium transition border-b-2 ${
                    isActive
                      ? 'border-pxo-primary text-pxo-primary bg-gray-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {doc.shortLabel}
                </button>
              );
            })}
          </div>
        )}

        <div className="px-6 py-4 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 leading-relaxed flex-1">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            {activeDoc.modalTitle}
          </h3>
          {activeDoc.body}
        </div>
      </div>
    </div>,
    document.body
  );
};
