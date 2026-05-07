export const today = new Date('2026-05-06T09:00:00');

export const calendarBufferMinutes = 15;

export const calendarDays = ['2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11'];

export const calendarSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
];

export const backofficeNavItems = [
  { id: 'backoffice/dashboard', section: 'dashboard', label: 'Dashboard' },
  { id: 'backoffice/calendar', section: 'calendar', label: 'Calendario' },
  { id: 'backoffice/clients', section: 'clients', label: 'Clienti' },
  { id: 'backoffice/treatments', section: 'treatments', label: 'Trattamenti' },
  { id: 'backoffice/payments', section: 'payments', label: 'Pagamenti' },
  { id: 'backoffice/voucher', section: 'voucher', label: 'Voucher' },
  { id: 'backoffice/messages', section: 'messages', label: 'Messaggi' },
  { id: 'backoffice/reports', section: 'reports', label: 'Export' },
];

export const services = [
  { id: 'standard60', name: 'Massaggio standard 60 min', price: 50, minutes: 60 },
  { id: 'standard30', name: 'Massaggio standard 30 min', price: 30, minutes: 30 },
  { id: 'extended75', name: 'Trattamento esteso 75 min', price: 65, minutes: 75 },
];

export const subscriptions = [
  { id: 'pack5', name: 'Abbonamento 5 massaggi', sessions: 5, price: 340 },
  { id: 'pack10', name: 'Abbonamento 10 massaggi', sessions: 10, price: 640 },
  { id: 'rehab', name: 'Percorso terapeutico', sessions: 8, price: 700 },
];

export const products = [
  { id: 'cream', type: 'Prodotto', code: 'CRM-SPORT', name: 'Crema defaticante', cost: 12, price: 28 },
  { id: 'band', type: 'Prodotto', code: 'ELB-01', name: 'Elastico terapeutico', cost: 8, price: 18 },
  { id: 'gift1', type: 'Voucher', code: 'GFT-001', name: 'Voucher gift 1 massaggio', cost: 0, price: 50 },
];

export const initialMessages = [
  {
    id: 'MSG-REMINDER',
    title: 'Reminder appuntamento',
    channel: 'Email + WhatsApp',
    trigger: '48 ore prima',
    text: 'Promemoria appuntamento con link modifica/disdetta e cancellation policy.',
    enabled: true,
  },
  {
    id: 'MSG-LAST-SUBSCRIPTION',
    title: 'Ultimo trattamento abbonamento',
    channel: 'Email',
    trigger: 'Invio immediato e recall',
    text: 'Avviso ultimo trattamento in abbonamento e proposta rinnovo.',
    enabled: true,
  },
  {
    id: 'MSG-RENEWAL-OFFER',
    title: 'Offerta rinnovo',
    channel: 'Email',
    trigger: 'Fine abbonamento',
    text: 'Buono regalo 10% su prepagata per rinnovo entro la data configurata.',
    enabled: true,
  },
];

export const workflowSteps = [
  {
    title: 'Richiesta nuovo appuntamento',
    text: 'Nuovo cliente: dati anagrafici, accesso calendario con importi standard e appuntamento da approvare.',
  },
  {
    title: 'Cliente noto',
    text: 'Inserisce codice utente, recupera abbonamenti, tariffe speciali e credito; con abbonamento conferma istantanea.',
  },
  {
    title: 'Voucher',
    text: 'Codice voucher univoco per prenotare; ricerca anche per nome e cognome del regalante.',
  },
  {
    title: 'Pagamenti',
    text: 'Slot pagata con metodo, prodotti come righe ordine, abbonamenti con decurtazione automatica e sconti.',
  },
  {
    title: 'Messaggi',
    text: 'Invio immediato, recall a 48 ore, avviso ultimo trattamento in abbonamento e offerta rinnovo.',
  },
  {
    title: 'Pagina utente',
    text: 'Area riservata con abbonamenti, prepagate, voucher, prodotti e storico trattamenti filtrabile.',
  },
];

export const initialClients = [
  {
    id: 'CLI-2026-001',
    name: 'Giulia',
    surname: 'Rossi',
    email: 'giulia.rossi@example.com',
    phone: '+39 333 123 4567',
    fiscalCode: 'RSSGLI90A41F205X',
    address: 'Via Torino 18, Milano',
    city: 'Milano',
    birthDate: '1990-01-01',
    gender: 'Donna',
    subscription: { name: 'Abbonamento 5 massaggi', remaining: 2, purchased: 1 },
    wallet: 120,
    prepaid: { balance: 80, validUntil: '2027-03-15' },
    vouchersBought: 1,
    notes: 'Preferisce slot mattutine.',
    pathologies: 'Cervicalgia ricorrente.',
    photos: 2,
  },
  {
    id: 'CLI-2026-002',
    name: 'Marco',
    surname: 'Bianchi',
    email: 'marco.bianchi@example.com',
    phone: '+39 347 555 9012',
    fiscalCode: 'BNCMRC84C15H501W',
    address: 'Via Mazzini 4, Monza',
    city: 'Monza',
    birthDate: '1984-03-15',
    gender: 'Uomo',
    subscription: { name: 'Nessun abbonamento', remaining: 0, purchased: 0 },
    wallet: 0,
    prepaid: { balance: 0, validUntil: '-' },
    vouchersBought: 0,
    notes: 'Nuovo cliente da approvare.',
    pathologies: 'Da completare in anamnesi.',
    photos: 0,
  },
  {
    id: 'CLI-2026-003',
    name: 'Sara',
    surname: 'Verdi',
    email: 'sara.verdi@example.com',
    phone: '+39 328 774 2121',
    fiscalCode: 'VRDSRA78E51F205M',
    address: 'Via Roma 9, Sesto San Giovanni',
    city: 'Sesto San Giovanni',
    birthDate: '1978-05-11',
    gender: 'Donna',
    subscription: { name: 'Percorso terapeutico', remaining: 0, purchased: 2 },
    wallet: 45,
    prepaid: { balance: 45, validUntil: '2027-01-20' },
    vouchersBought: 2,
    notes: 'Rinnovo abbonamento da proporre.',
    pathologies: 'Contrattura lombare.',
    photos: 1,
  },
];

export const initialAppointments = [
  {
    id: 'APP-101',
    clientId: 'CLI-2026-001',
    date: '2026-05-07',
    time: '10:00',
    serviceId: 'standard60',
    status: 'Confermato',
    payment: 'Abbonamento',
    moved: 1,
    cancelled: 0,
  },
  {
    id: 'APP-102',
    clientId: 'CLI-2026-002',
    date: '2026-05-07',
    time: '15:30',
    serviceId: 'extended75',
    status: 'Da approvare',
    payment: 'In studio',
    moved: 0,
    cancelled: 0,
  },
  {
    id: 'APP-103',
    clientId: 'CLI-2026-003',
    date: '2026-05-09',
    time: '11:30',
    serviceId: 'standard30',
    status: 'Confermato',
    payment: 'Prepagata',
    moved: 0,
    cancelled: 1,
  },
];

export const initialVouchers = [
  {
    id: 'VCH-8X2A',
    buyerId: 'CLI-2026-001',
    recipient: 'Laura Neri',
    email: 'laura.neri@example.com',
    phone: '+39 333 111 2222',
    sessions: 1,
    status: 'Inviato',
  },
];
