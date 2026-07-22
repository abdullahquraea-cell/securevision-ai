import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email) { setMessage("الرجاء إدخال البريد الإلكتروني"); return; }
    setLoading(true);
    setMessage("");
    setResetLink("");
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "تم إرسال الرابط.");
      setResetLink(res.data.reset_link || "");
    } catch {
      setMessage("حدث خطأ، حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: 360, margin: "80px auto", padding: 30, boxShadow: "0 0 15px #ccc",
      borderRadius: 10, direction: "rtl", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ textAlign: "center" }}>SecureVision AI</h2>
      <h3 style={{ textAlign: "center" }}>استعادة كلمة المرور 🔑</h3>
      <p style={{ color: "#64748b", fontSize: 14, textAlign: "center" }}>
        أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.
      </p>

      <input
        type="email"
        placeholder="البريد الإلكتروني"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "10px 0", boxSizing: "border-box" }}
      />

      <button
        onClick={submit}
        disabled={loading}
        style={{ width: "100%", padding: 10, cursor: "pointer", border: "none", borderRadius: 8,
          background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", fontWeight: 600 }}
      >
        {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
      </button>

      {message && (
        <p style={{ marginTop: 14, color: "#334155", fontSize: 14, lineHeight: 1.6 }}>{message}</p>
      )}

      {resetLink && (
        <div style={{ marginTop: 12, padding: 14, background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: "#991b1b", marginBottom: 8 }}>
            🔗 رابط الاستعادة (وضع التطوير):
          </p>
          <a href={resetLink} style={{ display: "inline-block", padding: "8px 16px",
            background: "#dc2626", color: "#fff", borderRadius: 6, textDecoration: "none",
            fontSize: 13, fontWeight: 600 }}>
            تعيين كلمة مرور جديدة
          </a>
        </div>
      )}

      <p style={{ marginTop: 16, textAlign: "center" }}>
        <Link to="/login">العودة لتسجيل الدخول</Link>
      </p>
    </div>
  );
}