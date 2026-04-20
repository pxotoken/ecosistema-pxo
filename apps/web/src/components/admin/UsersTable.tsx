import React from 'react';
import { User } from '@pxo/shared/types';
import { Shield, Edit2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserWithRole extends Omit<User, 'user_type'> {
  user_type?: string;
  is_admin: boolean;
  role: 'admin' | 'user';
}

interface UsersTableProps {
  users: UserWithRole[];
  loading: boolean;
  onEditRole: (user: UserWithRole) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users, loading, onEditRole }) => {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getKycStatusBadge = (status: string | undefined) => {
    const statusConfig = {
      VALIDATED: { 
        icon: CheckCircle, 
        color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
        label: 'Validated'
      },
      VALIDATING: { 
        icon: Clock, 
        color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
        label: 'In validation'
      },
      PENDING: { 
        icon: Clock, 
        color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400',
        label: 'Pending'
      },
      BLOCKED: { 
        icon: XCircle, 
        color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
        label: 'Blocked'
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-accent"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          No users found
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-light-border dark:border-dark-border">
      <table className="w-full">
        <thead className="bg-light-glass dark:bg-dark-glass border-b border-light-border dark:border-dark-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Wallet
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Country
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              KYC
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Registration
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-surface divide-y divide-light-border dark:divide-dark-border">
          {users.map((user, index) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="hover:bg-light-glass dark:hover:bg-dark-glass transition-colors"
            >
              <td className="px-4 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-light-text dark:text-dark-text">
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : 'No name'}
                  </span>
                  <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    {user.mail}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-xs font-mono text-light-text-secondary dark:text-dark-text-secondary">
                  {formatAddress(user.wallet_address)}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-light-text dark:text-dark-text">
                  {user.country || 'N/A'}
                </span>
              </td>
              <td className="px-4 py-4">
                {getKycStatusBadge(user.KYC_status)}
              </td>
              <td className="px-4 py-4">
                {user.is_admin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-lime-accent bg-lime-accent/20">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400">
                    User
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {formatDate(user.created_at)}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onEditRole(user)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-light-text dark:text-dark-text bg-light-glass dark:bg-dark-glass hover:bg-lime-accent/20 dark:hover:bg-lime-accent/20 border border-light-border dark:border-dark-border rounded-md transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit Role
                </motion.button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
