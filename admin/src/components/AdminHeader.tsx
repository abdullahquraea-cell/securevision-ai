interface Props {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: Props) {
  const adminEmail = localStorage.getItem("admin_email") || "admin@securevision.ai";

  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      <div style={styles.right}>
        <div style={styles.adminBadge}>
          <div style={styles.avatar}>👤</div>
          <div>
            <div style={styles.adminLabel}>مدير النظام</div>
            <div style={styles.adminEmail}>{adminEmail}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 32px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  adminBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 16px",
    background: "#f8fafc",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
  },
  avatar: {
    width: 40,
    height: 40,
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    color: "#fff",
  },
  adminLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#0f172a",
  },
  adminEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
};