import React from 'react';
import { motion } from 'framer-motion';
import { AccedePXOButton } from '../crypto';
import { useAuthContext } from '../../contexts/AuthContext';

export const HeroSection: React.FC = () => {
  const { handleLogin, handleLogout } = useAuthContext();

  return (
    <section 
      className="relative px-6 py-20 min-h-[80vh] flex items-center bg-cover bg-center"
      style={{ backgroundImage: "url('/heroback.png')" }}
    >
          <div className="relative max-w-7xl mx-auto w-full px-6 md:pl-12 md:pr-48">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 md:gap-0">
          
          {/* Columna izquierda: título */}
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-white max-w-xl"
          >
            <h1 className="text-4xl md:text-6xl font-medium leading-snug md:leading-tight">
              <span className="hidden md:block">The digital<br />Mexican peso,<br />borderless</span>
              <span className="md:hidden">The digital<br />Mexican peso,<br />borderless</span>
            </h1>
          </motion.div>

          {/* Columna derecha: subtítulo y botón */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-start gap-4 max-w-sm"
          >
            <p className="text-white/80 text-lg md:text-xl">
              Invest, transfer and operate from <br className="hidden md:block" />
              anywhere in the world
            </p>

            <AccedePXOButton onLogin={handleLogin} onLogout={handleLogout} />
          </motion.div>
        </div>

        
      </div>
    </section>
  );
};
