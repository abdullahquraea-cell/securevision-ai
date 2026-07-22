import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const login = async () => {
    if (!identifier || !password) {
      setMessage("الرجاء تعبئة جميع الحقول");
      return;
    }

    try {
      const response = await api.post(
        "/auth/login",
        new URLSearchParams({
          username: identifier,
          password: password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      // حفظ التوكن وبيانات المستخدم
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data));

      // الانتقال للوحة التحكم
      navigate("/dashboard");

    } catch (error: any) {
      if (error.response) {
        setMessage(error.response.data.detail || "فشل تسجيل الدخول");
      } else {
        setMessage("تعذّر الاتصال بالخادم");
      }
    }
  };

  return (
    <div
      style={{
        width: "350px",
        margin: "100px auto",
        padding: "30px",
        boxShadow: "0 0 15px #ccc",
        borderRadius: "10px",
        direction: "rtl",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center" }}>SecureVision AI</h2>
      <h3 style={{ textAlign: "center" }}>تسجيل الدخول</h3>

      <input
        type="text"
        placeholder="اسم المستخدم أو البريد الإلكتروني"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
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
        onClick={login}
        style={{
          width: "100%",
          padding: "10px",
          cursor: "pointer",
          border: "none",
          borderRadius: "8px",
          background: "linear-gradient(135deg,#3b82f6,#6366f1)",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        دخول
      </button>

      {message && (
        <p style={{ marginTop: 12, color: "#991b1b", fontSize: 14 }}>{message}</p>
      )}

      <p style={{ marginTop: 14, textAlign: "center" }}>
        <Link to="/forgot-password" style={{ color: "#dc2626", fontSize: 14 }}>
          نسيت كلمة المرور؟
        </Link>
      </p>

      <p style={{ textAlign: "center" }}>
        ليس لديك حساب؟ <Link to="/register">إنشاء حساب</Link>
      </p>
    </div>
  );
}

export default Login;