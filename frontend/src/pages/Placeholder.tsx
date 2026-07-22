function Placeholder({ title }: { title: string }) {
  return (
    <div className="panel" style={{ textAlign: "center", padding: "60px" }}>
      <h2 style={{ margin: "0 0 10px" }}>{title}</h2>
      <p style={{ color: "#64748b" }}>
        🚧 هذا القسم قيد التطوير — سنبنيه في المراحل القادمة
      </p>
    </div>
  );
}

export default Placeholder;