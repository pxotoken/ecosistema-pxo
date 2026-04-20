import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { User } from '@pxo/shared/types';
import { Shield, ShieldOff, AlertTriangle, Loader2 } from 'lucide-react';

interface UserWithRole extends Omit<User, 'user_type'> {
  user_type?: string;
  is_admin: boolean;
  role: 'admin' | 'user';
}

interface UserRoleModalProps {
  user: UserWithRole | null;
  isOpen: boolean;
  onClose: () => void;
  onRoleUpdate: (userId: string, action: 'grant_admin' | 'revoke_admin') => Promise<void>;
}

export const UserRoleModal: React.FC<UserRoleModalProps> = ({
  user,
  isOpen,
  onClose,
  onRoleUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (action: 'grant_admin' | 'revoke_admin') => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      await onRoleUpdate(user.id, action);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating role';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isCurrentlyAdmin = user.is_admin;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">
          Manage User Role
        </h2>

        <div className="mb-6 p-4 bg-light-glass dark:bg-dark-glass rounded-lg border border-light-border dark:border-dark-border">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Email</p>
              <p className="font-medium text-light-text dark:text-dark-text">{user.mail}</p>
            </div>
          </div>
          
          {user.first_name && user.last_name && (
            <div className="mt-3">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Name</p>
              <p className="font-medium text-light-text dark:text-dark-text">
                {user.first_name} {user.last_name}
              </p>
            </div>
          )}

          {user.wallet_address && (
            <div className="mt-3">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Wallet</p>
              <p className="font-mono text-xs text-light-text dark:text-dark-text break-all">
                {user.wallet_address}
              </p>
            </div>
          )}

          <div className="mt-3">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Current Role</p>
            <div className="flex items-center gap-2 mt-1">
              {isCurrentlyAdmin ? (
                <>
                  <Shield className="h-5 w-5 text-lime-accent" />
                  <span className="font-semibold text-lime-accent">Administrator</span>
                </>
              ) : (
                <>
                  <ShieldOff className="h-5 w-5 text-gray-500" />
                  <span className="font-semibold text-gray-500">User</span>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {isCurrentlyAdmin ? (
            <button
              onClick={() => handleRoleChange('revoke_admin')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShieldOff className="h-5 w-5" />
                  <span>Revoke Admin Permissions</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => handleRoleChange('grant_admin')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lime-accent hover:bg-lime-accent/90 disabled:bg-gray-400 text-black rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  <span>Grant Admin Permissions</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-light-text dark:text-dark-text rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};
