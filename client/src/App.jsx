import { useEffect, useMemo, useState } from 'react';
import { calendarBufferMinutes, calendarDays, subscriptions } from './appData.js';
import { loginAdmin, saveStudioState } from './backendApi.js';
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
    return normalizeAppModel({ ...loadAppModel(savedAdminSession?.studio.id), route: getInitialRoute() });
  });
  const [adminStatus, setAdminStatus] = useState('');
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
    notice,
    route,
    selectedUserAppointmentId,
    selectedClientId,
    vouchers,
  } = appModel;

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;
  const editingClient = clients.find((client) => client.id === editingClientId);
  const editingVoucher = vouchers.find((voucher) => voucher.id === editingVoucherId);
  const isBackofficeRoute = route.startsWith('backoffice/');
  const isAdminAuthenticated = Boolean(adminSession?.token);

  function updateAppModel(updater) {
    setAppModel((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return next;
    });
  }

  function setRoute(routeId) {
    updateRouteHash(routeId);
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
      updateAppModel({ route: getInitialRoute() });
    }

    window.addEventListener('hashchange', handleRouteChange);
    return () => window.removeEventListener('hashchange', handleRouteChange);
  }, []);

  const stats = useMemo(() => {
    const paidTotal = appointments.reduce((sum, appointment) => {
      const service = findService(appointment.serviceId);
      return appointment.status === 'Pagato' || appointment.payment !== 'Da incassare' ? sum + (service?.price ?? 0) : sum;
    }, 0);

    return {
      appointments: appointments.length,
      clients: clients.length,
      reminders: appointments.filter((item) => item.status === 'Confermato').length,
      revenue: paidTotal,
    };
  }, [appointments, clients]);

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
    updateRouteHash('area-utente');
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
    const service = findService(appointment.serviceId);
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
      const revenue = appointmentRevenue(clientAppointments);
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
      });
      const studioAppModel = session.appModel
        ? normalizeAppModel({ ...defaultAppModel, ...session.appModel, studio: session.studio })
        : normalizeAppModel({ ...defaultAppModel, studio: session.studio });

      setAdminSession({
        token: session.token,
        admin: session.admin,
        studio: session.studio,
      });
      updateRouteHash('backoffice/dashboard');
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

  if (!isBackofficeRoute || !isAdminAuthenticated) {
    return (
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
            <button type="button" onClick={() => setRoute('area-utente')}>Area utente</button>
            <button type="button" onClick={() => setRoute('backoffice/dashboard')}>Backoffice</button>
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
              onRegister={registerFromUserArea}
              onCloseBooking={() => updateAppModel({ bookingSlot: null })}
              onSelectAppointment={(appointmentId) => updateAppModel({ selectedUserAppointmentId: appointmentId })}
              onSelectSlot={(slot) => updateAppModel({ bookingSlot: slot })}
              onSyncGoogle={syncFromGoogleCalendar}
              onUpdateAppointment={updateUserAppointment}
              selectedAppointmentId={selectedUserAppointmentId}
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
                updateRouteHash('area-utente');
              }}
              onLogin={(clientId) => {
                updateAppModel({ selectedClientId: clientId, route: 'area-utente' });
                updateRouteHash('area-utente');
              }}
              onAdminLogin={loginBackofficeAdmin}
              adminStatus={adminStatus}
            />
          )}
        </main>
      </div>
    );
  }

  return (
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
      notice={notice}
      onAdminLogout={logoutBackofficeAdmin}
      onOpenUserArea={() => setRoute('area-utente')}
      pushAppointmentToGoogle={pushAppointmentToGoogle}
      route={route}
      selectedClient={selectedClient}
      selectedClientId={selectedClientId}
      sellSubscription={sellSubscription}
      setRoute={setRoute}
      stats={stats}
      syncFromGoogleCalendar={syncFromGoogleCalendar}
      topUpWallet={topUpWallet}
      updateAppModel={updateAppModel}
      updateAppointment={updateAppointment}
      updateClient={updateClient}
      updateVoucher={updateVoucher}
      vouchers={vouchers}
    />
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
