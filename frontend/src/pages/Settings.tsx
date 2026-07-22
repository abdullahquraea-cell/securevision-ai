import { useEffect, useState } from "react";
import api from "../api/axios";

const roleLabels: Record<string, string> = {
  admin: "مدير",
  analyst: "محلل أمني",
  viewer: "مشاهد",
};

function Settings() {
  const [me, setMe] = useState<any>(null);

  // حقول تغيير كلمة المرور
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings/me").then((res) => setMe(res.data)).catch(() => {});
  }, []);

  const changePassword = async () => {
    setMessage("");

    if (!currentPassword || !newPassword) {
      setMessage("⚠️ املأ جميع الحقول");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("⚠️ كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    setSaving(true);
    try {
      await api.put("/settings/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage("✅ تم تغيير كلمة المرور بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setMessage("⚠️ " + (error.response?.data?.detail || "فشل التغيير"));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontFamily: "inherit",
    marginTop: "5px",
  };

  const labelStyle = { color: "#334155", fontSize: "14px", marginTop: "12px", display: "block" };

  return (
    <div>
      <h2 className="page-title">⚙️ الإعدادات</h2>

      {/* معلومات الحساب */}
      <div className="panel">
        <h3>👤 معلومات الحساب</h3>
        {me ? (
          <table className="data-table">
            <tbody>
              <tr>
                <td style={{ color: "#64748b", width: "180px" }}>اسم المستخدم</td>
                <td>{me.username}</td>
              </tr>
              <tr>
                <td style={{ color: "#64748b" }}>البريد الإلكتروني</td>
                <td style={{ direction: "ltr", textAlign: "right" }}>{me.email}</td>
              </tr>
              <tr>
                <td style={{ color: "#64748b" }}>الصلاحية</td>
                <td>
                  <span className="status-badge status-done">
                    {roleLabels[me.role] || me.role}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ color: "#64748b" }}>الحالة</td>
                <td>{me.is_active ? "🟢 نشط" : "🔴 معطّل"}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#64748b" }}>جارٍ التحميل...</p>
        )}
      </div>

      {/* تغيير كلمة المرور */}
      <div className="panel">
        <h3>🔒 تغيير كلمة المرور</h3>

        <div style={{ maxWidth: "400px" }}>
          <label style={labelStyle}>كلمة المرور الحالية</label>
          <input
            type="password"
            style={inputStyle}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <label style={labelStyle}>كلمة المرور الجديدة</label>
          <input
            type="password"
            style={inputStyle}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <label style={labelStyle}>تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            style={inputStyle}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            onClick={changePassword}
            disabled={saving}
            style={{
              marginTop: "18px",
              padding: "10px 30px",
              background: saving ? "#94a3b8" : "#1d4ed8",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>

          {message && (
            <p style={{ marginTop: "15px", color: "#334155" }}>{message}</p>
          )}
        </div>
      </div>

      {/* معلومات النظام */}
      <div className="panel">
        <h3>ℹ️ معلومات النظام</h3>
        <table className="data-table">
          <tbody>
            <tr>
              <td style={{ color: "#64748b", width: "180px" }}>المنصة</td>
              <td>SecureVision AI</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b" }}>الإصدار</td>
              <td>0.4.0</td>
            </tr>
            <tr>
              <td style={{ color: "#64748b" }}>محرك الذكاء الاصطناعي</td>
              <td>Claude AI (Anthropic)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Settings;