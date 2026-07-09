import React from 'react';

export const MainFooter: React.FC = () => {
  return (
    <footer className="border-t border-light-border dark:border-dark-border bg-light-surface/60 dark:bg-dark-surface/60 backdrop-blur-glass px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center">
          <img
            src="/LOGO_DARK.png"
            alt="PXO"
            className="h-6 w-auto dark:hidden"
          />
          <img
            src="/LOGO_1.png"
            alt="PXO"
            className="h-6 w-auto hidden dark:block"
          />
        </div>

        <div className="flex items-center gap-6 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          <span className="cursor-default select-none">Transparency</span>
          <span className="cursor-default select-none">Legal</span>
        </div>

        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
          © 2023 - 2026 Pxotoken.com. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
