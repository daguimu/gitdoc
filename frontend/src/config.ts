export const API_BASE = import.meta.env.VITE_API_BASE || '';

export const GITHUB_CONFIG = {
  loginUrl: `${API_BASE}/api/auth/github/login`,
  callbackUrl: `${API_BASE}/api/auth/github/callback`,
};

export const TOKEN_KEY = 'gitdoc_token';
export const USER_KEY = 'gitdoc_user';
export const OAUTH_STATE_KEY = 'gitdoc_oauth_state';
