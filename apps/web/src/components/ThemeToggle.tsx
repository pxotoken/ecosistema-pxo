import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES } from '../const';

type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const currentTheme = THEMES.find(t => t.value === theme) || THEMES[0];

  const handleThemeChange = (value: Theme) => {
    setTheme(value);
    setShowDropdown(false);
  };

  return (
    <>
      {/* Desktop version - horizontal buttons */}
      <div className="hidden md:flex items-center bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-full p-1">
        {THEMES.map((themeOption) => (
          <motion.button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`relative p-2 rounded-full transition-colors ${
              theme === themeOption.value
                ? 'text-pxo-primary dark:text-white'
                : 'text-light-text-secondary dark:text-white/30 hover:text-light-text dark:hover:text-white/60'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <themeOption.icon className="w-4 h-4" />
            {theme === themeOption.value && (
              <motion.div
                layoutId="activeTheme"
                className="absolute inset-0 bg-pxo-primary/10 dark:bg-white/10 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Mobile version - dropdown */}
      <div className="md:hidden relative">
        <motion.button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border text-pxo-primary dark:text-white"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <currentTheme.icon className="w-4 h-4" />
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-36 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden z-50"
              >
                {THEMES.map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => handleThemeChange(themeOption.value)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-colors ${
                      theme === themeOption.value
                        ? 'bg-pxo-primary/10 dark:bg-white/10 text-pxo-primary dark:text-white'
                        : 'text-light-text dark:text-white/30 hover:bg-light-glass dark:hover:bg-dark-glass dark:hover:text-white/60'
                    }`}
                  >
                    <themeOption.icon className="w-4 h-4" />
                    <span>{themeOption.label}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};