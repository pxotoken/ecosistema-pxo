import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface ProductCardProps {
  title: string;
  description: string;
  riskLevel: "High" | "Medium" | "Low";
  features: string[];
  onLearnMore: () => void;
  imageUrl: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  description,
  riskLevel,
  features,
  onLearnMore,
  imageUrl,
}) => {
  const riskColorClass = {
    High: "text-red-500",
    Medium: "text-orange-500",
    Low: "text-green-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`h-full flex flex-col relative bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-sm border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-glass transition-all duration-300 hover:shadow-glow hover:border-lime-accent/30`}
    >
      <div className="relative aspect-[2/1] overflow-hidden">
        <img
          src={imageUrl}
          alt="Product Investment"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-2xl font-bold text-light-text dark:text-dark-text font-editorial mb-2">
          {title}
        </h3>
        <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-4">
          {description}
        </p>

        <div className="mb-4 relative z-10">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${riskColorClass[riskLevel]} bg-current/10`}
          >
            Risk: {riskLevel}
          </span>
        </div>

        <ul className="space-y-2 mb-6 flex-1">
          {features.map((feature, index) => (
            <li
              key={index}
              className="flex items-center text-light-text dark:text-dark-text text-sm"
            >
              <ArrowRight
                size={16}
                className="mr-2 text-lime-accent dark:text-dark-text"
              />
              {feature}
            </li>
          ))}
        </ul>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLearnMore}
          className="self-center sm:self-start bg-lime-accent text-white px-6 py-3 rounded-xl font-medium hover:bg-lime-accent/90 transition-colors duration-300 mb-8 sm:mb-0"
        >
          Learn More
        </motion.button>
      </div>
    </motion.div>
  );
};
