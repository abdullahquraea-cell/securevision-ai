import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password.length < 6) { setMessage("كلمة المرور 6 أحرف على الأقل"); return; }
    if (password !== confirm) { setMessage("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true);
    setMessage("");
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      setMessage("✅ تم تعيين كلمة مرور جديدة بنجاح. سيتم تحويلك لتسجيل الدخول...");
      setTimeout(() => navigate("/login"), 2500);
    } catch (e: any) {
      setMessage("⚠️ " + (e.response?.data?.detail || "تعذّر تعيين كلمة المرور"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: 360, margin: "80px auto", padding: 30, boxShadow: "0 0 15px #ccc",
      borderRadius: 10, direction: "rtl", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ textAlign: "center" }}>SecureVision AI</h2>
      <h3 style={{ textAlign: "center" }}>تعيين كلمة مرور جديدة</h3>

      {!done && (
        <>
          <input
            type="password"
            placeholder="كلمة المرور الجديدة"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, margin: "10px 0", boxSizing: "border-box" }}
          />
          <input
            type="password"
            placeholder="تأكيد كلمة المرور"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ width: "100%", padding: 10, margin: "10px 0", boxSizing: "border-box" }}
          />
          <button
            onClick={submit}
            disabled={loading}
            style={{ width: "100%", padding: 10, cursor: "pointer", border: "none", borderRadius: 8,
              background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", fontWeight: 600 }}
          >
            {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>
        </>
      )}

      {message && (
        <p style={{ marginTop: 14, color: done ? "#065f46" : "#334155", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>
      )}

      <p style={{ marginTop: 16, textAlign: "center" }}>
        <Link to="/login">العودة لتسجيل الدخول</Link>
      </p>
    </div>
  );
}