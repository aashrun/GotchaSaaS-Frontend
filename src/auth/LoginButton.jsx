import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '../components/ui/button.jsx';

export default function LoginButton({ children = 'Sign In', ...props }) {
  const { loginWithRedirect } = useAuth0();
  return (
    <Button onClick={() => loginWithRedirect()} {...props}>
      {children}
    </Button>
  );
}
