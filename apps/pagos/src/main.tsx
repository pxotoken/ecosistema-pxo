import { StrictMode } from 'react';
import { PAYMENTS_CHAIN_ID } from './config/env';
console.log('[pagos main] PAYMENTS_CHAIN_ID', PAYMENTS_CHAIN_ID, 'raw', import.meta.env.VITE_PAYMENTS_CHAIN_ID);
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThirdwebProvider } from './providers/ThirdwebProvider';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThirdwebProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThirdwebProvider>
  </StrictMode>,
);
