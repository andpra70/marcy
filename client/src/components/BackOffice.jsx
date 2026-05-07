import { useState } from 'react';
import { backofficeNavItems, calendarBufferMinutes, subscriptions, workflowSteps } from '../appData.js';
import { appointmentRevenue, currency, findService, hoursUntil, isPastAppointment, isPastDateTime } from '../domain.js';
import AppointmentModal from './AppointmentModal.jsx';
import CalendarGrid from './CalendarGrid.jsx';
import FlowStep from './FlowStep.jsx';
import GoogleCalendarPanel from './GoogleCalendarPanel.jsx';
import Kpi from './Kpi.jsx';
import MasterDetailLayout from './MasterDetailLayout.jsx';
import Metric from './Metric.jsx';

function BackOffice({
  addClient,
  appointments,
  clients,
  connectGoogleCalendar,
  createVoucher,
  createProduct,
  createService,
  deleteClient,
  deleteProduct,
  deleteService,
  deleteVoucher,
  disconnectGoogleCalendar,
  editingClient,
  editingVoucher,
  exportCsv,
  googleEvents,
  googleReady,
  googleStatus,
  adminSession,
  adminStatus,
  messages,
  notice,
  onAdminLogout,
  onOpenUserArea,
  pushAppointmentToGoogle,
  products,
  route,
  selectedClient,
  selectedClientId,
  sellSubscription,
  services,
  studio,
  setRoute,
  stats,
  syncFromGoogleCalendar,
  topUpWallet,
  updateAppModel,
  updateAppointment,
  updateClient,
  updateMessage,
  updateProduct,
  updateService,
  updateVoucher,
  vouchers,
}) {
  const backofficeSection = route.replace('backoffice/', '');
  const backofficeTitle = backofficeNavItems.find((item) => item.id === route)?.label ?? 'Backoffice';
  const [calendarSlot, setCalendarSlot] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedAppointmentId);

  function closeAppointmentModal() {
    setCalendarSlot(null);
    setSelectedAppointmentId(null);
  }

  function submitCalendarAppointment(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      clientId: String(data.get('clientId')),
      date: String(data.get('date')),
      time: String(data.get('time')),
      serviceId: String(data.get('serviceId')),
      payment: String(data.get('payment')),
    };

    if ((selectedAppointment && isPastAppointment(selectedAppointment)) || isPastDateTime(values.date, values.time)) {
      updateAppModel({ notice: 'Gli appuntamenti passati non possono essere creati o modificati.' });
      closeAppointmentModal();
      return;
    }

    if (selectedAppointment) {
      updateAppModel((current) => ({
        ...current,
        appointments: current.appointments.map((appointment) =>
          appointment.id === selectedAppointment.id ? { ...appointment, ...values, status: 'Spostato' } : appointment,
        ),
        notice: `Appuntamento ${selectedAppointment.id} aggiornato.`,
      }));
    } else {
      const client = clients.find((item) => item.id === values.clientId);
      const needsApproval = values.payment !== 'Abbonamento' && values.payment !== 'Voucher gift' && (client?.subscription.remaining ?? 0) <= 0;
      updateAppModel((current) => ({
        ...current,
        appointments: [
          {
            id: `APP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            ...values,
            status: needsApproval ? 'Da approvare' : 'Confermato',
            moved: 0,
            cancelled: 0,
          },
          ...current.appointments,
        ],
        notice: needsApproval ? 'Appuntamento creato e messo in approvazione.' : 'Appuntamento creato e confermato.',
      }));
    }

    closeAppointmentModal();
  }

  return (
    <div className="backoffice-shell">
      <header className="backoffice-header">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>Marcy</strong>
            <small>Gestione massoterapia</small>
          </div>
        </div>
        <nav className="backoffice-nav" aria-label="Sezioni backoffice">
          {backofficeNavItems.map((item) => (
            <button className={route === item.id ? 'active' : ''} key={item.id} onClick={() => setRoute(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <span className="login-chip">Studio: {studio?.id ?? adminSession?.studio.id}</span>
          <button type="button" onClick={onOpenUserArea}>Area utente</button>
          <button className="google-button" onClick={connectGoogleCalendar}>
            G
            <span>Login Google</span>
          </button>
          <button className="secondary-button" type="button" onClick={onAdminLogout}>Esci</button>
        </div>
      </header>

      <main>
        <div className="topbar">
          <div>
            <p className="eyebrow">Backoffice</p>
            <h1>{backofficeTitle}</h1>
            <small>{adminSession?.studio.name} · {adminSession?.admin.email}</small>
          </div>
          {adminStatus && <span className="login-chip">{adminStatus}</span>}
        </div>

        <div className="notice">{notice}</div>

        {backofficeSection === 'dashboard' && (
          <section className="page-grid">
            <Kpi label="Appuntamenti" value={stats.appointments} detail="Calendario operativo" />
            <Kpi label="Clienti" value={stats.clients} detail="Anagrafiche create" />
            <Kpi label="Trattamenti" value={stats.services} detail="Listino studio" />
            <Kpi label="Incasso" value={currency(stats.revenue)} detail="Totale simulato" />

            <section className="wide panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Cliente selezionato</p>
                  <h2>{selectedClient ? `${selectedClient.name} ${selectedClient.surname}` : 'Nessun cliente'}</h2>
                </div>
                {clients.length > 0 && (
                  <select value={selectedClientId} onChange={(event) => updateAppModel({ selectedClientId: event.target.value })}>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.surname} {client.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {selectedClient ? (
                <div className="client-summary">
                  <Metric title="Codice univoco" value={selectedClient.id} />
                  <Metric title="Abbonamento" value={selectedClient.subscription.name} extra={`${selectedClient.subscription.remaining} massaggi residui`} />
                  <Metric title="Prepagata" value={currency(selectedClient.prepaid.balance)} extra={`Valida fino a ${selectedClient.prepaid.validUntil}`} />
                  <Metric title="Voucher acquistati" value={selectedClient.vouchersBought} />
                  <Metric title="Fisiopatologie" value={selectedClient.pathologies} extra={`${selectedClient.photos} foto caricate`} />
                </div>
              ) : (
                <p className="empty-state">Crea una nuova anagrafica dalla sezione Clienti.</p>
              )}
            </section>

            <section className="wide panel flow-board">
              <h2>Workflow da Excel</h2>
              {workflowSteps.map((step) => (
                <FlowStep key={step.title} title={step.title} text={step.text} />
              ))}
            </section>
          </section>
        )}

        {backofficeSection === 'calendar' && (
          <section className="panel user-calendar-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Griglia agenda</p>
                  <h2>Slot e appuntamenti</h2>
                </div>
                <span className="login-chip">Google Calendar: {googleEvents.length} eventi</span>
              </div>
              <CalendarGrid
                appointments={appointments}
                clients={clients}
                services={services}
                googleEvents={googleEvents}
                googleToolbar={
                  <GoogleCalendarPanel
                    compact
                    ready={googleReady}
                    status={googleStatus}
                    events={googleEvents}
                    onConnect={connectGoogleCalendar}
                    onDisconnect={disconnectGoogleCalendar}
                    onSync={syncFromGoogleCalendar}
                  />
                }
                onAction={updateAppointment}
                onAppointmentSelect={(appointmentId) => setSelectedAppointmentId(appointmentId)}
                onPushGoogle={pushAppointmentToGoogle}
                onSlotSelect={(slot) => setCalendarSlot(slot)}
              />
              {(calendarSlot || selectedAppointment) && (
                <AppointmentModal
                  appointment={selectedAppointment}
                  clients={clients}
                  defaultClientId={selectedClientId}
                  mode={selectedAppointment ? 'edit' : 'create'}
                  onApprove={() => {
                    updateAppointment(selectedAppointment.id, 'approve');
                    closeAppointmentModal();
                  }}
                  onCancel={() => {
                    updateAppointment(selectedAppointment.id, 'cancel');
                    closeAppointmentModal();
                  }}
                  onClose={closeAppointmentModal}
                  services={services}
                  onSubmit={submitCalendarAppointment}
                  slot={calendarSlot}
                />
              )}
              <h2 className="subheading">Dettaglio agenda</h2>
              <div className="appointment-list compact-list">
                {appointments.map((appointment) => {
                  const client = clients.find((item) => item.id === appointment.clientId);
                  const service = findService(appointment.serviceId, services);
                  const lateMove = hoursUntil(appointment.date, appointment.time) < 8;
                  const lateCancel = hoursUntil(appointment.date, appointment.time) < 24;
                  const isPast = isPastAppointment(appointment);
                  return (
                    <article className="appointment" key={appointment.id}>
                      <div>
                        <strong>{appointment.date} alle {appointment.time}</strong>
                        <span>{client?.name} {client?.surname} · {service?.name}</span>
                        <small>{appointment.status} · {appointment.payment} · {service?.minutes + calendarBufferMinutes} min riservati</small>
                      </div>
                      <div className="policy">
                        <span className={lateMove ? 'warning' : 'ok'}>Buffer {calendarBufferMinutes} min</span>
                        <span className={lateCancel ? 'warning' : 'ok'}>{lateCancel ? 'Entro 24h: scala -1' : 'Oltre 24h: nessun addebito'}</span>
                      </div>
                      <div className="row-actions">
                        <button disabled={isPast} onClick={() => setSelectedAppointmentId(appointment.id)}>Apri</button>
                        <button disabled={isPast} onClick={() => updateAppointment(appointment.id, 'approve')}>Approva</button>
                        <button disabled={isPast} onClick={() => updateAppointment(appointment.id, 'move')}>Sposta</button>
                        <button disabled={isPast} onClick={() => updateAppointment(appointment.id, 'cancel')}>Annulla</button>
                        <button disabled={isPast} onClick={() => updateAppointment(appointment.id, 'paid')}>Pagato</button>
                      </div>
                    </article>
                  );
                })}
              </div>
          </section>
        )}

        {backofficeSection === 'clients' && (
          <MasterDetailLayout
            detail={
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Anagrafica</p>
                    <h2>{editingClient ? 'Modifica cliente' : 'Registrazione cliente'}</h2>
                  </div>
                  {editingClient && <button type="button" onClick={() => updateAppModel({ editingClientId: null })}>Nuovo cliente</button>}
                </div>
                <ClientForm
                  key={editingClient?.id ?? 'new-client'}
                  client={editingClient}
                  mode={editingClient ? 'edit' : 'create'}
                  onSubmit={editingClient ? updateClient : addClient}
                />
              </>
            }
            list={
              <>
                <h2>Anagrafica</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Contatti</th>
                        <th>Comune</th>
                        <th>Abbonamento</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr className={client.id === selectedClientId ? 'selected-row' : ''} key={client.id} onClick={() => updateAppModel({ selectedClientId: client.id })}>
                          <td><strong>{client.surname} {client.name}</strong><small>{client.id}</small></td>
                          <td>{client.email}<small>{client.phone}</small></td>
                          <td>{client.city}</td>
                          <td>{client.subscription.remaining} residui<small>{client.pathologies}</small></td>
                          <td>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateAppModel({ editingClientId: client.id, selectedClientId: client.id });
                              }}
                            >
                              Modifica
                            </button>
                            <button type="button" onClick={(event) => { event.stopPropagation(); deleteClient(client.id); }}>
                              Elimina
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            }
          />
        )}

        {backofficeSection === 'treatments' && (
          <section className="split">
            <div className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Listino</p>
                  <h2>Trattamenti</h2>
                </div>
              </div>
              <ServiceForm onSubmit={createService} />
              <div className="product-list">
                {services.map((service) => (
                  <EditableService
                    key={service.id}
                    onDelete={() => deleteService(service.id)}
                    onUpdate={(values) => updateService(service.id, values)}
                    service={service}
                  />
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Prodotti</p>
                  <h2>Prodotti e voucher a listino</h2>
                </div>
              </div>
              <ProductForm onSubmit={createProduct} />
              <div className="product-list">
                {products.map((product) => (
                  <EditableProduct
                    key={product.id}
                    onDelete={() => deleteProduct(product.id)}
                    onUpdate={(values) => updateProduct(product.id, values)}
                    product={product}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {backofficeSection === 'payments' && (
          <section className="split">
            <div className="panel">
              <h2>Incasso in studio</h2>
              {selectedClient ? (
                <PaymentForm selectedClient={selectedClient} onSubscription={sellSubscription} onWallet={topUpWallet} />
              ) : (
                <p className="empty-state">Crea o seleziona un cliente prima di registrare pagamenti.</p>
              )}
            </div>
            <div className="panel">
              <h2>Prodotti e righe conto</h2>
              <div className="product-list">
                {products.map((product) => (
                  <article key={product.id} className="product">
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.type} · {product.code}</span>
                    </div>
                    <div>
                      <small>Costo {currency(product.cost)}</small>
                      <strong>{currency(product.price)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {backofficeSection === 'voucher' && (
          <MasterDetailLayout
            detail={
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Voucher gift</p>
                    <h2>{editingVoucher ? 'Modifica voucher' : 'Crea voucher gift'}</h2>
                  </div>
                  {editingVoucher && <button type="button" onClick={() => updateAppModel({ editingVoucherId: null })}>Nuovo voucher</button>}
                </div>
                <VoucherForm
                  key={editingVoucher?.id ?? 'new-voucher'}
                  mode={editingVoucher ? 'edit' : 'create'}
                  onSubmit={editingVoucher ? updateVoucher : createVoucher}
                  voucher={editingVoucher}
                />
              </>
            }
            list={
              <>
                <h2>Voucher emessi</h2>
                <div className="voucher-list">
                  {vouchers.map((voucher) => (
                    <article className="voucher" key={voucher.id}>
                      <div className="qr">{voucher.id.slice(-4)}</div>
                      <div>
                        <strong>{voucher.recipient}</strong>
                        <span>{voucher.sessions} massaggi · {voucher.status}</span>
                        <small>{voucher.email} · {voucher.phone}</small>
                        <div className="row-actions compact-actions">
                          <button type="button" onClick={() => updateAppModel({ editingVoucherId: voucher.id })}>Modifica</button>
                          <button type="button" onClick={() => deleteVoucher(voucher.id)}>Elimina</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            }
          />
        )}

        {backofficeSection === 'reports' && (
          <Reports clients={clients} appointments={appointments} onExport={exportCsv} services={services} />
        )}

        {backofficeSection === 'messages' && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Messaggi</p>
                <h2>Regole operative</h2>
              </div>
            </div>
            <div className="message-rules">
              {messages.map((message) => (
                <MessageRule
                  key={message.id}
                  message={message}
                  onUpdate={(values) => updateMessage(message.id, values)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ServiceForm({ onSubmit }) {
  return (
    <form className="form-grid compact-form" onSubmit={onSubmit}>
      <label>Nome<input name="name" required placeholder="Massaggio standard 60 min" /></label>
      <label>Durata
        <select name="minutes" required defaultValue="60">
          <option value="30">30 min</option>
          <option value="60">60 min</option>
        </select>
      </label>
      <label>Prezzo<input name="price" type="number" min="1" required placeholder="50" /></label>
      <button type="submit">Aggiungi trattamento</button>
    </form>
  );
}

function EditableService({ onDelete, onUpdate, service }) {
  return (
    <form
      className="product editable-row"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onUpdate({
          name: String(data.get('name')).trim(),
          minutes: Number(data.get('minutes')),
          price: Number(data.get('price')),
        });
      }}
    >
      <label>Nome<input name="name" required defaultValue={service.name} /></label>
      <label>Durata
        <select name="minutes" required defaultValue={service.minutes}>
          <option value="30">30 min</option>
          <option value="60">60 min</option>
        </select>
      </label>
      <label>Prezzo<input name="price" type="number" min="1" required defaultValue={service.price} /></label>
      <div className="row-actions compact-actions">
        <button type="submit">Salva</button>
        <button type="button" onClick={onDelete}>Elimina</button>
      </div>
    </form>
  );
}

function ProductForm({ onSubmit }) {
  return (
    <form className="form-grid compact-form" onSubmit={onSubmit}>
      <label>Tipo
        <select name="type" required defaultValue="Prodotto">
          <option>Prodotto</option>
          <option>Voucher</option>
        </select>
      </label>
      <label>Codice<input name="code" required placeholder="CRM-SPORT" /></label>
      <label>Nome<input name="name" required placeholder="Crema defaticante" /></label>
      <label>Costo<input name="cost" type="number" min="0" required defaultValue="0" /></label>
      <label>Prezzo<input name="price" type="number" min="1" required placeholder="28" /></label>
      <button type="submit">Aggiungi prodotto</button>
    </form>
  );
}

function EditableProduct({ onDelete, onUpdate, product }) {
  return (
    <form
      className="product editable-row"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onUpdate({
          type: String(data.get('type')),
          code: String(data.get('code')).trim(),
          name: String(data.get('name')).trim(),
          cost: Number(data.get('cost')),
          price: Number(data.get('price')),
        });
      }}
    >
      <label>Tipo
        <select name="type" required defaultValue={product.type}>
          <option>Prodotto</option>
          <option>Voucher</option>
        </select>
      </label>
      <label>Codice<input name="code" required defaultValue={product.code} /></label>
      <label>Nome<input name="name" required defaultValue={product.name} /></label>
      <label>Costo<input name="cost" type="number" min="0" required defaultValue={product.cost} /></label>
      <label>Prezzo<input name="price" type="number" min="1" required defaultValue={product.price} /></label>
      <div className="row-actions compact-actions">
        <button type="submit">Salva</button>
        <button type="button" onClick={onDelete}>Elimina</button>
      </div>
    </form>
  );
}

function MessageRule({ message, onUpdate }) {
  return (
    <form
      className="message-rule"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onUpdate({
          title: String(data.get('title')).trim(),
          channel: String(data.get('channel')).trim(),
          trigger: String(data.get('trigger')).trim(),
          text: String(data.get('text')).trim(),
          enabled: Boolean(data.get('enabled')),
        });
      }}
    >
      <label>Titolo<input name="title" required defaultValue={message.title} /></label>
      <label>Canale<input name="channel" required defaultValue={message.channel} /></label>
      <label>Trigger<input name="trigger" required defaultValue={message.trigger} /></label>
      <label>Testo<input name="text" required defaultValue={message.text} /></label>
      <label className="checkbox">
        <input name="enabled" type="checkbox" defaultChecked={message.enabled} />
        Attivo
      </label>
      <button type="submit">Salva regola</button>
    </form>
  );
}

function ClientForm({ client, mode = 'create', onSubmit }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>Nome<input name="name" required placeholder="Nome" defaultValue={client?.name ?? ''} /></label>
      <label>Cognome<input name="surname" required placeholder="Cognome" defaultValue={client?.surname ?? ''} /></label>
      <label>Codice fiscale<input name="fiscalCode" placeholder="RSS..." defaultValue={client?.fiscalCode ?? ''} /></label>
      <label>Indirizzo<input name="address" placeholder="Via..." defaultValue={client?.address ?? ''} /></label>
      <label>Comune<input name="city" placeholder="Comune" defaultValue={client?.city ?? ''} /></label>
      <label>Cellulare<input name="phone" placeholder="+39..." defaultValue={client?.phone ?? ''} /></label>
      <label>Email<input name="email" type="email" required placeholder="cliente@email.it" defaultValue={client?.email ?? ''} /></label>
      <label>Data di nascita<input name="birthDate" type="date" defaultValue={client?.birthDate ?? ''} /></label>
      <label>Genere
        <select name="gender" required defaultValue={client?.gender ?? 'Donna'}>
          <option>Donna</option>
          <option>Uomo</option>
          <option>Altro</option>
        </select>
      </label>
      <label>Note generali<input name="notes" placeholder="Preferenze, indicazioni operative" defaultValue={client?.notes ?? ''} /></label>
      <label>Fisiopatologie<input name="pathologies" placeholder="Anamnesi sintetica" defaultValue={client?.pathologies ?? ''} /></label>
      <button type="submit">{mode === 'edit' ? 'Salva modifiche' : 'Crea anagrafica'}</button>
    </form>
  );
}

function PaymentForm({ selectedClient, onSubscription, onWallet }) {
  return (
    <div className="stack">
      <div className="selected-strip">
        <span>Cliente</span>
        <strong>{selectedClient.surname} {selectedClient.name}</strong>
      </div>
      <form className="form-grid" onSubmit={onSubscription}>
        <label>Abbonamento
          <select name="subscriptionId" required>
            {subscriptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {currency(item.price)}</option>)}
          </select>
        </label>
        <label>Trattamenti da inglobare<input name="includedTreatments" type="number" min="0" defaultValue="0" /></label>
        <label>Sconto valore<input name="discount" type="number" min="0" defaultValue="0" /></label>
        <label>Sconto percentuale<input name="discountRate" type="number" min="0" max="100" defaultValue="0" /></label>
        <label>Metodo
          <select name="method" required>
            <option>cc</option>
            <option>bonifico</option>
            <option>contanti</option>
          </select>
        </label>
        <label>Pagamento
          <select name="paymentStatus" required>
            <option>pagato</option>
            <option>acconto saldato parzialmente</option>
          </select>
        </label>
        <button type="submit">Associa e segna pagato</button>
      </form>
      <form className="wallet-form" onSubmit={onWallet}>
        <label>Carica prepagata wallet
          <input name="amount" type="number" min="1" required placeholder="Importo Nexi" />
        </label>
        <button type="submit">Carica</button>
      </form>
    </div>
  );
}

function VoucherForm({ mode = 'create', onSubmit, voucher }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>Destinatario<input name="recipient" required placeholder="Nome Cognome" defaultValue={voucher?.recipient ?? ''} /></label>
      <label>Email<input name="email" type="email" required placeholder="email destinatario" defaultValue={voucher?.email ?? ''} /></label>
      <label>Telefono<input name="phone" required placeholder="+39..." defaultValue={voucher?.phone ?? ''} /></label>
      <label>Massaggi
        <input name="sessions" type="number" min="1" max="10" defaultValue={voucher?.sessions ?? 1} required />
      </label>
      <label className="checkbox">
        <input name="notify" type="checkbox" defaultChecked={voucher?.status !== 'Creato senza invio'} />
        Invia email e WhatsApp al destinatario
      </label>
      <button type="submit">{mode === 'edit' ? 'Salva voucher' : 'Genera voucher'}</button>
    </form>
  );
}

function Reports({ clients, appointments, onExport, services }) {
  const [filters, setFilters] = useState({ surname: '', city: '', gender: 'Tutti', average: '' });
  const filteredClients = clients.filter((client) => {
    const clientAppointments = appointments.filter((item) => item.clientId === client.id);
    const total = appointmentRevenue(clientAppointments, services);
    const average = clientAppointments.length ? total / clientAppointments.length : 0;
    return (
      client.surname.toLowerCase().includes(filters.surname.toLowerCase()) &&
      client.city.toLowerCase().includes(filters.city.toLowerCase()) &&
      (filters.gender === 'Tutti' || client.gender === filters.gender) &&
      (!filters.average || average >= Number(filters.average))
    );
  });

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Liste Excel</p>
          <h2>Filtri e anteprima export</h2>
        </div>
        <div className="export-actions">
          <button onClick={() => onExport('anagrafica-clienti')}>Anagrafica CSV</button>
          <button onClick={() => onExport('abbonamenti-clienti')}>Abbonamenti CSV</button>
          <button onClick={() => onExport('prodotti-venduti')}>Prodotti CSV</button>
        </div>
      </div>
      <div className="filters">
        <label>Da<input type="date" /></label>
        <label>A<input type="date" /></label>
        <label>Cognome<input value={filters.surname} onChange={(event) => setFilters({ ...filters, surname: event.target.value })} /></label>
        <label>Comune<input value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} /></label>
        <label>Genere
          <select value={filters.gender} onChange={(event) => setFilters({ ...filters, gender: event.target.value })}>
            <option>Tutti</option>
            <option>Donna</option>
            <option>Uomo</option>
            <option>Altro</option>
          </select>
        </label>
        <label>Incasso medio oltre<input type="number" value={filters.average} onChange={(event) => setFilters({ ...filters, average: event.target.value })} /></label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Comune</th>
              <th>Trattamenti</th>
              <th>Incassato</th>
              <th>Medio</th>
              <th>Abbonamenti</th>
              <th>Voucher</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => {
              const rows = appointments.filter((item) => item.clientId === client.id);
              const total = appointmentRevenue(rows, services);
              return (
                <tr key={client.id}>
                  <td><strong>{client.surname} {client.name}</strong><small>{client.birthDate}</small></td>
                  <td>{client.city}</td>
                  <td>{rows.length}</td>
                  <td>{currency(total)}</td>
                  <td>{currency(rows.length ? total / rows.length : 0)}</td>
                  <td>{client.subscription.purchased}</td>
                  <td>{client.vouchersBought}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default BackOffice;
