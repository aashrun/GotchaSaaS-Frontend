import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '../components/ui/button.jsx';

export default function LogoutButton({ children = 'Log Out', ...props }) {
  const { logout } = useAuth0();
  return (
    <Button
      variant="outline"
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      {...props}
    >
      {children}
    </Button>
  );
}
