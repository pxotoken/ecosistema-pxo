import { useState } from 'react';
import { User, CreateUserRequest, UpdateUserRequest } from '@pxo/shared/types';
import api, { getApiError } from '../lib/api';

const API_BASE_URL = '/api/users';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (userData: CreateUserRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.post(API_BASE_URL, userData);
      setUser(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = getApiError(err, 'Failed to create user');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserByWalletAddress = async (walletAddress: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.get(`${API_BASE_URL}?wallet_address=${walletAddress}`);
      setUser(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = getApiError(err, 'Failed to fetch user');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserByEmail = async (email: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.get(`${API_BASE_URL}?email=${encodeURIComponent(email)}`);
      setUser(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = getApiError(err, 'Failed to fetch user');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: UpdateUserRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.put(API_BASE_URL, userData);
      setUser(result.data);
      return result.data;
    } catch (err) {
      const errorMessage = getApiError(err, 'Failed to update user');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearUser = () => {
    setUser(null);
    setError(null);
  };

  return {
    user,
    loading,
    error,
    createUser,
    getUserByWalletAddress,
    getUserByEmail,
    updateUser,
    clearUser,
  };
};





