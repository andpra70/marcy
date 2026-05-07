import { useMemo, useState } from 'react';
import { calendarSlots, today } from '../appData.js';
import { findService, formatDay, formatMonthLabel, isPastDateTime, weekDays } from '../domain.js';

function CalendarGrid({
  appointments,
  clients,
  compact = false,
  currentClientId,
  googleEvents,
  googleToolbar,
  onAction,
  onAppointmentSelect,
  onPushGoogle,
  onSlotSelect,
  readOnly = false,
  userMode = false,
}) {
  const [anchorDate, setAnchorDate] = useState(today);
  const calendarDays = useMemo(() => weekDays(anchorDate), [anchorDate]);

  function moveMonth(delta) {
    setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, current.getDate()));
  }

  function moveWeek(delta) {
    setAnchorDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + delta * 7);
      return next;
    });
  }

  function moveYear(delta) {
    setAnchorDate((current) => new Date(current.getFullYear() + delta, current.getMonth(), 1));
  }

  return (
    <div className={compact ? 'calendar-shell compact-calendar' : 'calendar-shell'}>
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">Calendario</p>
          <h2>{formatMonthLabel(anchorDate)}</h2>
        </div>
        <div className="calendar-nav">
          <button type="button" onClick={() => moveYear(-1)}>&lt;&lt; Anno</button>
          <button type="button" onClick={() => moveMonth(-1)}>&lt; Mese</button>
          <button type="button" onClick={() => moveWeek(-1)}>Sett &lt;&lt;</button>
          <button type="button" onClick={() => setAnchorDate(today)}>Oggi</button>
          <button type="button" onClick={() => moveWeek(1)}>&gt;&gt; Sett</button>
          <button type="button" onClick={() => moveMonth(1)}>Mese &gt;</button>
          <button type="button" onClick={() => moveYear(1)}>Anno &gt;&gt;</button>
          {googleToolbar}
        </div>
      </div>
      <div className="calendar-scroll">
        <div className="calendar-grid" style={{ '--days': calendarDays.length }}>
          <div className="calendar-corner">Ora</div>
          {calendarDays.map((day) => (
            <div className="calendar-day" key={day}>{formatDay(day)}</div>
          ))}

          {calendarSlots.map((slot) => (
            <CalendarRow
              appointments={appointments}
              clients={clients}
              googleEvents={googleEvents}
              key={slot}
              onAction={onAction}
              onAppointmentSelect={onAppointmentSelect}
              onPushGoogle={onPushGoogle}
              onSlotSelect={onSlotSelect}
              currentClientId={currentClientId}
              readOnly={readOnly}
              slot={slot}
              userMode={userMode}
              calendarDays={calendarDays}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarRow({
  slot,
  appointments,
  clients,
  currentClientId,
  googleEvents,
  onAction,
  onAppointmentSelect,
  onPushGoogle,
  onSlotSelect,
  readOnly,
  userMode,
  calendarDays,
}) {
  return (
    <>
      <div className="calendar-time">{slot}</div>
      {calendarDays.map((day) => {
        const dayAppointments = appointments.filter((item) => item.date === day && item.time === slot);
        const dayGoogleEvents = googleEvents.filter((item) => item.date === day && item.time === slot);
        const isBusy = dayAppointments.length > 0 || dayGoogleEvents.length > 0;
        const currentClientAppointments = userMode
          ? dayAppointments.filter((appointment) => appointment.clientId === currentClientId)
          : dayAppointments;
        const otherClientAppointments = userMode
          ? dayAppointments.filter((appointment) => appointment.clientId !== currentClientId)
          : [];
        const isPastSlot = isPastDateTime(day, slot);
        const canSelectSlot = !isPastSlot && !isBusy && onSlotSelect;
        const slotClassName = [
          'calendar-slot',
          canSelectSlot ? 'selectable-slot' : '',
          isBusy ? 'busy' : '',
          isPastSlot ? 'past-slot' : '',
        ].filter(Boolean).join(' ');

        return (
          <div
            className={slotClassName}
            key={`${day}-${slot}`}
            onClick={() => canSelectSlot && onSlotSelect({ date: day, time: slot })}
            onKeyDown={(event) => {
              if (canSelectSlot && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                onSlotSelect({ date: day, time: slot });
              }
            }}
            role={canSelectSlot ? 'button' : undefined}
            tabIndex={canSelectSlot ? 0 : undefined}
          >
            {!isBusy && <span className="free-slot">Libero</span>}
            {otherClientAppointments.length > 0 && (
              <article className="slot-card occupied-slot">
                <strong>Slot occupato</strong>
                <small>Non disponibile</small>
              </article>
            )}
            {currentClientAppointments.map((appointment) => {
              const client = clients.find((item) => item.id === appointment.clientId);
              const service = findService(appointment.serviceId);
              const isPastAppointment = isPastDateTime(appointment.date, appointment.time);
              return (
                <article className={`slot-card ${appointmentStatusClass(appointment.status)}`} key={appointment.id}>
                  <button
                    className="slot-card-button"
                    disabled={isPastAppointment}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isPastAppointment) return;
                      onAppointmentSelect?.(appointment.id);
                    }}
                    title={isPastAppointment ? 'Appuntamento passato: modifiche non consentite' : 'Apri appuntamento'}
                    type="button"
                  >
                    <strong>{client?.surname} {client?.name}</strong>
                    <span>{service?.name}</span>
                    <small>{appointment.status}</small>
                  </button>
                  {!readOnly && (
                    <div className="slot-actions">
                      <button disabled={isPastAppointment} type="button" onClick={() => onAction(appointment.id, 'approve')}>Ok</button>
                      <button disabled={isPastAppointment} type="button" onClick={() => onPushGoogle(appointment.id)}>GCal</button>
                    </div>
                  )}
                </article>
              );
            })}
            {dayGoogleEvents.map((event) => (
              <article className="slot-card google-event" key={event.id}>
                <strong>{event.title}</strong>
                <small>Google Calendar</small>
              </article>
            ))}
          </div>
        );
      })}
    </>
  );
}

function appointmentStatusClass(status) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');
  return `appointment-status-${normalizedStatus}`;
}

export default CalendarGrid;
