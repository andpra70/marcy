export const googleCalendarConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY ?? '',
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  calendarId: import.meta.env.VITE_GOOGLE_CALENDAR_ID ?? 'primary',
};

const googleDiscoveryDoc = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const googleScopes = 'https://www.googleapis.com/auth/calendar.events';

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function isGoogleCalendarConfigured() {
  return Boolean(googleCalendarConfig.apiKey && googleCalendarConfig.clientId);
}

export async function initGoogleCalendarClient() {
  await Promise.all([
    loadScript('https://apis.google.com/js/api.js', 'google-api-client'),
    loadScript('https://accounts.google.com/gsi/client', 'google-identity-services'),
  ]);

  await new Promise((resolve) => window.gapi.load('client', resolve));
  await window.gapi.client.init({
    apiKey: googleCalendarConfig.apiKey,
    discoveryDocs: [googleDiscoveryDoc],
  });

  return window.google.accounts.oauth2.initTokenClient({
    client_id: googleCalendarConfig.clientId,
    scope: googleScopes,
    callback: () => {},
  });
}

export function hasGoogleCalendarToken() {
  return Boolean(window.gapi?.client?.getToken());
}

export async function listGoogleCalendarEvents({ timeMin, timeMax }) {
  const response = await window.gapi.client.calendar.events.list({
    calendarId: googleCalendarConfig.calendarId,
    timeMin,
    timeMax,
    showDeleted: false,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.result.items ?? []).map((event) => {
    const start = event.start?.dateTime ?? `${event.start?.date}T00:00:00`;
    return {
      id: event.id,
      title: event.summary ?? 'Evento Google',
      date: start.slice(0, 10),
      time: start.slice(11, 16) || '09:00',
    };
  });
}

export async function insertGoogleCalendarEvent(event) {
  await window.gapi.client.calendar.events.insert({
    calendarId: googleCalendarConfig.calendarId,
    resource: event,
  });
}

export function disconnectGoogleAccount() {
  const token = window.gapi?.client?.getToken();
  if (token?.access_token) window.google.accounts.oauth2.revoke(token.access_token);
  window.gapi?.client?.setToken('');
}
