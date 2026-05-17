const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
let authStateProvider = () => ({ accessToken: null, setSession: () => {}, clearSession: () => {} });

export function configureApiAuth(provider) {
  authStateProvider = provider;
}

async function parseResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export async function apiRequest(path, options = {}, retry = true) {
  const { accessToken, clearSession } = authStateProvider();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && retry) {
    try {
      const refreshed = await refreshSession();
      if (refreshed?.accessToken) return apiRequest(path, options, false);
    } catch (err) {
      clearSession();
    }
  }

  return parseResponse(response);
}

export async function refreshSession() {
  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await parseResponse(response);
  authStateProvider().setSession(data.user, data.accessToken);
  return data;
}

export const authApi = {
  signup: (payload) => apiRequest('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }, false),
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }, false),
  forgotPassword: (payload) => apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }, false),
  resetPassword: (payload) => apiRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }, false),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }, false),
  me: () => apiRequest('/api/auth/me')
};

export const userApi = {
  profile: () => apiRequest('/api/user/profile'),
  dashboard: () => apiRequest('/api/user/dashboard'),
  savedJobs: () => apiRequest('/api/user/saved-jobs')
};
