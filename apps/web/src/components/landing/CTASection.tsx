import React from 'react';
import { motion } from 'framer-motion';
import { AccedePXOButton } from '../crypto';

export const CTASection: React.FC = () => {

  const items = [
    {
      icon: '/multi.svg',
      title: '1:1 Backing',
      description:
        'Each PXO is equivalent to 1 MXN in auditable bank reserves, guaranteeing absolute parity and instant redeemability.',
    },
    {
      icon: '/triangle.svg',
      title: 'Audit',
      description:
        'The PXO supply is transparent, with verifiable reserves in real-time through blockchain and external audits.',
    },
    {
      icon: '/square.png',
      title: 'Institutional Custody',
      description:
        'The MXN funds are held by regulated banks, with insurance and anti-fraud protocols for maximum security.',
    },
    {
      icon: '/check.svg',
      title: 'Controlled Risk Architecture',
      description:
        'Multi-signatures, audited contracts, and emergency mechanisms protect PXO from hacking or embezzlement.',
    },
  ];

  return (
<section className="bg-gradient-to-br from-white to-[#f4f6fa] py-20 px-6">
  <div className="max-w-6xl mx-auto">
    
    {/* Fila 1 */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
      {items.slice(0, 2).map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          viewport={{ once: true }}
          className="bg-white rounded-xl shadow-md p-6 flex flex-col gap-4"
        >
          <img src={item.icon} alt={item.title} className="w-10 h-10" />
          <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600">{item.description}</p>
        </motion.div>
      ))}
    </div>

    {/* Fila 2 desplazada */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:pl-20">
      {items.slice(2, 4).map((item, index) => (
        <motion.div
          key={index + 2}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
          viewport={{ once: true }}
          className="bg-white rounded-xl shadow-md p-6 flex flex-col gap-4"
        >
          <img src={item.icon} alt={item.title} className="w-10 h-10" />
          <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600">{item.description}</p>
        </motion.div>
      ))}
    </div>

    {/* CTA Button */}
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      viewport={{ once: true }}
      className="flex justify-center mt-12"
    >
      <AccedePXOButton />
    </motion.div>

  </div>
</section>
);
};
