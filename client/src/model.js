import {
  initialAppointments,
  initialClients,
  initialMessages,
  initialVouchers,
  products,
  services,
} from './appData.js';

const storageKey = 'marcy.appModel.v1';
const adminSessionStorageKey = 'marcy.adminSession.v1';

export const defaultStudio = {
  id: 'studio-marcy',
  name: 'Studio Marcy',
  adminEmail: 'admin@marcy.local',
  calendarId: 'primary',
  timezone: 'Europe/Rome',
  address: 'Via dello Studio 1, Milano',
  phone: '+39 333 000 0000',
  email: 'info@marcy.local',
  enabled: true,
  subscription: {
    status: 'active',
    validUntil: '2027-05-07',
    yearlyPrice: 50,
  },
};

export const defaultAppModel = {
  route: 'login',
  studio: defaultStudio,
  clients: initialClients,
  appointments: initialAppointments,
  vouchers: initialVouchers,
  services,
  products,
  messages: initialMessages,
  selectedClientId: initialClients[0].id,
  editingClientId: null,
  editingVoucherId: null,
  bookingSlot: null,
  selectedUserAppointmentId: null,
  notice: 'Promemoria standard attivi: email + WhatsApp con link modifica/disdetta e cancellation policy.',
  googleEvents: [],
  cookieConsent: null,
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
    services: Array.isArray(appModel?.services) ? appModel.services : defaultAppModel.services,
    products: Array.isArray(appModel?.products) ? appModel.products : defaultAppModel.products,
    messages: Array.isArray(appModel?.messages) ? appModel.messages : defaultAppModel.messages,
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

const legacyRoutes = {
  calendar: 'backoffice/calendar',
  clients: 'backoffice/clients',
  dashboard: 'backoffice/dashboard',
  payments: 'backoffice/payments',
  reports: 'backoffice/reports',
  voucher: 'backoffice/voucher',
  'user-page': 'area-utente',
};

function isRouteFirstSegment(segment) {
  return segment === 'login' || segment === 'area-utente' || segment === 'backoffice' || segment === 'root' || segment in legacyRoutes;
}

export function getHashLocation(fallbackStudioId = defaultStudio.id) {
  const route = window.location.hash.replace('#/', '');
  const routeParts = route.split('/').filter(Boolean);
  const firstSegment = routeParts[0];

  if (!firstSegment) {
    return { route: defaultAppModel.route, studioId: fallbackStudioId };
  }

  if (firstSegment === 'root') {
    return { route: 'root', studioId: fallbackStudioId };
  }

  if (isRouteFirstSegment(firstSegment)) {
    const normalizedRoute = legacyRoutes[route] ?? route;
    return { route: normalizedRoute || defaultAppModel.route, studioId: fallbackStudioId };
  }

  const studioId = firstSegment;
  const studioRoute = routeParts.slice(1).join('/') || defaultAppModel.route;
  return { route: legacyRoutes[studioRoute] ?? studioRoute, studioId };
}

export function getInitialRoute() {
  return getHashLocation().route;
}

export function getInitialStudioId(fallbackStudioId = defaultStudio.id) {
  return getHashLocation(fallbackStudioId).studioId;
}

export function updateRouteHash(route, studioId = defaultStudio.id) {
  const nextHash = route === 'root' ? '#/root' : `#/${studioId || defaultStudio.id}/${route || defaultAppModel.route}`;
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash.replace('#', '');
  }
}
