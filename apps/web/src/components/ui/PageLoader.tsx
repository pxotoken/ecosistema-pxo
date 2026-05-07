import { motion } from 'framer-motion';

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-light-base dark:bg-dark-base flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center gap-8"
      >
        <img
          src="/LOGO_DARK.png"
          alt="PXO"
          className="h-12 w-auto dark:hidden"
        />
        <img
          src="/LOGO_1.png"
          alt="PXO"
          className="h-12 w-auto hidden dark:block"
        />

        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-pxo-primary"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
