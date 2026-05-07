const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

async function requestJson(path, options = {}) {
  const { headers, ...requestOptions } = options;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.error ? `: ${payload.error}` : '';
    throw new Error(`${options.method ?? 'GET'} ${path} ${response.status}${detail}`);
  }
  return payload;
}

export function loginAdmin({ email, password, studioId }) {
  return requestJson('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, studioId }),
  });
}

export function saveStudioState({ appModel, studioId, token }) {
  return requestJson(`/api/studios/${studioId}/state`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ appModel }),
  });
}

export function loginRoot({ username, password }) {
  return requestJson('/api/root/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function createRootStudio({ studio, token }) {
  return requestJson('/api/root/studios', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(studio),
  });
}

export function updateRootStudio({ studioId, token, values }) {
  return requestJson(`/api/root/studios/${studioId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  });
}
