function Metric({ title, value, extra }) {
  return (
    <div className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
      {extra && <small>{extra}</small>}
    </div>
  );
}

export default Metric;
