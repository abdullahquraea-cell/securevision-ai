import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/dashboard.css";

// عناصر القائمة الجانبية + من يحق له رؤية كل عنصر
const menuItems = [
  { path: "/dashboard",       icon: "🏠", label: "لوحة التحكم",      roles: ["admin", "analyst", "viewer"] },
  { path: "/projects",        icon: "📁", label: "المشاريع",         roles: ["admin", "analyst", "viewer"] },
  { path: "/scans",           icon: "🛡️", label: "الفحص الأمني",     roles: ["admin", "analyst"] },
  { path: "code-scanner", label: "فحص الكود", icon: "👨‍💻", roles: ["admin", "analyst"] },
    { path: "/link-scanner",    icon: "🔗", label: "فاحص الروابط",     roles: ["admin", "analyst", "viewer"] },
      { path: "/image-scanner",   icon: "🖼️", label: "فاحص الصور",      roles: ["admin", "analyst", "viewer"] },
        { path: "/video-scanner",   icon: "🎬", label: "فاحص الفيديو",    roles: ["admin", "analyst", "viewer"] },
        { path: "sqlmap-tester", label: "اختبار حقن SQL", icon: "💉", roles: ["admin", "analyst"] },
        { path: "recon", label: "بصمة الموقع", icon: "🔎", roles: ["admin", "analyst"] },
        { path: "file-discovery", label: "كشف الملفات", icon: "🗂️", roles: ["admin", "analyst"] },
        { path: "subdomains", label: "النطاقات الفرعية", icon: "🌐", roles: ["admin", "analyst"] },
        { path: "/message-scanner", icon: "💬", label: "فاحص الرسائل",    roles: ["admin", "analyst", "viewer"] },
  { path: "/vulnerabilities", icon: "🐞", label: "الثغرات",          roles: ["admin", "analyst", "viewer"] },
  { path: "/ai",              icon: "🤖", label: "الذكاء الاصطناعي", roles: ["admin", "analyst"] },
  { path: "/reports",         icon: "📄", label: "التقارير",         roles: ["admin", "analyst", "viewer"] },
  { path: "/users",           icon: "👥", label: "المستخدمون",       roles: ["admin"] },
  { path: "/activity",        icon: "📜", label: "سجل النشاط",       roles: ["admin"] },
  { path: "subscription", label: "الاشتراك", icon: "💳", roles: ["admin", "analyst", "viewer"] },
  { path: "/organization", label: "المؤسسة والفريق", icon: "🏢", roles: ["admin", "analyst"] },
  { path: "/settings",        icon: "⚙️", label: "الإعدادات",        roles: ["admin"] },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    // التحقق الحقيقي من التوكن عبر السيرفر
    api
      .get("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return null; // بانتظار التحقق من التوكن
  }

  // فلترة القائمة حسب صلاحية المستخدم
  const allowedItems = menuItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <div className="layout">

      {/* ===== القائمة الجانبية ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">🛡️ SecureVision AI</div>

        <nav className="menu">
          {allowedItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "menu-item active" : "menu-item"
              }
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

        {/* الشريط العلوي */}
        <header className="topbar">
          <input
            className="search-box"
            type="text"
            placeholder="🔍 بحث في النظام..."
          />

          <div className="topbar-user">
            <span>🔔</span>
            <span>👤 {user.username}</span>
            <span className="role-badge">{user.role}</span>
          </div>
        </header>

        {/* محتوى الصفحة الحالية */}
        <main className="content">
          <Outlet context={user} />
        </main>

      </div>
    </div>
  );
}

export default DashboardLayout;