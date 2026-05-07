import { useState } from 'react';
import { currency, findService } from '../domain.js';
import AppointmentModal from './AppointmentModal.jsx';
import CalendarGrid from './CalendarGrid.jsx';
import GoogleCalendarPanel from './GoogleCalendarPanel.jsx';
import Metric from './Metric.jsx';

const userSections = [
  { id: 'overview', label: 'Riepilogo' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'treatments', label: 'Trattamenti' },
  { id: 'messages', label: 'Messaggi' },
];

function AreaUtente({
  bookingSlot,
  client,
  appointments,
  clients,
  googleEvents,
  googleReady,
  googleStatus,
  onBookAppointment,
  onCancelAppointment,
  onCloseAppointment,
  onCloseBooking,
  onConnectGoogle,
  onDisconnectGoogle,
  onRegister,
  onSelectAppointment,
  onSelectSlot,
  onSyncGoogle,
  onUpdateAppointment,
  selectedAppointmentId,
  vouchers,
}) {
  const [activeSection, setActiveSection] = useState('overview');
  const clientAppointments = appointments.filter((item) => item.clientId === client.id);
  const boughtVouchers = vouchers.filter((item) => item.buyerId === client.id);
  const lastAppointment = clientAppointments[0];
  const selectedAppointment = clientAppointments.find((appointment) => appointment.id === selectedAppointmentId);

  return (
    <section className="area-utente">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Area riservata</p>
            <h2>{client.name} {client.surname}</h2>
          </div>
          <div className="user-actions">
            <div className="login-chip">Codice utente + password</div>
            <button type="button" onClick={onRegister}>Registrati</button>
          </div>
        </div>
        <nav className="user-nav" aria-label="Sezioni area utente">
          {userSections.map((section) => (
            <button
              className={activeSection === section.id ? 'active' : ''}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>
      </section>

      {activeSection === 'overview' && (
        <section className="panel">
          <div className="client-summary">
            <Metric title="Abbonamenti pagati" value={client.subscription.purchased} extra={client.subscription.name} />
            <Metric title="Abbonamento in corso" value={`${client.subscription.remaining} residui`} extra="Ultimo trattamento incluso nel reminder" />
            <Metric title="Prepagata" value={currency(client.prepaid.balance)} extra={`Scadenza ${client.prepaid.validUntil}`} />
            <Metric title="Voucher ricevuti o pagati" value={boughtVouchers.length} extra="Stato utilizzo visibile" />
          </div>
        </section>
      )}

      {activeSection === 'calendar' && (
        <section className="panel user-calendar-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Calendario personale</p>
              <h2>Disponibilita e appuntamenti</h2>
            </div>
            <span className="login-chip">{clientAppointments.length} appuntamenti</span>
          </div>
          <CalendarGrid
            appointments={appointments}
            clients={clients}
            compact
            currentClientId={client.id}
            googleEvents={googleEvents}
            googleToolbar={
              <GoogleCalendarPanel
                compact
                ready={googleReady}
                status={googleStatus}
                events={googleEvents}
                onConnect={onConnectGoogle}
                onDisconnect={onDisconnectGoogle}
                onSync={onSyncGoogle}
              />
            }
            onAction={() => {}}
            onAppointmentSelect={onSelectAppointment}
            onPushGoogle={() => {}}
            onSlotSelect={onSelectSlot}
            readOnly
            userMode
          />
          {bookingSlot && (
            <AppointmentModal
              clients={[client]}
              defaultClientId={client.id}
              mode="create"
              onClose={onCloseBooking}
              onSubmit={onBookAppointment}
              slot={bookingSlot}
            />
          )}
          {selectedAppointment && (
            <AppointmentModal
              appointment={selectedAppointment}
              onCancel={() => onCancelAppointment(selectedAppointment.id)}
              onClose={onCloseAppointment}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                onUpdateAppointment(selectedAppointment.id, {
                  date: String(data.get('date')),
                  time: String(data.get('time')),
                  serviceId: String(data.get('serviceId')),
                  payment: String(data.get('payment')),
                });
              }}
            />
          )}
        </section>
      )}

      {activeSection === 'treatments' && (
        <section className="panel">
          <h2>Trattamenti eseguiti</h2>
          <div className="timeline">
            {clientAppointments.map((appointment) => {
              const service = findService(appointment.serviceId);
              return (
                <article key={appointment.id}>
                  <strong>{appointment.date}</strong>
                  <span>{service?.name} · {appointment.status}</span>
                </article>
              );
            })}
            {!clientAppointments.length && <p>Nessun trattamento registrato.</p>}
          </div>
        </section>
      )}

      {activeSection === 'messages' && (
        <section className="panel">
          <h2>Prodotti e messaggi</h2>
          <div className="message-rules">
            <p>Recall programmato 48 ore prima dell'appuntamento.</p>
            <p>{client.subscription.remaining === 1 ? 'Questo è l’ultimo trattamento in abbonamento.' : 'Offerta rinnovo configurabile con buono 10% su prepagata.'}</p>
            <p>Ultimo trattamento: {lastAppointment?.date ?? 'non disponibile'}</p>
          </div>
          <button onClick={() => window.alert('Simulazione: apertura ricarica prepagata online')}>Carica prepagata</button>
        </section>
      )}
    </section>
  );
}

export default AreaUtente;
