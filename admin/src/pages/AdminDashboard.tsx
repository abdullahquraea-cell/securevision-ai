import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/login");
      return;
    }
    api.get("/auth/me")
      .then((r) => {
        if (r.data.role !== "admin") {
          localStorage.removeItem("admin_token");
          navigate("/login");
          return;
        }
        setUser(r.data);
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        navigate("/login");
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      {/* الشريط العلوي */}
      <div
        style={{
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "16px" }}>
              SecureVision Admin
            </div>
            <div style={{ color: "#94a3b8", fontSize: "11px" }}>لوحة تحكّم المدير</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>👤 {user.username}</span>
          <button
            onClick={logout}
            style={{
              padding: "6px 14px",
              background: "#7f1d1d33",
              border: "1px solid #dc2626",
              color: "#fca5a5",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            🚪 خروج
          </button>
        </div>
      </div>

      {/* المحتوى */}
      <div style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ color: "#f8fafc", fontSize: "28px", marginBottom: "10px" }}>
          🎯 مرحباً بك في لوحة الأدمن
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "15px", marginBottom: "30px" }}>
          البنية الأساسية شغّالة. سنبني الميزات الفعلية في المراحل القادمة.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            { icon: "👥", label: "إدارة المستخدمين", note: "قيد التطوير" },
            { icon: "🏢", label: "المنظّمات", note: "قيد التطوير" },
            { icon: "💳", label: "الاشتراكات", note: "قيد التطوير" },
            { icon: "🔍", label: "الفحوص", note: "قيد التطوير" },
            { icon: "📊", label: "الإحصائيات", note: "قيد التطوير" },
            { icon: "📜", label: "سجلّ النشاط", note: "قيد التطوير" },
            { icon: "⚙️", label: "إعدادات النظام", note: "قيد التطوير" },
            { icon: "📢", label: "الإعلانات", note: "قيد التطوير" },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>{c.icon}</div>
              <div style={{ color: "#f8fafc", fontWeight: 600, marginBottom: "4px" }}>
                {c.label}
              </div>
              <div style={{ color: "#64748b", fontSize: "12px" }}>{c.note}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "40px",
            padding: "20px",
            background: "#1e293b",
            border: "1px dashed #3b82f6",
            borderRadius: "12px",
            color: "#94a3b8",
          }}
        >
          ✅ <b style={{ color: "#3b82f6" }}>المرحلة 1 مكتملة:</b> البنية الأساسية + تسجيل الدخول + الحماية.
          <br />
          🚀 المرحلة القادمة: إحصائيات المنصّة الحقيقية.
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;