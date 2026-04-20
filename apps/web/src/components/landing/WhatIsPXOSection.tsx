import React from 'react';
import { Shield, Zap, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export const WhatIsPXOSection: React.FC = () => {
  return (
    <section id="que-es-pxo" className="bg-gray-50 py-20 text-center px-6 scroll-mt-16">
      <div className="max-w-4xl mx-auto">
        
        {/* Ícono central */}
        <div className="flex justify-center mb-6">
          <motion.img
            src="/LOGO_2.png"
            alt="PXO Logo"
            className="h-20 md:h-24"
            initial={{ y: 0 }}
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
            }}
          />
        </div>

        {/* Título */}
        <h2 className="text-2xl md:text-3xl font-bold text-pxo-primary-dark">
          What is PXO?
        </h2>

        {/* Subtítulo */}
        <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-3xl mx-auto mt-4 mb-10 md:mb-16">
          PXO is a digital asset that securely, efficiently, and globally represents the value of the Mexican peso.Our blockchain technology enables instant transfers without intermediaries, reducing costs and transaction times while preserving the value of your localcurrency.
        </p>

        {/* Íconos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* Seguro */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
              <img src="/seguro.png" alt="Seguro" className="w-20 h-20 object-contain" />
            </div>
            <h4 className="font-semibold mt-4 text-pxo-primary-dark">Secure</h4>
            <p className="text-sm text-gray-600 mt-1 text-center">
              Backed by blockchain technology<br />and financial regulations
            </p>
          </div>

          {/* Instantáneo */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
              <img src="/inst.png" alt="Instantáneo" className="w-20 h-20 object-contain" />
            </div>
            <h4 className="font-semibold mt-4 text-pxo-primary-dark">Instant</h4>
            <p className="text-sm text-gray-600 mt-1 text-center">
              Transfers in seconds,<br />available 24/7
            </p>
          </div>

          {/* Global */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
              <img src="/global.png" alt="Global" className="w-24 h-24 object-contain" />
            </div>
            <h4 className="font-semibold mt-4 text-pxo-primary-dark">Global</h4>
            <p className="text-sm text-gray-600 mt-1 text-center">
              Send Mexican pesos to any<br />part of the world
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};
