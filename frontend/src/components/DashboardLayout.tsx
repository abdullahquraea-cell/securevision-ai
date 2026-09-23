import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged, getIdToken } from "firebase/auth";
import api from "../api/axios";
import { auth } from "../firebase";
import "../styles/dashboard.css";

// عناصر القائمة الجانبية + من يحق له رؤية كل عنصر
const menuItems = [
  { path: "/dashboard",       icon: "🏠", label: "لوحة التحكم",      roles: ["admin", "analyst", "viewer"] },
  { path: "/projects",        icon: "📁", label: "المشاريع",         roles: ["admin", "analyst", "viewer"] },
  { path: "/scans",           icon: "🛡️", label: "الفحص الأمني",     roles: ["admin", "analyst"] },
  { path: "code-scanner",     icon: "👨‍💻", label: "فحص الكود",       roles: ["admin", "analyst"] },
  { path: "/link-scanner",    icon: "🔗", label: "فاحص الروابط",     roles: ["admin", "analyst", "viewer"] },
  { path: "sqlmap-tester",    icon: "💉", label: "اختبار حقن SQL",   roles: ["admin", "analyst"] },
    { path: "app-scanner",      icon: "📱", label: "فحص التطبيقات",    roles: ["admin", "analyst"] },
  { path: "recon",            icon: "🔎", label: "بصمة الموقع",      roles: ["admin", "analyst"] },
  { path: "file-discovery",   icon: "🗂️", label: "كشف الملفات",      roles: ["admin", "analyst"] },
  { path: "subdomains",       icon: "🌐", label: "النطاقات الفرعية", roles: ["admin", "analyst"] },
  { path: "/vulnerabilities", icon: "🐞", label: "الثغرات",          roles: ["admin", "analyst", "viewer"] },
  { path: "/ai",              icon: "🤖", label: "الذكاء الاصطناعي", roles: ["admin", "analyst"] },
  { path: "/reports",         icon: "📄", label: "التقارير",         roles: ["admin", "analyst", "viewer"] },
  { path: "/users",           icon: "👥", label: "المستخدمون",       roles: ["admin"] },
  { path: "/activity",        icon: "📜", label: "سجل النشاط",       roles: ["admin"] },
  { path: "subscription",     icon: "💳", label: "الاشتراك",         roles: ["admin", "analyst", "viewer"] },
  { path: "/organization",    icon: "🏢", label: "المؤسسة والفريق",  roles: ["admin", "analyst"] },
    { path: "about",            icon: "ℹ️", label: "عن المنصّة",       roles: ["admin", "analyst", "viewer"] },
  { path: "/settings",        icon: "⚙️", label: "الإعدادات",        roles: ["admin"] },
];

// تنسيقات التجاوب مع الجوال (تُضاف تلقائياً)
const responsiveCss = `
.menu-toggle { display: none; }
@media (max-width: 768px) {
  .menu-toggle {
    display: inline-flex; align-items: center; justify-content: center;
    background: #3b82f6; color: #fff; border: none; border-radius: 8px;
    width: 42px; height: 38px; font-size: 20px; cursor: pointer;
    margin-inline-end: 10px;
  }
  .search-box { display: none !important; }
  .sidebar {
    position: fixed !important; top: 0; right: 0; bottom: 0;
    height: 100vh !important; width: 250px !important; overflow-y: auto;
    transform: translateX(100%); transition: transform .25s ease; z-index: 1000;
  }
  .sidebar.sidebar-open { transform: translateX(0); }
  .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 999; }
  .main { width: 100% !important; }
}
`;

function DashboardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // الاشتراك بحالة مصادقة Firebase — يضمن تحديث الـ token محلياً
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // لا يوجد مستخدم على Firebase — نحاول إعادة استخدام المخزّن
        const cached = localStorage.getItem("user");
        if (!cached) {
          navigate("/login");
          return;
        }
        try {
          setUser(JSON.parse(cached));
        } catch {
          navigate("/login");
        }
        return;
      }

      // تحديث الـ token قبل استدعاء أي API
      const token = await getIdToken(fbUser, true);
      localStorage.setItem("token", token);
      localStorage.setItem("firebase_uid", fbUser.uid);

      // محاولة جلب بيانات المستخدم من الباك-إند
      try {
        const response = await api.get("/auth/me");
        setUser(response.data);
      } catch {
        // فشل الـ backend — نعتمد على بيانات Firebase المحلية
        const username =
          fbUser.displayName ||
          (fbUser.email ? fbUser.email.split("@")[0] : "مستخدم");
        const payload = {
          access_token: token,
          token_type: "bearer",
          user_id: fbUser.uid,
          username,
          email: fbUser.email,
          role: "analyst",
          is_verified: fbUser.emailVerified,
        };
        localStorage.setItem("user", JSON.stringify(payload));
        setUser(payload);
      }
    });

    return () => unsub();
  }, [navigate]);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // تجاهل: نُكمّل التنظيف محلياً
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("firebase_uid");
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const allowedItems = menuItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="layout">
      <style>{responsiveCss}</style>

      {/* طبقة معتمة خلف القائمة على الجوال */}
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      {/* ===== القائمة الجانبية ===== */}
      <aside className={menuOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="sidebar-logo">🛡️ SecureVision AI</div>

        <nav className="menu">
          {allowedItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="logout-btn" onClick={logout}>
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </aside>

      {/* ===== المنطقة الرئيسية ===== */}
      <div className="main">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMenuOpen(true)}>☰</button>
          <input className="search-box" type="text" placeholder="🔍 بحث في النظام..." />
          <div className="topbar-user">
            <span>🔔</span>
            <span>👤 {user.username}</span>
            <span className="role-badge">{user.role}</span>
          </div>
        </header>

        <main className="content">
          <Outlet context={user} />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;