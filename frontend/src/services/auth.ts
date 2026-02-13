import { GITHUB_CONFIG, TOKEN_KEY, USER_KEY } from '../config';

export async function getLoginUrl(): Promise<string> {
  const resp = await fetch(GITHUB_CONFIG.loginUrl);
  const data = await resp.json();
  return data.url;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const resp = await fetch(GITHUB_CONFIG.callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'OAuth failed');
  }

  const data = await resp.json();
  return data.access_token;
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveUser(user: { login: string; avatar_url: string; name: string | null }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): { login: string; avatar_url: string; name: string | null } | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
