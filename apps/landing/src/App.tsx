import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <ThemeProvider>
      <LandingPage />
    </ThemeProvider>
  );
}

export default App;
