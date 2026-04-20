import React from 'react';
import { motion } from 'framer-motion';
import { ProductCarousel } from './ProductCarousel';

export const ProductSection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-light-text dark:text-dark-text font-editorial">Investment Products with PXO</h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">We offer three investment products with competitive APYs (6%, 15% and 20%) backed by regulated financial instruments</p>
        </div>
      </motion.div>

      {/* Product Carousel */}
      <ProductCarousel />
    </div>
  );
};