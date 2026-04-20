import React from 'react';
import { motion } from 'framer-motion';

export const StablecoinNetworkVisualization: React.FC = () => {
  return (
    <section className="bg-white text-center py-20">
      <div className="max-w-4xl mx-auto px-6">
        <motion.h2
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
        >
          1 PXO will always be 1 MXN
        </motion.h2>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="w-full"
      >
        <img
          src="/Diferencia.png"
          alt="Mapa Transacciones PXO"
          className="w-full h-auto object-cover"
        />
      </motion.div>

    </section>
  );
};
