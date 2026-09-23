import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  applyActionCode,
  reload,
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase";

export default function Verify() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Firebase يستخدم query params: ?mode=verifyEmail&oobCode=XXX
  const oobCode = searchParams.get("oobCode") || token || "";
  const mode = searchParams.get("mode");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("جارٍ تأكيد بريدك الإلكتروني...");

  useEffect(() => {
    let active = true;

    // وضع Firebase: نستخدم applyActionCode
    if (mode === "verifyEmail" || (!token && oobCode)) {
      applyActionCode(auth, oobCode)
        .then(async () => {
          if (!active) return;
          // إعادة تحميل بيانات المستخدم للحصول على علامة emailVerified محدّثة
          const user = getAuth().currentUser;
          if (user) {
            try {
              await reload(user);
            } catch {
              // تجاهل: التأكيد نجح بالفعل
            }
          }
          setStatus("success");
          setMessage("تم تأكيد بريدك بنجاح ✅");
          setTimeout(() => navigate("/login"), 3000);
        })
        .catch((err) => {
          if (!active) return;
          setStatus("error");
          const code = err?.code || "";
          let msg = "رابط تفعيل غير صالح أو مستخدَم مسبقاً.";
          if (code === "auth/expired-action-code") msg = "انتهت صلاحية رابط التفعيل.";
          else if (code === "auth/invalid-action-code") msg = "رابط التفعيل غير صالح.";
          setMessage(msg);
        });
    } else if (token) {
      // الوضع القديم (إن بقي من الباك-إند السابق) — لا يزال موجوداً للتوافق
      setStatus("error");
      setMessage("رابط تفعيل غير صالح أو مستخدَم مسبقاً.");
    } else {
      setStatus("error");
      setMessage("رابط تفعيل غير صالح أو مستخدَم مسبقاً.");
    }

    return () => {
      active = false;
    };
  }, [oobCode, mode, token, navigate]);

  const colors = {
    loading: "#3b82f6",
    success: "#10b981",
    error: "#ef4444",
  };
  const icons = { loading: "⏳", success: "✅", error: "❌" };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        direction: "rtl",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "48px 40px",
          maxWidth: 440,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>{icons[status]}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors[status], marginBottom: 12 }}>
          {status === "loading" && "لحظة من فضلك"}
          {status === "success" && "تم التأكيد!"}
          {status === "error" && "تعذّر التأكيد"}
        </h1>
        <p style={{ color: "#475569", fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
          {message}
        </p>
        {status === "success" && (
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            سيتم تحويلك لصفحة الدخول خلال ثوانٍ...
          </p>
        )}
        {status !== "loading" && (
          <Link
            to="/login"
            style={{
              display: "inline-block",
              marginTop: 8,
              padding: "12px 28px",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            الذهاب لتسجيل الدخول
          </Link>
        )}
      </div>
    </div>
  );
}
