import { useActiveAccount } from 'thirdweb/react';

export const useUserEmail = () => {
  const account = useActiveAccount();
  
  // Por ahora retornamos un email placeholder
  // En el futuro esto se conectaría con el backend
  return account?.address ? `${account.address.slice(0, 8)}...@pxo.com` : 'usuario@pxo.com';
}; 