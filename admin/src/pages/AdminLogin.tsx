import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("⚠️ أدخل اسم المستخدم وكلمة السرّ");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);
      const res = await api.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const token = res.data.access_token;
      localStorage.setItem("admin_token", token);

      const me = await api.get("/auth/me");
      if (me.data.role !== "admin") {
        localStorage.removeItem("admin_token");
        setError("⛔ هذا الحساب ليس أدمن — الوصول مرفوض");
        setLoading(false);
        return;
      }

      localStorage.setItem("admin_user", JSON.stringify(me.data));
      navigate("/dashboard");
    } catch (e: any) {
      setError("⚠️ " + (e.response?.data?.detail || "فشل تسجيل الدخول"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "48px" }}>🛡️</div>
          <h1 style={{ fontSize: "22px", color: "#f8fafc", marginTop: "10px" }}>
            SecureVision Admin
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "5px" }}>
            لوحة تحكّم المدير — الوصول مقيّد
          </p>
        </div>

        <label style={{ display: "block", marginBottom: "15px" }}>
          <span style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>
            اسم المستخدم
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mohammed"
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
              outline: "none",
              fontSize: "15px",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#334155")}
          />
        </label>

        <label style={{ display: "block", marginBottom: "20px" }}>
          <span style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>
            كلمة السرّ
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
              outline: "none",
              fontSize: "15px",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#334155")}
          />
        </label>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "#7f1d1d33",
              border: "1px solid #dc2626",
              borderRadius: "8px",
              color: "#fca5a5",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            background: loading ? "#475569" : "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ جارٍ التحقّق..." : "🔐 دخول لوحة الأدمن"}
        </button>

        <div style={{ marginTop: "20px", textAlign: "center", color: "#64748b", fontSize: "11px" }}>
          كلّ محاولة دخول مسجّلة في سجلّ النظام
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;