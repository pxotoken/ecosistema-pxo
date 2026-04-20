import React from 'react';
import { motion } from 'framer-motion';

const howItWorks = [
  {
    step: "01",
    title: "Create your account",
    description: "Register in minutes with instant verification and start using PXO immediately.",
    icon: "/agcuenta.png"
  },
  {
    step: "02",
    title: "Add funds",
    description: "Transfer money from your bank or card securely with the best market rates.",
    icon: "/afondos.png"
  },
  {
    step: "03",
    title: "Send money",
    description: "Make instant global transfers with full transparency and no hidden fees.",
    icon: "/sendpxo.png"
  }
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="como-funciona" className="py-20 bg-white scroll-mt-16">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How does PXO work?</h2>
          <p className="text-xl text-gray-600">Three simple steps to start using the digital peso</p>
        </motion.div>

        <div className="space-y-16 md:space-y-12 md:flex md:flex-col md:items-center">
          {howItWorks.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ y: 100, opacity: 0, scale: 0.9 }}
              whileInView={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.4 }}
              className={`bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center md:flex-row md:text-left md:gap-10 border border-gray-100 max-w-xl w-full ${
                index % 2 === 1 ? 'md:self-end' : 'md:self-start'
              }`}
            >
              {/* Icon Area */}
              <div className="flex-shrink-0 relative w-32 h-32 bg-gradient-to-br from-pxo-primary/10 to-pxo-primary/20 rounded-full flex items-center justify-center mb-6 md:mb-0">
                <img src={step.icon} alt={step.title} className={`w-full h-full object-cover ${index === 2 ? 'scale-120' : ''}`} />
              </div>

              {/* Text content + number */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pxo-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {step.step}
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
