import { initialAppointments, initialClients, initialVouchers } from './appData.js';

const storageKey = 'marcy.appModel.v1';
const adminSessionStorageKey = 'marcy.adminSession.v1';

export const defaultStudio = {
  id: 'studio-marcy',
  name: 'Studio Marcy',
  adminEmail: 'admin@marcy.local',
  calendarId: 'primary',
  timezone: 'Europe/Rome',
};

export const defaultAppModel = {
  route: 'login',
  studio: defaultStudio,
  clients: initialClients,
  appointments: initialAppointments,
  vouchers: initialVouchers,
  selectedClientId: initialClients[0].id,
  editingClientId: null,
  editingVoucherId: null,
  bookingSlot: null,
  selectedUserAppointmentId: null,
  notice: 'Promemoria standard attivi: email + WhatsApp con link modifica/disdetta e cancellation policy.',
  googleEvents: [],
};

export function normalizeAppModel(appModel) {
  const clients = Array.isArray(appModel?.clients) ? appModel.clients : defaultAppModel.clients;
  const selectedClientExists = clients.some((client) => client.id === appModel?.selectedClientId);

  return {
    ...defaultAppModel,
    ...appModel,
    studio: { ...defaultStudio, ...appModel?.studio },
    clients,
    appointments: Array.isArray(appModel?.appointments) ? appModel.appointments : defaultAppModel.appointments,
    vouchers: Array.isArray(appModel?.vouchers) ? appModel.vouchers : defaultAppModel.vouchers,
    selectedClientId: selectedClientExists ? appModel.selectedClientId : (clients[0]?.id ?? ''),
    editingClientId: clients.some((client) => client.id === appModel?.editingClientId) ? appModel.editingClientId : null,
  };
}

function getStorageKey(studioId) {
  return studioId ? `${storageKey}.${studioId}` : storageKey;
}

export function loadAppModel(studioId) {
  try {
    const saved = window.localStorage.getItem(getStorageKey(studioId));
    return saved ? normalizeAppModel(JSON.parse(saved)) : defaultAppModel;
  } catch {
    return defaultAppModel;
  }
}

export function persistAppModel(appModel, studioId = appModel.studio?.id) {
  window.localStorage.setItem(getStorageKey(studioId), JSON.stringify(appModel));
}

export function loadAdminSession() {
  try {
    const saved = window.sessionStorage.getItem(adminSessionStorageKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function persistAdminSession(session) {
  if (!session) {
    window.sessionStorage.removeItem(adminSessionStorageKey);
    return;
  }
  window.sessionStorage.setItem(adminSessionStorageKey, JSON.stringify(session));
}

export function getInitialRoute() {
  const route = window.location.hash.replace('#/', '');
  const legacyRoutes = {
    calendar: 'backoffice/calendar',
    clients: 'backoffice/clients',
    dashboard: 'backoffice/dashboard',
    payments: 'backoffice/payments',
    reports: 'backoffice/reports',
    voucher: 'backoffice/voucher',
    'user-page': 'area-utente',
  };
  return legacyRoutes[route] ?? (route || defaultAppModel.route);
}

export function updateRouteHash(route) {
  if (window.location.hash !== `#/${route}`) {
    window.location.hash = `/${route}`;
  }
}
