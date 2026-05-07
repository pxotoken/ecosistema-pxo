import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ThirdwebProvider } from './providers/ThirdwebProvider';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThirdwebProvider>
      <App />
    </ThirdwebProvider>
  </BrowserRouter>
);

window.scrollTo(0, 0); // Asegura que la página siempre inicie en la parte superior
