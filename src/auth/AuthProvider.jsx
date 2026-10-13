import { createContext, useContext, useState, useEffect } from 'react';
import api, { setCsrf } from '../lib/api';
import { useTheme } from '../components/theme/ThemeProvider';
import { useNavigate } from 'react-router-dom';
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [sessionEnded, setSessionEnded] = useState(false);
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const clearSession = () => {
    setSessionEnded(true);
    navigate('/auth/login', { replace: true });
    setUser(null);
    setCsrf('');
  };
  const accept = (data) => {
    setSessionEnded(false);
    setUser(data.user);
    setCsrf(data.csrfToken);
    if (data.user?.theme) setTheme(data.user.theme);
  };
  const refresh = async () => {
    try {
      const { data } = await api.get('/auth/me');
      accept(data);
    } catch (e) {
      if (e.response?.status === 401) {
        setUser(null);
        setCsrf('');
      } else throw e;
    }
  };
  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const signIn = async (mode, values) => {
    const { data } = await api.post('/auth/' + mode, values);
    sessionStorage.setItem('nebula-login-at', String(Date.now()));
    accept(data);
    return data;
  };
  const logout = async () => {
    await api.post('/auth/logout');
    clearSession();
  };
  return (
    <Context.Provider
      value={{ user, loading, signIn, logout, refresh, accept, clearSession, sessionEnded }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
