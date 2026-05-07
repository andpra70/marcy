function MasterDetailLayout({ detail, list }) {
  return (
    <section className="master-detail">
      <div className="panel">{list}</div>
      <div className="panel">{detail}</div>
    </section>
  );
}

export default MasterDetailLayout;
