import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { ThemeProvider, useTheme } from './components/theme/ThemeProvider';
import { AuthProvider } from './auth/AuthProvider';
import { Auth0ProviderWithHistory } from './auth/Auth0Provider';
import './index.css';
import './workspace.css';
function Notifications() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" />;
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Auth0ProviderWithHistory>
            <App />
            <Notifications />
          </Auth0ProviderWithHistory>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
