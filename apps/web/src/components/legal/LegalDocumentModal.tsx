import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLocale } from '../../i18n';
import type {
  LegalDocumentContent,
  LegalDocumentKey,
  LegalNode,
  LegalRun,
} from './legalDocuments';

interface LegalDocumentModalProps {
  /** Which document to show, or null when closed. */
  docKey: LegalDocumentKey | null;
  onClose: () => void;
}

type Catalogue = Record<LegalDocumentKey, Record<'es' | 'en', LegalDocumentContent>>;

/* The documents are ~58 KB of prose that most visitors never open, so they are
   fetched the first time a link is clicked rather than bundled into the landing
   page. Cached at module scope: reopening does not refetch. */
let cache: Catalogue | null = null;
let inFlight: Promise<Catalogue> | null = null;

const loadDocuments = (): Promise<Catalogue> => {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = import('./legalDocuments').then((m) => {
      cache = m.LEGAL_DOCUMENTS;
      return cache;
    });
  }
  return inFlight;
};

const Runs: React.FC<{ runs: LegalRun[] }> = ({ runs }) => (
  <>
    {runs.map((run, i) =>
      run.b ? (
        <strong key={i} className="font-semibold text-gray-900">
          {run.t}
        </strong>
      ) : (
        <React.Fragment key={i}>{run.t}</React.Fragment>
      )
    )}
  </>
);

const Node: React.FC<{ node: LegalNode }> = ({ node }) => {
  switch (node.type) {
    case 'h3':
      return (
        <h3 className="text-base font-semibold text-gray-900 mt-7 mb-2.5 first:mt-0">
          <Runs runs={node.runs} />
        </h3>
      );
    case 'p':
      return (
        <p className="mb-3">
          <Runs runs={node.runs} />
        </p>
      );
    case 'ul':
    case 'ol': {
      const List = node.type === 'ol' ? 'ol' : 'ul';
      return (
        <List
          className={`mb-3 pl-6 space-y-1.5 ${
            node.type === 'ol' ? 'list-decimal' : 'list-disc'
          }`}
        >
          {node.items.map((item, i) => (
            <li key={i}>
              <Runs runs={item} />
            </li>
          ))}
        </List>
      );
    }
    case 'table':
      // Narrow screens scroll the table rather than the page.
      return (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {node.head.map((cell, i) => (
                  <th
                    key={i}
                    className="border border-gray-300 bg-gray-50 px-2.5 py-2 text-left align-top font-semibold text-gray-900"
                  >
                    <Runs runs={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="border border-gray-300 px-2.5 py-2 text-left align-top"
                    >
                      <Runs runs={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
};

/**
 * Read-only view of one legal document (terms or privacy notice).
 *
 * Deliberately separate from TermsGateModal: nothing here records or requires
 * acceptance. The gate's documents are the ones a user has to agree to; these
 * are the published versions anyone can read from the footer.
 */
export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({ docKey, onClose }) => {
  const { locale, messages } = useLocale();
  const [documents, setDocuments] = useState<Catalogue | null>(cache);

  useEffect(() => {
    if (!docKey || documents) return;
    let live = true;
    loadDocuments().then((loaded) => {
      if (live) setDocuments(loaded);
    });
    return () => {
      live = false;
    };
  }, [docKey, documents]);

  useEffect(() => {
    if (!docKey) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [docKey, onClose]);

  if (!docKey) return null;

  const doc = documents?.[docKey]?.[locale === 'en' ? 'en' : 'es'] ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-doc-title"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[calc(100vh-3rem)] rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="legal-doc-title" className="text-lg font-semibold text-gray-900">
            {doc?.title ?? messages.legal.viewerTitle}
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

        <div className="px-6 py-5 overflow-y-auto text-sm text-gray-700 leading-relaxed flex-1">
          {doc ? (
            doc.nodes.map((node, i) => <Node key={i} node={node} />)
          ) : (
            <p className="text-gray-500">{messages.legal.loading}</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
