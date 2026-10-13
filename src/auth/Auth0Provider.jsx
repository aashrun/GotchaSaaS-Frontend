import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
export const auth0Configured = !!(
  import.meta.env.VITE_AUTH0_DOMAIN &&
  import.meta.env.VITE_AUTH0_CLIENT_ID &&
  import.meta.env.VITE_AUTH0_AUDIENCE
);
export function Auth0ProviderWithHistory({ children }) {
  const navigate = useNavigate();
  if (!auth0Configured) return children;
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin + '/auth/callback',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="memory"
      onRedirectCallback={() => navigate('/auth/callback')}
    >
      {children}
    </Auth0Provider>
  );
}
