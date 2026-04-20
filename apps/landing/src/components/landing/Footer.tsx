import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#002766] text-white py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-10 text-center">



        {/* Logo central */}
        <img src="/LOGO_1.png" alt="PXO Logo" className="h-20 md:h-28" />

        {/* Linea inferior: derechos y ano */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center text-xs text-white/70 gap-2 border-t border-white/10 pt-6">
          <span>PXO. All rights reserved. | <a href="#" className="underline hover:text-white">Privacy Policy</a></span>
          <span>2025</span>
        </div>
      </div>
    </footer>
  );
};
