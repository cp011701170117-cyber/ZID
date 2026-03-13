const API_ROOT = 'http://localhost:5000';

const inflight = new Map();

function resetAuthStorage() {
  try { sessionStorage.removeItem('userSession'); } catch {}
  try { sessionStorage.removeItem('session'); } catch {}
  try { sessionStorage.removeItem('issuerSession'); } catch {}
  try { sessionStorage.removeItem('verifierJwt'); } catch {}
  try { sessionStorage.removeItem('verifierDid'); } catch {}
  try { sessionStorage.removeItem('token'); } catch {}
}

function handleUnauthorized() {
  resetAuthStorage();
  window.location.reload();
}

function parseSession(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  const issuerSession = parseSession('issuerSession');
  if (issuerSession?.token) return issuerSession.token;

  const walletSession = parseSession('session');
  if (walletSession?.token) return walletSession.token;

  const sharedToken = sessionStorage.getItem('token');
  if (sharedToken) return sharedToken;

  const verifierToken = sessionStorage.getItem('verifierJwt');
  if (verifierToken) return verifierToken;

  return null;
}

function buildUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalized = endpoint.startsWith('/api/')
    ? endpoint
    : endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  return `${API_ROOT}${normalized}`;
}

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body = null, headers = {}, token = null, skipAuth = false } = options;
  const url = buildUrl(endpoint);
  const key = `${method}:${url}:${body ? JSON.stringify(body) : ''}`;

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = (async () => {
    const requestHeaders = {
      ...headers
    };

    if (body && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const isExternalUrl = /^https?:\/\//i.test(endpoint);
    const authToken = skipAuth ? null : token || getStoredToken();
    if (authToken && !isExternalUrl) {
      requestHeaders.Authorization = `Bearer ${authToken}`;
    }

    let response;
    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
      });
    } catch (error) {
      const networkError = new Error(error.message || 'Failed to fetch');
      networkError.cause = error;
      throw networkError;
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = text;
    }

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }

      const error = new Error(
        (typeof data === 'object' && data?.error) ||
        (typeof data === 'string' && data) ||
        response.statusText ||
        'API request failed'
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
