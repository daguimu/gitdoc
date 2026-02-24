import { GITHUB_CONFIG, OAUTH_STATE_KEY, TOKEN_KEY, USER_KEY } from '../config';

const AUTH_CHANGE_EVENT = 'gitdoc-auth-change';

interface JsonMap {
  [key: string]: unknown;
}

interface LoginUrlResponse {
  url: string;
  state: string;
}

type StoredUser = { login: string; avatar_url: string; name: string | null };

function getPersistentStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  const storage = getPersistentStorage();
  if (!storage) return null;
  return storage.getItem(key);
}

function writeStorage(key: string, value: string) {
  const storage = getPersistentStorage();
  if (!storage) return;
  storage.setItem(key, value);
}

function removeStorage(key: string) {
  const storage = getPersistentStorage();
  if (!storage) return;
  storage.removeItem(key);
}

function emitAuthChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

async function parseJsonSafe(resp: Response): Promise<JsonMap> {
  try {
    const data = await resp.json();
    if (data && typeof data === 'object') return data as JsonMap;
    return {};
  } catch {
    return {};
  }
}

function errorMessage(data: JsonMap, fallback: string): string {
  const detail = data.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

export async function getLoginUrl(): Promise<LoginUrlResponse> {
  const resp = await fetch(GITHUB_CONFIG.loginUrl);
  const data = await parseJsonSafe(resp);

  if (!resp.ok || typeof data.url !== 'string' || typeof data.state !== 'string') {
    throw new Error(errorMessage(data, 'Failed to load OAuth login URL'));
  }

  return { url: data.url, state: data.state };
}

export async function exchangeCodeForToken(code: string, state: string): Promise<string> {
  const resp = await fetch(GITHUB_CONFIG.callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  });

  const data = await parseJsonSafe(resp);
  if (!resp.ok || typeof data.access_token !== 'string') {
    throw new Error(errorMessage(data, 'OAuth failed'));
  }

  return data.access_token;
}

export function saveOAuthState(state: string) {
  writeStorage(OAUTH_STATE_KEY, state);
}

export function getOAuthState(): string | null {
  return readStorage(OAUTH_STATE_KEY);
}

export function clearOAuthState() {
  removeStorage(OAUTH_STATE_KEY);
}

export function saveToken(token: string) {
  writeStorage(TOKEN_KEY, token);
  emitAuthChange();
}

export function getToken(): string | null {
  return readStorage(TOKEN_KEY);
}

export function saveUser(user: StoredUser) {
  writeStorage(USER_KEY, JSON.stringify(user));
}

export function getUser(): StoredUser | null {
  const raw = readStorage(USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredUser).login === 'string' &&
      typeof (parsed as StoredUser).avatar_url === 'string'
    ) {
      return parsed as StoredUser;
    }
  } catch {
    removeStorage(USER_KEY);
    return null;
  }

  removeStorage(USER_KEY);
  return null;
}

export function logout() {
  removeStorage(TOKEN_KEY);
  removeStorage(USER_KEY);
  clearOAuthState();
  emitAuthChange();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function subscribeAuthChange(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === TOKEN_KEY) onStoreChange();
  };

  window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getAuthSnapshot(): boolean {
  return isAuthenticated();
}
