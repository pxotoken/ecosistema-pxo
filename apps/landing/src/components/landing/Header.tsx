import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useLandingNavigation } from '../../hooks/useLandingNavigation';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { handleAnchorClick } = useLandingNavigation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navLinks = [
    { href: "#que-es-pxo", text: "What is PXO?" },
    { href: "#como-funciona", text: "How it works?" },
    { href: "#beneficios", text: "Benefits" },
    { href: "#contacto", text: "Contact" },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/logohead.png" alt="PXO Logo" className="h-20" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleAnchorClick}
              className="text-gray-600 hover:text-pxo-primary font-medium transition-colors"
            >
              {link.text}
            </a>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button onClick={toggleMenu} className="text-gray-600 focus:outline-none">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className="hidden md:block">
          <a
            href="#contacto"
            onClick={handleAnchorClick}
            className="bg-pxo-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-pxo-secondary transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100 py-4"
        >
          <nav className="flex flex-col items-center space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  handleAnchorClick(e);
                  toggleMenu(); // Close menu on link click
                }}
                className="text-gray-800 hover:text-pxo-primary font-medium transition-colors text-lg"
              >
                {link.text}
              </a>
            ))}
            <a
              href="#contacto"
              onClick={(e) => {
                handleAnchorClick(e);
                toggleMenu();
              }}
              className="bg-pxo-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-pxo-secondary transition-colors"
            >
              Get Started
            </a>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
};
