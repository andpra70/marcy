import { initialAppointments, initialClients, initialVouchers } from './appData.js';

const storageKey = 'marcy.appModel.v1';

export const defaultAppModel = {
  route: 'login',
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

export function loadAppModel() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? { ...defaultAppModel, ...JSON.parse(saved) } : defaultAppModel;
  } catch {
    return defaultAppModel;
  }
}

export function persistAppModel(appModel) {
  window.localStorage.setItem(storageKey, JSON.stringify(appModel));
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
