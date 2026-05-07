import { useEffect, useMemo, useState } from 'react';
import { calendarBufferMinutes, calendarDays, subscriptions } from './appData.js';
import { createRootStudio, loginAdmin, loginRoot, saveStudioState, updateRootStudio } from './backendApi.js';
import {
  addMinutes,
  appointmentRevenue,
  buildAppointmentFromForm,
  buildClientFromForm,
  buildUserAreaClient,
  currency,
  findService,
  isPastAppointment,
  isPastDateTime,
  makeId,
  updateClientFromForm,
} from './domain.js';
import {
  disconnectGoogleAccount,
  hasGoogleCalendarToken,
  initGoogleCalendarClient,
  insertGoogleCalendarEvent,
  isGoogleCalendarConfigured,
  listGoogleCalendarEvents,
} from './googleCalendar.js';
import AreaUtente from './components/AreaUtente.jsx';
import BackOffice from './components/BackOffice.jsx';
import GoogleCalendarPanel from './components/GoogleCalendarPanel.jsx';
import {
  defaultAppModel,
  getInitialRoute,
  getInitialStudioId,
  loadAdminSession,
  loadAppModel,
  normalizeAppModel,
  persistAdminSession,
  persistAppModel,
  updateRouteHash,
} from './model.js';

function App() {
  const [adminSession, setAdminSession] = useState(() => loadAdminSession());
  const [appModel, setAppModel] = useState(() => {
    const savedAdminSession = loadAdminSession();
    const studioId = getInitialStudioId(savedAdminSession?.studio.id);
    const savedModel = loadAppModel(studioId);
    return normalizeAppModel({
      ...savedModel,
      route: getInitialRoute(),
      studio: {
        ...savedModel.studio,
        id: studioId,
        name: savedModel.studio?.id === studioId ? savedModel.studio.name : studioId,
      },
    });
  });
  const [adminStatus, setAdminStatus] = useState('');
  const [rootStatus, setRootStatus] = useState('');
  const [rootSession, setRootSession] = useState(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleStatus, setGoogleStatus] = useState(
    isGoogleCalendarConfigured()
      ? 'Google Calendar pronto per il login.'
      : 'Configura VITE_GOOGLE_CLIENT_ID e VITE_GOOGLE_API_KEY per collegare Google Calendar.',
  );
  const [tokenClient, setTokenClient] = useState(null);

  const {
    appointments,
    bookingSlot,
    clients,
    editingClientId,
    editingVoucherId,
    googleEvents,
    messages,
    notice,
    products,
    route,
    services,
    selectedUserAppointmentId,
    selectedClientId,
    vouchers,
    cookieConsent,
  } = appModel;

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;
  const editingClient = clients.find((client) => client.id === editingClientId);
  const editingVoucher = vouchers.find((voucher) => voucher.id === editingVoucherId);
  const isBackofficeRoute = route.startsWith('backoffice/');
  const isRootRoute = route === 'root';
  const isAdminAuthenticated = Boolean(adminSession?.token && adminSession.studio?.id === appModel.studio?.id);

  function updateAppModel(updater) {
    setAppModel((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return next;
    });
  }

  function setRoute(routeId) {
    updateRouteHash(routeId, appModel.studio?.id);
    updateAppModel({ route: routeId });
  }

  useEffect(() => {
    let cancelled = false;

    async function initGoogleCalendar() {
      if (!isGoogleCalendarConfigured()) return;

      try {
        const client = await initGoogleCalendarClient();
        if (!cancelled) {
          setTokenClient(client);
          setGoogleReady(true);
          setGoogleStatus('Google Calendar inizializzato. Effettua il login per sincronizzare.');
        }
      } catch (error) {
        if (!cancelled) setGoogleStatus(`Errore inizializzazione Google Calendar: ${error.message}`);
      }
    }

    initGoogleCalendar();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    persistAppModel(appModel);
  }, [appModel]);

  useEffect(() => {
    persistAdminSession(adminSession);
  }, [adminSession]);

  useEffect(() => {
    if (!adminSession?.token || !appModel.studio?.id) return;

    let cancelled = false;

    async function persistBackendState() {
      try {
        await saveStudioState({
          appModel,
          studioId: appModel.studio.id,
          token: adminSession.token,
        });
        if (!cancelled) setAdminStatus(`Stato ${appModel.studio.name} salvato sul backend.`);
      } catch (error) {
        if (!cancelled) setAdminStatus(`Salvataggio backend non riuscito: ${error.message}`);
      }
    }

    persistBackendState();
    return () => {
      cancelled = true;
    };
  }, [adminSession?.token, appModel]);

  useEffect(() => {
    function handleRouteChange() {
      updateAppModel((current) => {
        const studioId = getInitialStudioId(current.studio?.id);
        const route = getInitialRoute();
        if (studioId === current.studio?.id) {
          return { ...current, route };
        }

        const savedModel = loadAppModel(studioId);
        return normalizeAppModel({
          ...savedModel,
          route,
          studio: {
            ...savedModel.studio,
            id: studioId,
            name: savedModel.studio?.id === studioId ? savedModel.studio.name : studioId,
          },
        });
      });
    }

    window.addEventListener('hashchange', handleRouteChange);
    return () => window.removeEventListener('hashchange', handleRouteChange);
  }, []);

  const stats = useMemo(() => {
    const paidTotal = appointments.reduce((sum, appointment) => {
      const service = findService(appointment.serviceId, services);
      return appointment.status === 'Pagato' || appointment.payment !== 'Da incassare' ? sum + (service?.price ?? 0) : sum;
    }, 0);

    return {
      appointments: appointments.length,
      clients: clients.length,
      reminders: appointments.filter((item) => item.status === 'Confermato').length,
      revenue: paidTotal,
      services: services.length,
    };
  }, [appointments, clients, services]);

  function addClient(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const client = buildClientFromForm(data);
    updateAppModel((current) => ({
      ...current,
      clients: [client, ...current.clients],
      editingClientId: null,
      selectedClientId: client.id,
      notice: `Creato ${client.id}. Username: ${client.email}. Inviata email di conferma registrazione.`,
    }));
    event.currentTarget.reset();
  }

  function updateClient(event) {
    event.preventDefault();
    if (!editingClient) return;
    const data = new FormData(event.currentTarget);
    const updatedClient = updateClientFromForm(editingClient, data);
    updateAppModel((current) => ({
      ...current,
      clients: current.clients.map((client) => (client.id === editingClient.id ? updatedClient : client)),
      editingClientId: null,
      selectedClientId: updatedClient.id,
      notice: `Anagrafica ${updatedClient.id} aggiornata.`,
    }));
  }

  function updateUserProfile(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const clientId = String(data.get('clientId'));
    const currentClient = clients.find((client) => client.id === clientId);
    if (!currentClient) return;

    const updatedClient = updateClientFromForm(currentClient, data);
    updateAppModel((current) => ({
      ...current,
      clients: current.clients.map((client) => (client.id === clientId ? updatedClient : client)),
      selectedClientId: clientId,
      notice: 'Profilo aggiornato.',
    }));
  }

  function deleteClient(clientId) {
    const nextClients = clients.filter((client) => client.id !== clientId);
    updateAppModel((current) => ({
      ...current,
      clients: nextClients,
      appointments: current.appointments.filter((appointment) => appointment.clientId !== clientId),
      editingClientId: null,
      selectedClientId: nextClients[0]?.id ?? '',
      notice: 'Anagrafica eliminata. Appuntamenti collegati rimossi.',
    }));
  }

  function registerFromUserArea() {
    const client = buildUserAreaClient(clients.length);
    updateAppModel((current) => ({
      ...current,
      clients: [client, ...current.clients],
      editingClientId: client.id,
      route: 'area-utente',
      selectedClientId: client.id,
      notice: `Registrazione area utente completata: creata anagrafica ${client.id}.`,
    }));
    updateRouteHash('area-utente', appModel.studio?.id);
  }

  function addAppointment(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const clientId = String(data.get('clientId'));
    const client = clients.find((item) => item.id === clientId);
    const appointment = buildAppointmentFromForm(data, client);
    if (isPastAppointment(appointment)) {
      updateAppModel({ notice: 'Non e possibile creare o modificare appuntamenti nel passato.' });
      return;
    }
    const hasInstantConfirmation = appointment.status === 'Confermato';
    updateAppModel((current) => ({
      ...current,
      appointments: [appointment, ...current.appointments],
      notice: hasInstantConfirmation
        ? 'Appuntamento confermato istantaneamente. Inviati messaggio immediato e recall programmato a 48 ore.'
        : 'Appuntamento ricevuto e messo in approvazione operatore. Il cliente riceve il messaggio di richiesta da approvare.',
    }));
    event.currentTarget.reset();
  }

  function bookUserAppointment(event) {
    event.preventDefault();
    if (!bookingSlot || !selectedClient) return;
    if (isPastDateTime(bookingSlot.date, bookingSlot.time)) {
      updateAppModel({ bookingSlot: null, notice: 'Non e possibile prenotare slot nel passato.' });
      return;
    }
    const data = new FormData(event.currentTarget);
    const appointment = buildAppointmentFromForm(data, selectedClient);
    updateAppModel((current) => ({
      ...current,
      appointments: [appointment, ...current.appointments],
      bookingSlot: null,
      notice: appointment.status === 'Confermato'
        ? 'Prenotazione confermata. Inviati messaggio immediato e recall programmato a 48 ore.'
        : 'Prenotazione inviata allo studio per approvazione.',
    }));
  }

  async function syncFromGoogleCalendar() {
    if (!window.gapi?.client?.calendar) return;
    if (!hasGoogleCalendarToken()) {
      setGoogleStatus('Effettua il login Google prima della sincronizzazione.');
      return;
    }
    const events = await listGoogleCalendarEvents({
      timeMin: `${calendarDays[0]}T00:00:00+02:00`,
      timeMax: `${calendarDays.at(-1)}T23:59:59+02:00`,
    });
    updateAppModel({ googleEvents: events });
    setGoogleStatus(`${events.length} eventi letti da Google Calendar.`);
  }

  function connectGoogleCalendar() {
    if (!googleReady || !tokenClient) {
      setGoogleStatus('Credenziali Google mancanti o librerie non ancora pronte.');
      return;
    }
    tokenClient.callback = async (response) => {
      if (response.error) {
        setGoogleStatus(`Login Google non completato: ${response.error}`);
        return;
      }
      setGoogleStatus('Login Google completato. Sincronizzazione in corso.');
      await syncFromGoogleCalendar();
    };
    const prompt = hasGoogleCalendarToken() ? '' : 'consent';
    tokenClient.requestAccessToken({ prompt });
  }

  function disconnectGoogleCalendar() {
    disconnectGoogleAccount();
    updateAppModel({ googleEvents: [] });
    setGoogleStatus('Account Google scollegato.');
  }

  async function pushAppointmentToGoogle(appointmentId) {
    if (!hasGoogleCalendarToken()) {
      setGoogleStatus('Effettua prima il login Google.');
      return;
    }
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    if (isPastAppointment(appointment)) {
      updateAppModel({ notice: 'Gli appuntamenti passati non possono essere modificati o sincronizzati.' });
      return;
    }
    const client = clients.find((item) => item.id === appointment.clientId);
    const service = findService(appointment.serviceId, services);
    const start = new Date(`${appointment.date}T${appointment.time}:00`);
    const end = addMinutes(start, (service?.minutes ?? 60) + calendarBufferMinutes);
    await insertGoogleCalendarEvent({
      summary: `${service?.name ?? 'Massaggio'} - ${client?.name ?? ''} ${client?.surname ?? ''}`.trim(),
      description: `Appuntamento ${appointment.id}. Stato: ${appointment.status}. Pagamento: ${appointment.payment}.`,
      start: { dateTime: start.toISOString(), timeZone: 'Europe/Rome' },
      end: { dateTime: end.toISOString(), timeZone: 'Europe/Rome' },
    });
    await syncFromGoogleCalendar();
    updateAppModel({ notice: `Appuntamento ${appointment.id} inviato a Google Calendar.` });
  }

  function updateAppointment(id, action) {
    const actionNotices = {
      approve: 'Appuntamento approvato. Inviata conferma istantanea all’utente.',
      move: 'Modifica registrata. Il calendario mantiene 15 minuti tra un trattamento e il successivo.',
      cancel: 'Cancellazione registrata. Entro 24 ore: abbonamento o voucher scalano -1; senza abbonamento serve contatto telefonico.',
      paid: 'Pagamento in studio salvato con stato pagato.',
    };

    updateAppModel((current) => {
      const targetAppointment = current.appointments.find((appointment) => appointment.id === id);
      if (!targetAppointment || isPastAppointment(targetAppointment)) {
        return {
          ...current,
          notice: 'Gli appuntamenti passati non possono essere modificati.',
        };
      }

      return {
        ...current,
        appointments: current.appointments.map((appointment) => {
          if (appointment.id !== id) return appointment;
          if (action === 'approve') return { ...appointment, status: 'Confermato' };
          if (action === 'paid') return { ...appointment, status: 'Pagato', payment: 'Pagato in studio' };
          if (action === 'move') return { ...appointment, moved: appointment.moved + 1, status: 'Spostato' };
          if (action === 'cancel') return { ...appointment, cancelled: appointment.cancelled + 1, status: 'Annullato' };
          return appointment;
        }),
        notice: actionNotices[action] ?? current.notice,
        selectedUserAppointmentId: action === 'cancel' ? null : current.selectedUserAppointmentId,
      };
    });
  }

  function createService(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const service = {
      id: makeId('TRT'),
      name: String(data.get('name')).trim(),
      minutes: Number(data.get('minutes')),
      price: Number(data.get('price')),
    };
    updateAppModel((current) => ({
      ...current,
      services: [service, ...current.services],
      notice: `Trattamento ${service.name} creato.`,
    }));
    event.currentTarget.reset();
  }

  function updateService(serviceId, values) {
    updateAppModel((current) => ({
      ...current,
      services: current.services.map((service) => (service.id === serviceId ? { ...service, ...values } : service)),
      notice: 'Trattamento aggiornato.',
    }));
  }

  function deleteService(serviceId) {
    const isUsed = appointments.some((appointment) => appointment.serviceId === serviceId);
    if (isUsed) {
      updateAppModel({ notice: 'Non puoi eliminare un trattamento collegato ad appuntamenti esistenti.' });
      return;
    }
    updateAppModel((current) => ({
      ...current,
      services: current.services.filter((service) => service.id !== serviceId),
      notice: 'Trattamento eliminato.',
    }));
  }

  function createProduct(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const product = {
      id: makeId('PRD'),
      type: String(data.get('type')),
      code: String(data.get('code')).trim(),
      name: String(data.get('name')).trim(),
      cost: Number(data.get('cost')),
      price: Number(data.get('price')),
    };
    updateAppModel((current) => ({
      ...current,
      products: [product, ...current.products],
      notice: `Prodotto ${product.name} creato.`,
    }));
    event.currentTarget.reset();
  }

  function updateProduct(productId, values) {
    updateAppModel((current) => ({
      ...current,
      products: current.products.map((product) => (product.id === productId ? { ...product, ...values } : product)),
      notice: 'Prodotto aggiornato.',
    }));
  }

  function deleteProduct(productId) {
    updateAppModel((current) => ({
      ...current,
      products: current.products.filter((product) => product.id !== productId),
      notice: 'Prodotto eliminato.',
    }));
  }

  function updateMessage(messageId, values) {
    updateAppModel((current) => ({
      ...current,
      messages: current.messages.map((message) => (message.id === messageId ? { ...message, ...values } : message)),
      notice: 'Regola messaggio aggiornata.',
    }));
  }

  function updateUserAppointment(appointmentId, values) {
    updateAppModel((current) => {
      const targetAppointment = current.appointments.find((appointment) => appointment.id === appointmentId);
      if (!targetAppointment || isPastAppointment(targetAppointment)) {
        return {
          ...current,
          notice: 'Gli appuntamenti passati non possono essere modificati.',
        };
      }

      return {
        ...current,
        appointments: current.appointments.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, ...values, status: 'Spostato' } : appointment,
        ),
        selectedUserAppointmentId: null,
        notice: 'Appuntamento aggiornato. Lo studio riceve la modifica richiesta.',
      };
    });
  }

  function sellSubscription(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subscription = subscriptions.find((item) => item.id === data.get('subscriptionId'));
    if (!selectedClient || !subscription) return;
    const discount = Number(data.get('discount') || 0);
    const discountRate = Number(data.get('discountRate') || 0);
    const includedTreatments = Number(data.get('includedTreatments') || 0);
    const method = String(data.get('method'));
    const paymentStatus = String(data.get('paymentStatus'));
    const totalDue = Math.max(0, subscription.price - discount - subscription.price * (discountRate / 100));
    updateAppModel((current) => ({
      ...current,
      clients: current.clients.map((client) =>
        client.id === selectedClientId
          ? {
              ...client,
              subscription: {
                name: subscription.name,
                remaining: Math.max(0, subscription.sessions - includedTreatments),
                purchased: client.subscription.purchased + 1,
              },
              prepaid: {
                balance: client.prepaid.balance,
                validUntil: '2027-05-06',
              },
            }
          : client,
      ),
      notice: `Abbonamento associato a ${selectedClient.name}: ${currency(totalDue)} con ${method}, stato ${paymentStatus}. Trattamenti inglobati: ${includedTreatments}.`,
    }));
    event.currentTarget.reset();
  }

  function createVoucher(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!selectedClient) return;
    const voucher = {
      id: makeId('VCH'),
      buyerId: selectedClientId,
      recipient: String(data.get('recipient')).trim(),
      email: String(data.get('email')).trim(),
      phone: String(data.get('phone')).trim(),
      sessions: Number(data.get('sessions')),
      status: data.get('notify') ? 'Inviato' : 'Creato senza invio',
    };
    updateAppModel((current) => ({
      ...current,
      editingVoucherId: null,
      vouchers: [voucher, ...current.vouchers],
      clients: current.clients.map((client) =>
        client.id === selectedClientId ? { ...client, vouchersBought: client.vouchersBought + 1 } : client,
      ),
      notice: `Voucher ${voucher.id} generato con QR code simulato e istruzioni di prenotazione.`,
    }));
    event.currentTarget.reset();
  }

  function updateVoucher(event) {
    event.preventDefault();
    if (!editingVoucher) return;
    const data = new FormData(event.currentTarget);
    const updatedVoucher = {
      ...editingVoucher,
      recipient: String(data.get('recipient')).trim(),
      email: String(data.get('email')).trim(),
      phone: String(data.get('phone')).trim(),
      sessions: Number(data.get('sessions')),
      status: data.get('notify') ? 'Inviato' : 'Creato senza invio',
    };
    updateAppModel((current) => ({
      ...current,
      editingVoucherId: null,
      vouchers: current.vouchers.map((voucher) => (voucher.id === editingVoucher.id ? updatedVoucher : voucher)),
      notice: `Voucher ${updatedVoucher.id} aggiornato.`,
    }));
  }

  function deleteVoucher(voucherId) {
    updateAppModel((current) => ({
      ...current,
      editingVoucherId: null,
      vouchers: current.vouchers.filter((voucher) => voucher.id !== voucherId),
      notice: `Voucher ${voucherId} eliminato.`,
    }));
  }

  function topUpWallet(event) {
    event.preventDefault();
    if (!selectedClient) return;
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    updateAppModel((current) => ({
      ...current,
      clients: current.clients.map((client) =>
        client.id === selectedClientId
          ? {
              ...client,
              wallet: client.wallet + amount,
              prepaid: { balance: client.prepaid.balance + amount, validUntil: '2027-05-06' },
            }
          : client,
      ),
      notice: `Prepagata wallet caricata di ${currency(amount)} con pagamento Nexi. Validità impostata a 12 mesi.`,
    }));
    event.currentTarget.reset();
  }

  function reportRows(type) {
    return clients.map((client) => {
      const clientAppointments = appointments.filter((item) => item.clientId === client.id);
      const revenue = appointmentRevenue(clientAppointments, services);
      return {
        id: client.id,
        nome: `${client.name} ${client.surname}`,
        nascita: client.birthDate,
        comune: client.city,
        trattamenti: clientAppointments.length,
        incassato: revenue,
        medio: clientAppointments.length ? Math.round(revenue / clientAppointments.length) : 0,
        ultimo: clientAppointments[0]?.date ?? '-',
        spostati: clientAppointments.reduce((sum, item) => sum + item.moved, 0),
        annullati: clientAppointments.reduce((sum, item) => sum + item.cancelled, 0),
        abbonamenti: client.subscription.purchased,
        voucher: client.vouchersBought,
        tipo: type,
      };
    });
  }

  function exportCsv(type) {
    const rows = reportRows(type);
    if (!rows.length) {
      updateAppModel({ notice: 'Nessun dato da esportare.' });
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => JSON.stringify(row[key])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loginBackofficeAdmin(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAdminStatus('Login amministratore in corso.');

    try {
      const session = await loginAdmin({
        email: String(data.get('adminEmail')).trim(),
        password: String(data.get('adminPassword')),
        studioId: appModel.studio?.id,
      });
      const studioAppModel = session.appModel
        ? normalizeAppModel({ ...defaultAppModel, ...session.appModel, studio: session.studio })
        : normalizeAppModel({ ...defaultAppModel, studio: session.studio });

      setAdminSession({
        token: session.token,
        admin: session.admin,
        studio: session.studio,
      });
      updateRouteHash('backoffice/dashboard', session.studio.id);
      setAppModel({
        ...studioAppModel,
        route: 'backoffice/dashboard',
        notice: `Accesso amministratore completato per ${session.studio.name}.`,
      });
      setAdminStatus(`Accesso amministratore completato per ${session.studio.name}.`);
    } catch (error) {
      setAdminStatus(`Login amministratore non riuscito: ${error.message}`);
    }
  }

  function logoutBackofficeAdmin() {
    setAdminSession(null);
    setAdminStatus('Sessione amministratore chiusa.');
    setRoute('login');
  }

  async function loginRootAdmin(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setRootStatus('Login root in corso.');

    try {
      const session = await loginRoot({
        username: String(data.get('username')).trim(),
        password: String(data.get('password')),
      });
      setRootSession(session);
      setRootStatus('Accesso root completato.');
    } catch (error) {
      setRootStatus(`Login root non riuscito: ${error.message}`);
    }
  }

  async function createStudioFromRoot(event) {
    event.preventDefault();
    if (!rootSession?.token) return;

    const data = new FormData(event.currentTarget);
    setRootStatus('Creazione studio in corso.');

    try {
      const result = await createRootStudio({
        token: rootSession.token,
        studio: {
          id: String(data.get('id')).trim(),
          name: String(data.get('name')).trim(),
          adminEmail: String(data.get('adminEmail')).trim(),
          adminPassword: String(data.get('adminPassword')),
          validUntil: String(data.get('validUntil')),
          yearlyPrice: Number(data.get('yearlyPrice')),
        },
      });
      setRootSession((current) => ({ ...current, studios: result.studios }));
      setRootStatus('Studio creato.');
      event.currentTarget.reset();
    } catch (error) {
      setRootStatus(`Creazione studio non riuscita: ${error.message}`);
    }
  }

  async function toggleStudioFromRoot(studio) {
    if (!rootSession?.token) return;

    try {
      const result = await updateRootStudio({
        studioId: studio.id,
        token: rootSession.token,
        values: { enabled: !studio.enabled },
      });
      setRootSession((current) => ({ ...current, studios: result.studios }));
      setRootStatus(studio.enabled ? 'Studio disabilitato.' : 'Studio abilitato.');
    } catch (error) {
      setRootStatus(`Aggiornamento studio non riuscito: ${error.message}`);
    }
  }

  if (isRootRoute) {
    return (
      <AppFrame appModel={appModel} onRoute={setRoute}>
        <RootPage
          onCreateStudio={createStudioFromRoot}
          onLogin={loginRootAdmin}
          onToggleStudio={toggleStudioFromRoot}
          rootSession={rootSession}
          rootStatus={rootStatus}
        />
        <CookieConsent consent={cookieConsent} onConsent={(value) => updateAppModel({ cookieConsent: value })} />
      </AppFrame>
    );
  }

  if (!isBackofficeRoute || !isAdminAuthenticated) {
    return (
      <AppFrame appModel={appModel} onRoute={setRoute}>
        <div className="front-shell">
          <header className="front-topbar">
          <div className="brand front-brand">
            <span className="brand-mark">M</span>
            <div>
              <strong>Marcy</strong>
              <small>{route === 'area-utente' ? 'Area cliente' : 'Accesso'}</small>
            </div>
          </div>
          <div className="front-actions">
            <span className="login-chip">Studio: {appModel.studio?.id}</span>
            <button type="button" onClick={() => setRoute('area-utente')}>Area utente</button>
            <button type="button" onClick={() => setRoute('backoffice/dashboard')}>Backoffice</button>
            <button type="button" onClick={() => setRoute('root')}>Root</button>
            {route === 'area-utente' && (
              <>
                <GoogleCalendarPanel
                  compact
                  ready={googleReady}
                  status={googleStatus}
                  events={googleEvents}
                  onConnect={connectGoogleCalendar}
                  onDisconnect={disconnectGoogleCalendar}
                  onSync={syncFromGoogleCalendar}
                />
                <button type="button" onClick={() => setRoute('login')}>Esci</button>
              </>
            )}
          </div>
          </header>

          <main className="front-main">
          <div className="notice">{notice}</div>

          {route === 'area-utente' ? (
            <AreaUtente
              client={selectedClient}
              appointments={appointments}
              bookingSlot={bookingSlot}
              clients={clients}
              googleEvents={googleEvents}
              googleReady={googleReady}
              googleStatus={googleStatus}
              onBookAppointment={bookUserAppointment}
              onCancelAppointment={(appointmentId) => updateAppointment(appointmentId, 'cancel')}
              onConnectGoogle={connectGoogleCalendar}
              onDisconnectGoogle={disconnectGoogleCalendar}
              onCloseAppointment={() => updateAppModel({ selectedUserAppointmentId: null })}
              onUpdateProfile={updateUserProfile}
              onRegister={registerFromUserArea}
              onCloseBooking={() => updateAppModel({ bookingSlot: null })}
              onSelectAppointment={(appointmentId) => updateAppModel({ selectedUserAppointmentId: appointmentId })}
              onSelectSlot={(slot) => updateAppModel({ bookingSlot: slot })}
              onSyncGoogle={syncFromGoogleCalendar}
              onUpdateAppointment={updateUserAppointment}
              selectedAppointmentId={selectedUserAppointmentId}
              services={services}
              vouchers={vouchers}
            />
          ) : (
            <LoginPage
              clients={clients}
              googleReady={googleReady}
              googleStatus={googleStatus}
              onGoogleLogin={() => {
                connectGoogleCalendar();
                updateAppModel({ selectedClientId, route: 'area-utente' });
                updateRouteHash('area-utente', appModel.studio?.id);
              }}
              onLogin={(clientId) => {
                updateAppModel({ selectedClientId: clientId, route: 'area-utente' });
                updateRouteHash('area-utente', appModel.studio?.id);
              }}
              onAdminLogin={loginBackofficeAdmin}
              adminStatus={adminStatus}
            />
          )}
          </main>
        </div>
        <CookieConsent consent={cookieConsent} onConsent={(value) => updateAppModel({ cookieConsent: value })} />
      </AppFrame>
    );
  }

  return (
    <AppFrame appModel={appModel} onRoute={setRoute}>
      <BackOffice
        addClient={addClient}
        appointments={appointments}
        clients={clients}
        connectGoogleCalendar={connectGoogleCalendar}
        createVoucher={createVoucher}
        deleteClient={deleteClient}
        deleteVoucher={deleteVoucher}
        disconnectGoogleCalendar={disconnectGoogleCalendar}
        editingClient={editingClient}
        editingVoucher={editingVoucher}
        exportCsv={exportCsv}
        googleEvents={googleEvents}
        googleReady={googleReady}
        googleStatus={googleStatus}
        adminSession={adminSession}
        adminStatus={adminStatus}
        createProduct={createProduct}
        createService={createService}
        deleteProduct={deleteProduct}
        deleteService={deleteService}
        messages={messages}
        notice={notice}
        onAdminLogout={logoutBackofficeAdmin}
        onOpenUserArea={() => setRoute('area-utente')}
        products={products}
        pushAppointmentToGoogle={pushAppointmentToGoogle}
        route={route}
        selectedClient={selectedClient}
        selectedClientId={selectedClientId}
        sellSubscription={sellSubscription}
        services={services}
        studio={appModel.studio}
        setRoute={setRoute}
        stats={stats}
        syncFromGoogleCalendar={syncFromGoogleCalendar}
        topUpWallet={topUpWallet}
        updateAppModel={updateAppModel}
        updateAppointment={updateAppointment}
        updateClient={updateClient}
        updateMessage={updateMessage}
        updateProduct={updateProduct}
        updateService={updateService}
        updateVoucher={updateVoucher}
        vouchers={vouchers}
      />
      <CookieConsent consent={cookieConsent} onConsent={(value) => updateAppModel({ cookieConsent: value })} />
    </AppFrame>
  );
}

function AppFrame({ appModel, children }) {
  const studio = appModel.studio;

  return (
    <>
      {children}
      <footer className="app-footer">
        <strong>{studio.name}</strong>
        <span>{studio.address}</span>
        <span>{studio.phone}</span>
        <span>{studio.email}</span>
      </footer>
    </>
  );
}

function CookieConsent({ consent, onConsent }) {
  if (consent) return null;

  return (
    <section className="cookie-banner" aria-label="Informativa cookie e privacy">
      <div>
        <strong>Privacy e cookie</strong>
        <p>Usiamo storage tecnico per login, preferenze, stato studio e integrazioni richieste. I dati sanitari e di contatto sono trattati solo per la gestione dello studio.</p>
      </div>
      <div className="front-actions">
        <button type="button" onClick={() => onConsent('essential')}>Solo necessari</button>
        <button type="button" onClick={() => onConsent('accepted')}>Accetta</button>
      </div>
    </section>
  );
}

function RootPage({ onCreateStudio, onLogin, onToggleStudio, rootSession, rootStatus }) {
  return (
    <main className="front-main">
      <section className="login-page">
        <div className="panel login-panel">
          <div>
            <p className="eyebrow">Root</p>
            <h1>Gestione studi</h1>
          </div>
          {!rootSession ? (
            <form className="form-grid" onSubmit={onLogin}>
              <label>Utente<input name="username" required defaultValue="root" /></label>
              <label>Password<input name="password" type="password" required defaultValue="password" /></label>
              <button type="submit">Entra come root</button>
            </form>
          ) : (
            <div className="stack">
              <form className="form-grid" onSubmit={onCreateStudio}>
                <label>Id studio<input name="id" required placeholder="studio-milano" /></label>
                <label>Nome studio<input name="name" required placeholder="Studio Milano" /></label>
                <label>Email admin<input name="adminEmail" type="email" required placeholder="admin@studio.it" /></label>
                <label>Password admin<input name="adminPassword" type="password" required placeholder="Password" /></label>
                <label>Valido fino al<input name="validUntil" type="date" required defaultValue="2027-05-07" /></label>
                <label>Prezzo annuo<input name="yearlyPrice" type="number" min="1" required defaultValue="50" /></label>
                <button type="submit">Crea studio</button>
              </form>
              {rootSession.studios.map((studio) => (
                <article className="product" key={studio.id}>
                  <div>
                    <strong>{studio.name}</strong>
                    <span>{studio.id} · {studio.enabled ? 'abilitato' : 'disabilitato'}</span>
                    <small>Abbonamento {studio.subscription.status} fino a {studio.subscription.validUntil}</small>
                  </div>
                  <div className="stack-tight">
                    <strong>{currency(studio.subscription.yearlyPrice)} / anno</strong>
                    <button type="button" onClick={() => onToggleStudio(studio)}>
                      {studio.enabled ? 'Disabilita' : 'Abilita'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <small>{rootStatus || 'Credenziali demo: root / password.'}</small>
        </div>
      </section>
    </main>
  );
}

function LoginPage({ adminStatus, clients, googleReady, googleStatus, onAdminLogin, onGoogleLogin, onLogin }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');

  return (
    <section className="login-page login-grid">
      <div className="panel login-panel">
        <div>
          <p className="eyebrow">Accesso cliente</p>
          <h1>Area utente</h1>
        </div>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onLogin(clientId); }}>
          <label>Email o codice utente
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.email} · {client.id}</option>
              ))}
            </select>
          </label>
          <label>Password
            <input type="password" placeholder="Password" defaultValue="demo" />
          </label>
          <button type="submit">Entra</button>
        </form>
        <div className="login-divider">oppure</div>
        <button className="google-button" disabled={!googleReady} onClick={onGoogleLogin} type="button">
          G
          <span>Login Google</span>
        </button>
        <small>{googleStatus}</small>
      </div>

      <div className="panel login-panel">
        <div>
          <p className="eyebrow">Accesso amministratore</p>
          <h1>Backoffice</h1>
        </div>
        <form className="form-grid" onSubmit={onAdminLogin}>
          <label>Email amministratore
            <input name="adminEmail" type="email" required placeholder="admin@studio.it" defaultValue="admin@marcy.local" />
          </label>
          <label>Password
            <input name="adminPassword" type="password" required placeholder="Password" defaultValue="admin" />
          </label>
          <button type="submit">Entra nel backoffice</button>
        </form>
        <small>{adminStatus || 'Credenziali demo: admin@marcy.local / admin.'}</small>
      </div>
    </section>
  );
}

export default App;
