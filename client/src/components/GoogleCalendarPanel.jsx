function GoogleCalendarPanel({ compact = false, ready, status, events, onConnect, onDisconnect, onSync }) {
  if (compact) {
    return (
      <div className="google-actions google-actions-inline" title={status}>
        <button type="button" disabled={!ready} onClick={onConnect}>Google</button>
        <button type="button" disabled={!ready} onClick={onSync}>Sync</button>
        <button type="button" disabled={!ready} onClick={onDisconnect}>Off</button>
        <span>{events.length}</span>
      </div>
    );
  }

  return (
    <section className="google-panel">
      <div>
        <p className="eyebrow">Google Calendar</p>
        <h2>Login e sincronizzazione</h2>
      </div>
      <p>{status}</p>
      <div className="google-actions">
        <button type="button" disabled={!ready} onClick={onConnect}>Login Google</button>
        <button type="button" disabled={!ready} onClick={onSync}>Sincronizza</button>
        <button type="button" disabled={!ready} onClick={onDisconnect}>Scollega</button>
      </div>
      <small>{events.length} eventi Google visibili nella griglia.</small>
    </section>
  );
}

export default GoogleCalendarPanel;
