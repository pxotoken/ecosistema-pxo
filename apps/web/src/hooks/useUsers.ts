import { useState, useEffect, useCallback } from 'react';
import { User } from '@pxo/shared/types';
import api, { getApiError } from '../lib/api';

interface UserWithRole extends Omit<User, 'user_type'> {
  user_type?: string;
  is_admin: boolean;
  role: 'admin' | 'user';
}

interface UseUsersResult {
  users: UserWithRole[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  fetchUsers: (search?: string, limit?: number, offset?: number) => Promise<void>;
  updateUserRole: (userId: string, action: 'grant_admin' | 'revoke_admin') => Promise<void>;
  refetch: () => void;
}

interface ApiResponse {
  data: UserWithRole[];
  count: number;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const useUsers = (): UseUsersResult => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [lastParams, setLastParams] = useState<{ search?: string; limit?: number; offset?: number }>({});

  const fetchUsers = useCallback(async (search?: string, limit: number = 50, offset: number = 0) => {
    setLoading(true);
    setError(null);
    setLastParams({ search, limit, offset });

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const { data: result } = await api.get<ApiResponse>(`/api/users/admin?${params.toString()}`);
      setUsers(result.data);
      setTotalCount(result.count);
    } catch (err) {
      setError(getApiError(err, 'Failed to fetch users'));
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, action: 'grant_admin' | 'revoke_admin') => {
    try {
      const { data: result } = await api.put('/api/users/admin', { userId, action });
      
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? result.data : user
        )
      );

      return result.data;
    } catch (err) {
      console.error('Error updating user role:', err);
      throw new Error(getApiError(err, 'Failed to update user role'));
    }
  }, []);

  const refetch = useCallback(() => {
    fetchUsers(lastParams.search, lastParams.limit, lastParams.offset);
  }, [fetchUsers, lastParams]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    totalCount,
    fetchUsers,
    updateUserRole,
    refetch,
  };
};
