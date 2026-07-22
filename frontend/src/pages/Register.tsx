import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [verifyLink, setVerifyLink] = useState("");

  const navigate = useNavigate();

  const register = async () => {
    if (!username || !email || !password) {
      setMessage("الرجاء تعبئة جميع الحقول");
      return;
    }

    try {
      const res = await api.post("/auth/register", {
        username: username,
        email: email,
        password: password,
      });

      setMessage("تم إنشاء الحساب! يرجى تأكيد بريدك الإلكتروني عبر الرابط أدناه.");
      setVerifyLink(res.data.verification_link || "");
    } catch (error: any) {
      if (error.response) {
        setMessage(error.response.data.detail || "فشل إنشاء الحساب");
      } else {
        setMessage("تعذّر الاتصال بالخادم");
      }
    }
  };

  return (
    <div
      style={{
        width: "360px",
        margin: "80px auto",
        padding: "30px",
        boxShadow: "0 0 15px #ccc",
        borderRadius: "10px",
        direction: "rtl",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center" }}>SecureVision AI</h2>
      <h3 style={{ textAlign: "center" }}>إنشاء حساب</h3>

      <input
        type="text"
        placeholder="اسم المستخدم"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", padding: "10px", margin: "10px 0", boxSizing: "border-box" }}
      />

      <input
        type="email"
        placeholder="البريد الإلكتروني"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "10px", margin: "10px 0", boxSizing: "border-box" }}
      />

      <input
        type="password"
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "10px", margin: "10px 0", boxSizing: "border-box" }}
      />

      <button
        onClick={register}
        style={{
          width: "100%",
          padding: "10px",
          cursor: "pointer",
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
        }}
      >
        إنشاء حساب
      </button>

      {message && (
        <p style={{ marginTop: 16, color: "#334155", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>
      )}

      {verifyLink && (
        <div
          style={{
            marginTop: 12,
            padding: "14px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "8px",
          }}
        >
          <p style={{ fontSize: 13, color: "#166534", marginBottom: 8 }}>
            🔗 رابط التفعيل (وضع التطوير):
          </p>
          <a
            href={verifyLink}
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "#10b981",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            تفعيل الحساب الآن ✅
          </a>
        </div>
      )}

      <p style={{ marginTop: 16, textAlign: "center" }}>
        لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
      </p>
    </div>
  );
}

export default Register;