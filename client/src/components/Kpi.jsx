function Kpi({ label, value, detail }) {
  return (
    <section className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}

export default Kpi;
