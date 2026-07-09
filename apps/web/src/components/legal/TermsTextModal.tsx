import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface TermsTextModalProps {
  open: boolean;
  title: string;
  body: string;
  onDisagree: () => void;
  onAccept: () => void;
}

export const TermsTextModal: React.FC<TermsTextModalProps> = ({
  open,
  title,
  body,
  onDisagree,
  onAccept,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedBottom, setReachedBottom] = useState(false);

  useEffect(() => {
    if (!open) setReachedBottom(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    // If body is short enough to not require scrolling, enable immediately.
    if (el.scrollHeight <= el.clientHeight + 4) setReachedBottom(true);
  }, [open]);

  if (!open) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= 16) setReachedBottom(true);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-text-modal-title"
    >
      <div className="bg-white w-full max-w-2xl max-h-[calc(100vh-3rem)] rounded-lg shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 id="terms-text-modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onDisagree}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="px-6 py-4 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 leading-relaxed flex-1"
        >
          {body}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onDisagree}
            className="px-5 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
          >
            Disagree
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={!reachedBottom}
            className={`px-5 py-2 rounded-md text-sm font-medium text-white transition ${
              reachedBottom
                ? 'bg-pxo-primary hover:opacity-90'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title={reachedBottom ? '' : 'Scroll to the end of the document to enable'}
          >
            Accept
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
