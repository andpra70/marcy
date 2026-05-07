import { services, today } from './appData.js';

export function currency(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

export function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function hoursUntil(date, time) {
  const target = new Date(`${date}T${time}:00`);
  return (target.getTime() - today.getTime()) / 36e5;
}

export function isPastDateTime(date, time) {
  return new Date(`${date}T${time}:00`).getTime() < today.getTime();
}

export function isPastAppointment(appointment) {
  return isPastDateTime(appointment.date, appointment.time);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

export function formatDay(date) {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(
    new Date(`${date}T00:00:00`),
  );
}

export function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date);
}

export function monthDays(anchorDate) {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(year, month, index + 1);
    return day.toISOString().slice(0, 10);
  });
}

export function weekDays(anchorDate) {
  const start = new Date(anchorDate);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function findService(serviceId, serviceList = services) {
  return serviceList.find((service) => service.id === serviceId) ?? services.find((service) => service.id === serviceId);
}

export function appointmentRevenue(appointments, serviceList = services) {
  return appointments.reduce((sum, appointment) => sum + (findService(appointment.serviceId, serviceList)?.price ?? 0), 0);
}

export function buildClientFromForm(formData) {
  const email = String(formData.get('email')).trim();

  return {
    id: makeId('CLI-2026'),
    name: String(formData.get('name')).trim(),
    surname: String(formData.get('surname')).trim(),
    email,
    phone: String(formData.get('phone')).trim(),
    fiscalCode: String(formData.get('fiscalCode')).trim(),
    address: String(formData.get('address')).trim(),
    city: String(formData.get('city')).trim(),
    birthDate: String(formData.get('birthDate')),
    gender: String(formData.get('gender')),
    subscription: { name: 'Nessun abbonamento', remaining: 0, purchased: 0 },
    wallet: 0,
    prepaid: { balance: 0, validUntil: '-' },
    vouchersBought: 0,
    notes: String(formData.get('notes') || '').trim(),
    pathologies: String(formData.get('pathologies') || '').trim(),
    photos: 0,
  };
}

export function updateClientFromForm(client, formData) {
  return {
    ...client,
    name: String(formData.get('name')).trim(),
    surname: String(formData.get('surname')).trim(),
    email: String(formData.get('email')).trim(),
    phone: String(formData.get('phone')).trim(),
    fiscalCode: String(formData.get('fiscalCode')).trim(),
    address: String(formData.get('address')).trim(),
    city: String(formData.get('city')).trim(),
    birthDate: String(formData.get('birthDate')),
    gender: String(formData.get('gender')),
    notes: String(formData.get('notes') || '').trim(),
    pathologies: String(formData.get('pathologies') || '').trim(),
  };
}

export function buildUserAreaClient(existingClientsCount) {
  const suffix = existingClientsCount + 1;

  return {
    id: makeId('CLI-2026'),
    name: 'Nuovo',
    surname: `Utente ${suffix}`,
    email: `utente${suffix}@example.com`,
    phone: '+39 ',
    fiscalCode: '',
    address: '',
    city: '',
    birthDate: '',
    gender: 'Altro',
    subscription: { name: 'Nessun abbonamento', remaining: 0, purchased: 0 },
    wallet: 0,
    prepaid: { balance: 0, validUntil: '-' },
    vouchersBought: 0,
    notes: 'Creato da CTA registrazione area utente.',
    pathologies: '',
    photos: 0,
  };
}

export function appointmentNeedsOperatorApproval(payment, client) {
  return payment !== 'Abbonamento' && payment !== 'Voucher gift' && (client?.subscription.remaining ?? 0) <= 0;
}

export function buildAppointmentFromForm(formData, client) {
  const payment = String(formData.get('payment'));
  const needsApproval = appointmentNeedsOperatorApproval(payment, client);

  return {
    id: makeId('APP'),
    clientId: String(formData.get('clientId')),
    date: String(formData.get('date')),
    time: String(formData.get('time')),
    serviceId: String(formData.get('serviceId')),
    status: needsApproval ? 'Da approvare' : 'Confermato',
    payment,
    moved: 0,
    cancelled: 0,
  };
}
