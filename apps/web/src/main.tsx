import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThirdwebProvider } from './providers/ThirdwebProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThirdwebProvider>
      <App />
    </ThirdwebProvider>
  </StrictMode>
);

window.scrollTo(0, 0); // Asegura que la página siempre inicie en la parte superior
