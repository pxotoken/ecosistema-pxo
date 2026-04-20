import React, { useState, useEffect } from 'react';
import { UsersTable } from './UsersTable';
import { UserRoleModal } from './UserRoleModal';
import { useUsers } from '../../hooks/useUsers';
import useAuth from '../../hooks/useAuth';
import { User } from '@pxo/shared/types';
import { Search, Users, Shield, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserWithRole extends Omit<User, 'user_type'> {
  user_type?: string;
  is_admin: boolean;
  role: 'admin' | 'user';
}

export const UserAdminPage: React.FC = () => {
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const isAdmin = currentUser?.user_type?.includes("989e3702-b515-4d6e-8627-fa0142a1a88f") || 
                  currentUser?.mail === "admin@pxo.com";

  const { users, loading, error, totalCount, fetchUsers, updateUserRole, refetch } = useUsers();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers(debouncedSearch || undefined);
    }
  }, [debouncedSearch, isAuthenticated, fetchUsers]);

  const handleEditRole = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleRoleUpdate = async (userId: string, action: 'grant_admin' | 'revoke_admin') => {
    await updateUserRole(userId, action);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-lime-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Access Denied
              </h1>
              <p className="text-red-600 dark:text-red-400">
                You must be authenticated to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                Access Denied
              </h1>
              <p className="text-red-600 dark:text-red-400">
                You do not have administrator permissions to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const adminCount = users.filter(u => u.is_admin).length;
  const userCount = users.length - adminCount;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">
            User Administration
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Manage user roles and permissions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-4 shadow-glass"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-lime-accent/20 rounded-lg">
                <Users className="h-6 w-6 text-lime-accent" />
              </div>
              <div>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {totalCount}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-4 shadow-glass"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Administrators
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {adminCount}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-gradient-to-br from-light-surface to-light-glass dark:from-dark-surface dark:to-dark-glass border border-light-border dark:border-dark-border rounded-lg p-4 shadow-glass"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-500/20 rounded-lg">
                <Users className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Regular Users
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {userCount}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-glass border border-light-border dark:border-dark-border p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
              <input
                type="text"
                placeholder="Search by email, name or wallet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-light-glass dark:bg-dark-glass border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-lime-accent"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={refetch}
              className="flex items-center gap-2 px-4 py-2 bg-lime-accent hover:bg-lime-accent/90 text-black rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </motion.button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <UsersTable 
            users={users}
            loading={loading}
            onEditRole={handleEditRole}
          />
        </div>
      </motion.div>

      <UserRoleModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoleUpdate={handleRoleUpdate}
      />
    </div>
  );
};
