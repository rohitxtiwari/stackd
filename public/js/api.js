const API_URL = '/api';

export let accessToken = localStorage.getItem('accessToken');
export let refreshToken = localStorage.getItem('refreshToken');

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function apiFetch(endpoint, options = {}) {
  const headers = { ...options.headers };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body !== 'string') options.body = JSON.stringify(options.body);
  } else {
    delete headers['Content-Type'];
  }
  
  let res = await fetch(API_URL + endpoint, { ...options, headers });
  
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(API_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setTokens(data.accessToken, data.refreshToken);
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(API_URL + endpoint, { ...options, headers });
    } else {
      // Import logout from ui.js or handle it in app.js
      // For now, just clear and reload
      clearTokens();
      window.location.href = '/login';
      return { success: false, message: 'Session expired' };
    }
  }
  
  return res.json();
}
