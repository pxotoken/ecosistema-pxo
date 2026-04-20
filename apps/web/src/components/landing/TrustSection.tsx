import React from 'react';
import { motion } from 'framer-motion';

export const TrustSection: React.FC = () => {
  return (
    <section className="bg-[#002766] text-white py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">

        {/* Título */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-medium mb-16"
        >
          PXO is designed to solve concrete problems
        </motion.h2>

        {/* Logo para Mobile */}
        <div className="md:hidden flex items-center justify-center my-8">
          <img
            src="/avatar.png"
            alt="PXO logo"
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Contenido circular y responsivo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-x-24 md:gap-y-16">

          {/* Ítem: Remesas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-xs text-center md:text-right md:col-start-1 md:row-start-2"
          >
            <p className="text-xs text-white/60 mb-1">● Send</p>
            <h3 className="text-base font-semibold mb-1">Remittances</h3>
            <p className="text-sm text-white/70">
              Send PXOs to other people immediately, 24/7 and at a very low cost.
            </p>
          </motion.div>

          {/* Ítem: Opera */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="max-w-xs text-center md:text-right md:col-start-1 md:row-start-3"
          >
            <p className="text-xs text-white/60 mb-1">● Trading</p>
            <h3 className="text-base font-semibold mb-1">Trade</h3>
            <p className="text-sm text-white/70">
              Trade with PXO and USDT and get greater benefits with the exchange rate.
            </p>
          </motion.div>

          

          {/* Logo central para Desktop */}
          <div className="hidden md:flex md:col-start-2 md:row-start-1 md:row-span-3 items-center justify-center">
            <img
              src="/avatar.png"
              alt="PXO logo"
              className="w-40 h-40 object-contain"
            />
          </div>

          {/* Ítem: Beneficios */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="max-w-xs text-center md:text-left md:col-start-3 md:row-start-2"
          >
            <p className="text-xs text-white/60 mb-1">● Earn</p>
            <h3 className="text-base font-semibold mb-1">Benefits</h3>
            <p className="text-sm text-white/70">
              Subscribe to PXO programs and get benefits.
            </p>
          </motion.div>

          {/* Ítem: Convierte */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="max-w-xs text-center md:text-left md:col-start-3 md:row-start-3"
          >
            <p className="text-xs text-white/60 mb-1">● Swap</p>
            <h3 className="text-base font-semibold mb-1">Convert</h3>
            <p className="text-sm text-white/70">
              Exchange other stablecoins for PXO and save them in your wallet.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
};