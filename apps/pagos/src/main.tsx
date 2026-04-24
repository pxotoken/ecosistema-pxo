import { StrictMode } from 'react';
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
