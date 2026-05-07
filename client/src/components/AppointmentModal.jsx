import { services } from '../appData.js';
import { currency, isPastDateTime } from '../domain.js';

function AppointmentModal({
  appointment,
  clients = [],
  defaultClientId,
  mode = 'edit',
  onApprove,
  onCancel,
  onClose,
  onDelete,
  onSubmit,
  slot,
}) {
  const isCreate = mode === 'create';
  const title = isCreate ? `${slot.date} alle ${slot.time}` : `${appointment.date} alle ${appointment.time}`;
  const isPast = isCreate ? isPastDateTime(slot.date, slot.time) : isPastDateTime(appointment.date, appointment.time);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="panel modal-panel" role="dialog" aria-modal="true" aria-labelledby="appointment-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isCreate ? 'Nuovo appuntamento' : 'Appuntamento'}</p>
            <h2 id="appointment-title">{title}</h2>
          </div>
          <button type="button" onClick={onClose}>Chiudi</button>
        </div>
        {isPast && <div className="notice inline-notice">Appuntamento passato: modifiche non consentite.</div>}
        <form className="form-grid" onSubmit={onSubmit}>
          {isCreate ? (
            <label>Cliente
              <select name="clientId" required defaultValue={defaultClientId} disabled={isPast}>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.surname} {client.name}</option>)}
              </select>
            </label>
          ) : (
            <input name="clientId" type="hidden" value={appointment.clientId} />
          )}
          <label>Data
            <input name="date" type="date" required defaultValue={isCreate ? slot.date : appointment.date} disabled={isPast} />
          </label>
          <label>Ora
            <input name="time" type="time" required defaultValue={isCreate ? slot.time : appointment.time} disabled={isPast} />
          </label>
          <label>Trattamento
            <select name="serviceId" required defaultValue={appointment?.serviceId} disabled={isPast}>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {currency(service.price)}</option>)}
            </select>
          </label>
          <label>Pagamento previsto
            <select name="payment" required defaultValue={appointment?.payment ?? 'In studio'} disabled={isPast}>
              <option>In studio</option>
              <option>Abbonamento</option>
              <option>Prepagata</option>
              <option>Voucher gift</option>
              <option>Online</option>
            </select>
          </label>
          <button type="submit" disabled={isPast}>{isCreate ? 'Crea appuntamento' : 'Salva modifiche'}</button>
          {!isCreate && appointment.status === 'Da approvare' && <button type="button" disabled={isPast} onClick={onApprove}>Conferma</button>}
          {!isCreate && <button type="button" disabled={isPast} onClick={onCancel}>Annulla appuntamento</button>}
          {!isCreate && onDelete && <button type="button" disabled={isPast} onClick={onDelete}>Elimina</button>}
        </form>
      </section>
    </div>
  );
}

export default AppointmentModal;
