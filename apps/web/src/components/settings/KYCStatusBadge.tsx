import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, XCircle, UserCheck } from 'lucide-react';

interface KYCStatusBadgeProps {
  status: "PENDING" | "VALIDATING" | "VALIDATED" | "BLOCKED" | "REJECTED";
  className?: string;
}

export const KYCStatusBadge: React.FC<KYCStatusBadgeProps> = ({ 
  status, 
  className = "" 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case "PENDING":
        return {
          icon: Clock,
          label: "Pending",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          iconColor: "text-gray-500"
        };
      case "VALIDATING":
        return {
          icon: Clock,
          label: "Under Validation",
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200",
          iconColor: "text-yellow-500"
        };
      case "VALIDATED":
        return {
          icon: CheckCircle,
          label: "Validated",
          color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200",
          iconColor: "text-green-500"
        };
      case "BLOCKED":
        return {
          icon: XCircle,
          label: "Blocked",
          color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200",
          iconColor: "text-red-500"
        };
      case "REJECTED":
        return {
          icon: AlertCircle,
          label: "Rejected",
          color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200",
          iconColor: "text-red-500"
        };
      default:
        return {
          icon: UserCheck,
          label: "Unknown",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          iconColor: "text-gray-500"
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}
    >
      <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
      <span>{config.label}</span>
    </motion.div>
  );
};
