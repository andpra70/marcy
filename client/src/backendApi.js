const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? 'Errore comunicazione backend');
  }
  return payload;
}

export function loginAdmin({ email, password }) {
  return requestJson('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
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
