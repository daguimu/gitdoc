import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearOAuthState,
  exchangeCodeForToken,
  getToken,
  getUser,
  isAuthenticated as checkAuth,
  logout as doLogout,
  saveToken,
  saveUser,
} from '../services/auth';
import { getCurrentUser } from '../services/github';

interface User {
  login: string;
  avatar_url: string;
  name: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(getUser());
  const [authenticated, setAuthenticated] = useState(checkAuth());
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const fetchUser = useCallback(async (): Promise<boolean> => {
    try {
      const userData = await getCurrentUser();
      const u = { login: userData.login, avatar_url: userData.avatar_url, name: userData.name };
      saveUser(u);
      setUser(u);
      return true;
    } catch {
      doLogout();
      setAuthenticated(false);
      setUser(null);
      navigate('/login', { replace: true });
      return false;
    }
  }, [navigate]);

  const handleCallback = useCallback(
    async (code: string, state: string) => {
      setLoading(true);
      try {
        const token = await exchangeCodeForToken(code, state);
        saveToken(token);
        setAuthenticated(true);
        const loaded = await fetchUser();
        if (!loaded) return;
        clearOAuthState();
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth callback failed:', err);
        doLogout();
        setAuthenticated(false);
        setUser(null);
        clearOAuthState();
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    },
    [fetchUser, navigate]
  );

  const logout = useCallback(() => {
    doLogout();
    setAuthenticated(false);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (authenticated && !user) {
      void fetchUser();
    }
  }, [authenticated, user, fetchUser]);

  return { user, authenticated, loading, handleCallback, logout, token: getToken() };
}
