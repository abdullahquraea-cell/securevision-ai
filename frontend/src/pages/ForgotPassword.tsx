import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const mapFirebaseError = (code: string): string => {
    switch (code) {
      case "auth/user-not-found":
        // لأسباب أمنية لا نكشف إن كان البريد موجوداً
        return "إن كان البريد مسجّلاً، فقد أُرسل رابط استعادة إلى بريدك.";
      case "auth/invalid-email":
        return "صيغة البريد غير صحيحة.";
      case "auth/network-request-failed":
        return "تعذّر الاتصال بالإنترنت.";
      default:
        return "حدث خطأ، حاول مجدداً.";
    }
  };

  const submit = async () => {
    if (!email) {
      setMessage("الرجاء إدخال البريد الإلكتروني");
      return;
    }
    setLoading(true);
    setMessage("");
    setSent(false);

    try {
      // تُرسل Firebase رابط الاستعادة مباشرة إلى البريد (الرابط يحوي oobCode)
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
      setMessage(
        "إن كان البريد مسجّلاً، فقد أُرسل رابط استعادة إلى بريدك. تحقق من صندوق الوارد والسبام."
      );
    } catch (e: any) {
      setMessage(mapFirebaseError(e?.code || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: 360,
        margin: "80px auto",
        padding: 30,
        boxShadow: "0 0 15px #ccc",
        borderRadius: 10,
        direction: "rtl",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center" }}>SecureVision AI</h2>
      <h3 style={{ textAlign: "center" }}>استعادة كلمة المرور 🔑</h3>
      <p style={{ color: "#64748b", fontSize: 14, textAlign: "center", lineHeight: 1.7 }}>
        أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة عبر Firebase.
      </p>

      <input
        type="email"
        placeholder="البريد الإلكتروني"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ width: "100%", padding: 10, margin: "10px 0", boxSizing: "border-box" }}
      />

      <button
        onClick={submit}
        disabled={loading}
        style={{
          width: "100%",
          padding: 10,
          cursor: loading ? "not-allowed" : "pointer",
          border: "none",
          borderRadius: 8,
          background: loading
            ? "#94a3b8"
            : "linear-gradient(135deg,#dc2626,#b91c1c)",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
      </button>

      {message && (
        <p
          style={{
            marginTop: 14,
            color: sent ? "#065f46" : "#991b1b",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {message}
        </p>
      )}

      <p style={{ marginTop: 16, textAlign: "center" }}>
        <Link to="/login">العودة لتسجيل الدخول</Link>
      </p>
    </div>
  );
}
