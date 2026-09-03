import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider } from './i18n';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { SessionManager } from './components/SessionManager';
import { AppRoutes } from './routes';

function AppInner() {
  const { isAuthenticated, login, logout } = useAuthContext();
  return (
    <SessionManager
      isAuthenticated={isAuthenticated}
      renewSession={async () => login()}
      endSession={async () => logout()}
    >
      <AppRoutes />
    </SessionManager>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <ToastProvider>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
