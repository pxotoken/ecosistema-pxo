import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const benefits = [
  "No hidden fees",
  "Real-time exchange rates",
  "Intuitive and modern interface",
  "Regulatory compliance",
];

export const BenefitsSection: React.FC = () => {
  return (
    <section id="beneficios" className="py-20 bg-gray-50 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            PXO is a tool designed to provide better financial opportunities
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We remove the traditional barriers of the financial system to create a more efficient and accessible experience
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-pxo-primary flex-shrink-0 mt-1" />
                <span className="text-gray-800 font-medium">{benefit}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
