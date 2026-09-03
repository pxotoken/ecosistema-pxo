import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SubProduct {
  id: string;
  name: string;
  description: string;
  minInvestment: number;
  expectedReturn: string;
}

interface ProductCategory {
  title: string;
  description: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  features: string[];
  subProducts: SubProduct[];
}

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: ProductCategory | null;
  allCategories: ProductCategory[];
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
}) => {
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedSubProduct, setSelectedSubProduct] = useState<SubProduct | null>(null);

  // Debugging: Log initial props and state
  console.log("ProductDetailsModal - Render:", { isOpen, initialCategory, currentView, selectedSubProduct });

  // Reset state when modal opens/closes or initialCategory changes
  useEffect(() => {
    if (isOpen) {
      console.log("ProductDetailsModal - useEffect: Modal is open, resetting state.");
      setCurrentView('list'); // Always start in list view when modal opens
      setSelectedSubProduct(null); // Clear selected sub-product
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleViewSubProduct = (_subProduct: SubProduct) => {
    // Feature temporarily disabled as per user request.
    // This function previously set the selected sub-product and changed the view to 'detail'.
    console.log("handleViewSubProduct: La función para ver los detalles del subproducto está temporalmente deshabilitada.");
  };

  const handleBackToList = () => {
    console.log("handleBackToList: Returning to list view.");
    setCurrentView('list');
    setSelectedSubProduct(null);
  };

  const renderSubProductList = () => {
    console.log("renderSubProductList: initialCategory", initialCategory);
    if (!initialCategory) {
      console.log("renderSubProductList: initialCategory is null, returning null.");
      return null;
    }
    console.log("renderSubProductList: initialCategory.subProducts.length", initialCategory.subProducts.length);

    return (
      <>
        <div className="relative p-6 border-b border-light-border dark:border-dark-border">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text font-editorial mb-2 text-center">
            {initialCategory.title}
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-4 text-center">
            {initialCategory.description}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="text-xl font-bold text-light-text dark:text-dark-text font-editorial mb-4">Available Investments</h3>
          {initialCategory.subProducts.map((subProduct, index) => (
            <motion.div
              key={subProduct.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-xl shadow-glass transition-all duration-300 cursor-pointer hover:shadow-glow hover:border-lime-accent/30"
              onClick={() => handleViewSubProduct(subProduct)}
            >
              <div>
                <p className="font-medium text-light-text dark:text-dark-text">{subProduct.name}</p>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Min. Investment: ${subProduct.minInvestment}</p>
              </div>
              <ArrowRight size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
            </motion.div>
          ))}
        </div>
      </>
    );
  };

  const renderSubProductDetail = () => {
    // Debugging: Log selectedSubProduct before rendering
    console.log("renderSubProductDetail: selectedSubProduct", selectedSubProduct);
    console.log("renderSubProductDetail: initialCategory", initialCategory);

    if (!selectedSubProduct || !initialCategory) {
      console.log("renderSubProductDetail: selectedSubProduct or initialCategory is null, returning null.");
      return null; // Ensure selectedSubProduct is not null
    }

    const [investmentAmount, setInvestmentAmount] = useState<number | string>('');

    const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
        setInvestmentAmount(value);
      }
    };

    const handleInvestNow = () => {
      if (parseFloat(investmentAmount as string) >= selectedSubProduct.minInvestment) {
        alert(`Investing $${investmentAmount} in ${selectedSubProduct.name}`);
        // Aquí iría la lógica real de inversión
        onClose();
      } else {
        alert(`Minimum investment for ${selectedSubProduct.name} is $${selectedSubProduct.minInvestment}`);
      }
    };

    const relatedSubProducts = initialCategory.subProducts.filter(
      (sp) => sp.id !== selectedSubProduct.id
    );

    return (
      <>
        <div className="relative p-6 border-b border-light-border dark:border-dark-border">
          <button
            onClick={handleBackToList}
            className="absolute top-4 left-4 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text font-editorial mb-2">
            {selectedSubProduct?.name ?? 'Product Name N/A'}
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-4">
            Expected Return: {selectedSubProduct?.expectedReturn ?? 'N/A'}
          </p>
        </div>

        <div className="p-6 bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-xl hover:border-lime-accent/30 transition-all hover:shadow-glow duration-300">
          <p className="text-light-text-secondary dark:text-dark-text-secondary text-base mb-4">
            {selectedSubProduct?.description ?? 'No description available.'}
          </p>

          <h3 className="text-xl font-bold text-light-text dark:text-dark-text font-editorial mb-3">Investment Details</h3>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center text-light-text dark:text-dark-text text-sm">
              <ArrowRight size={16} className="mr-2 text-lime-accent dark:text-dark-text" />
              Minimum Investment: ${selectedSubProduct?.minInvestment ?? 'N/A'}
            </li>
            <li className="flex items-center text-light-text dark:text-dark-text text-sm">
              <ArrowRight size={16} className="mr-2 text-lime-accent dark:text-dark-text" />
              Expected Return: {selectedSubProduct?.expectedReturn ?? 'N/A'}
            </li>
          </ul>

          <div className="mt-6 pt-6 border-t border-light-border dark:border-dark-border">
            <h3 className="text-xl font-bold text-light-text dark:text-dark-text font-editorial mb-3">Invest Now</h3>
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="number"
                value={investmentAmount}
                onChange={handleInvestmentChange}
                placeholder={`Min. ${selectedSubProduct?.minInvestment ?? 'N/A'}`}
                className="flex-1 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-lg px-4 py-2 text-light-text dark:text-dark-text focus:outline-none focus:border-lime-accent/50 transition-colors duration-300"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInvestNow}
                className="bg-lime-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-lime-accent/90 transition-colors duration-300"
              >
                Invest Now
              </motion.button>
            </div>
          </div>

          {relatedSubProducts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-light-border dark:border-dark-border">
              <h3 className="text-xl font-bold text-light-text dark:text-dark-text font-editorial mb-4">More {initialCategory?.title ?? 'Related'} Products</h3>
              <div className="space-y-3">
                {relatedSubProducts.map((relatedSp) => (
                  <div
                    key={relatedSp.id}
                    className="flex items-center justify-between p-4 bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-xl shadow-glass transition-all duration-300 cursor-pointer hover:shadow-glow hover:border-lime-accent/30"
                    onClick={() => handleViewSubProduct(relatedSp)}
                  >
                    <div>
                      <p className="font-medium text-light-text dark:text-dark-text">{relatedSp.name}</p>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Min. Investment: ${relatedSp.minInvestment}</p>
                    </div>
                    <ArrowRight size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={onClose}
        >
          <motion.div
            key={currentView === 'list' ? 'list-view' : selectedSubProduct?.id || 'detail-view'} // Unique key for re-render
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-[600px] max-h-[90vh] bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-y-auto border border-light-border dark:border-dark-border"
            onClick={(e) => e.stopPropagation()}
          >
            {currentView === 'list' ? renderSubProductList() : renderSubProductDetail()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
};