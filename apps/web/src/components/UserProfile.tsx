import React, { useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { useKYC } from '../hooks/useKYC';
import { KYCStatus } from '@pxo/shared/types';

export const UserProfile: React.FC = () => {
  const { user, loadingLogin: loading, error, isAuthenticated, login, logout, refreshUser } = useAuth();
  const { submitKYCData, updateKYCStatus } = useKYC();

  const handleSubmitKYC = async () => {
    if (!user?.id) return;

    try {
      await submitKYCData(user.id, {
        legal_identification: 'ABC123456',
        imagen_KYC: 'https://example.com/kyc-image.jpg',
        selfie_pictures: ['https://example.com/selfie1.jpg'],
        identification_photos: ['https://example.com/id1.jpg', 'https://example.com/id2.jpg']
      });
      
      // Refresh user data after KYC submission
      await refreshUser();
    } catch (error) {
      console.error('Error submitting KYC:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button
          onClick={login}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
        <p className="mb-4">Please connect your wallet to view your profile.</p>
        <button
          onClick={login}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold">User Profile</h2>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      
      {user ? (
        <div>
          <div className="mb-4">
            <strong>Email:</strong> {user.mail}
          </div>
          <div className="mb-4">
            <strong>Wallet Address:</strong> 
            <span className="font-mono text-sm ml-2">
              {user.wallet_address?.slice(0, 6)}...{user.wallet_address?.slice(-4)}
            </span>
          </div>
          <div className="mb-4">
            <strong>KYC Status:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              user.KYC_status === KYCStatus.VALIDATED ? 'bg-green-100 text-green-800' :
              user.KYC_status === KYCStatus.VALIDATING ? 'bg-yellow-100 text-yellow-800' :
              user.KYC_status === KYCStatus.BLOCKED ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user.KYC_status}
            </span>
          </div>
          
          {user.first_name && (
            <div className="mb-4">
              <strong>Name:</strong> {user.first_name} {user.last_name}
            </div>
          )}
          
          {user.country && (
            <div className="mb-4">
              <strong>Country:</strong> {user.country}
            </div>
          )}
          
          {user.last_access && (
            <div className="mb-4">
              <strong>Last Access:</strong> {new Date(user.last_access).toLocaleString()}
            </div>
          )}
          
          {user.KYC_status === KYCStatus.PENDING && (
            <button
              onClick={handleSubmitKYC}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Submit KYC
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-4">Loading user data...</p>
        </div>
      )}
    </div>
  );
};

