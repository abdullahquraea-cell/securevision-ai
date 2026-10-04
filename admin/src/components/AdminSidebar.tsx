import { NavLink, useNavigate } from "react-router-dom";

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: "/dashboard", label: "لوحة التحكّم", icon: "📊" },
  { path: "/users", label: "المستخدمون", icon: "👥" },
  { path: "/organizations", label: "المنظّمات", icon: "🏢" },
  { path: "/subscriptions", label: "الاشتراكات والإيرادات", icon: "💳" },
  { path: "/activity", label: "سجلّ النشاط", icon: "📜" },
  { path: "/scans", label: "الفحوصات الأمنيّة", icon: "🔍" },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/login");
  };

  return (
    <aside style={styles.sidebar}>
      {/* الشعار */}
      <div style={styles.logoBox}>
        <div style={styles.logoIcon}>🛡️</div>
        <div>
          <div style={styles.logoTitle}>SecureVision AI</div>
          <div style={styles.logoSubtitle}>لوحة الإدارة</div>
        </div>
      </div>

      {/* الفاصل */}
      <div style={styles.divider} />

      {/* القائمة */}
      <nav style={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* زرّ الخروج */}
      <div style={styles.bottomBox}>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 280,
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    color: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    right: 0,
    top: 0,
    boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
    zIndex: 100,
  },
  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "24px 20px",
  },
  logoIcon: {
    fontSize: 36,
    width: 50,
    height: 50,
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.08)",
    margin: "0 20px",
  },
  nav: {
    flex: 1,
    padding: "20px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 10,
    color: "#cbd5e1",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 500,
    transition: "all 0.2s",
  },
  navLinkActive: {
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
  },
  navIcon: {
    fontSize: 20,
  },
  bottomBox: {
    padding: 16,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "12px",
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};