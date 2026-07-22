import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function SubscriptionSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("جارٍ تأكيد الدفع...");

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setStatus("error");
      setMsg("معرّف الجلسة مفقود");
      return;
    }
    api
      .post("/subscription/confirm", { session_id: sessionId })
      .then((res) => {
        setStatus("success");
        setMsg(res.data.message || "تمت الترقية بنجاح ✅");
        setTimeout(() => navigate("/subscription"), 3500);
      })
      .catch((e) => {
        setStatus("error");
        setMsg(e.response?.data?.detail || "تعذّر تأكيد الدفع");
      });
  }, [params, navigate]);

  const c = { loading: "#3b82f6", success: "#10b981", error: "#ef4444" }[status];
  const icon = { loading: "⏳", success: "🎉", error: "❌" }[status];

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px" }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "48px 40px", maxWidth: 460,
        width: "100%", textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
      }}>
        <div style={{ fontSize: 60, marginBottom: 14 }}>{icon}</div>
        <h1 style={{ fontSize: 24, color: c, marginBottom: 12 }}>
          {status === "loading" && "لحظة..."}
          {status === "success" && "تم الدفع بنجاح!"}
          {status === "error" && "حدثت مشكلة"}
        </h1>
        <p style={{ color: "#475569", fontSize: 16, lineHeight: 1.7 }}>{msg}</p>
        {status === "success" && (
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 14 }}>
            سيتم تحويلك لصفحة الاشتراك...
          </p>
        )}
        <button
          onClick={() => navigate("/subscription")}
          style={{
            marginTop: 22, padding: "12px 28px", border: "none", borderRadius: 10,
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
            fontWeight: 700, cursor: "pointer",
          }}
        >
          العودة للاشتراك
        </button>
      </div>
    </div>
  );
}