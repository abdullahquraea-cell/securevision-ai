import { useState } from "react";
import { useNavigate, Link, useSearchParams, useParams } from "react-router-dom";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "../firebase";

export default function ResetPassword() {
  // يدعم Firebase وضعين: الرابط قد يأتي بمسار مثل /reset-password?oobCode=XXX
  // أو من النظام السابق /reset-password/:token
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();

  const oobCode = searchParams.get("oobCode") || token || "";

  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validCode, setValidCode] = useState<boolean | null>(null);

  // التحقق من صلاحية الرمز عند تحميل الصفحة
  useState(() => {
    if (!oobCode) {
      setValidCode(false);
      setMessage("⚠️ الرابط غير صالح: لا يحوي رمز الاستعادة (oobCode).");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then(() => setValidCode(true))
      .catch(() => {
        setValidCode(false);
        setMessage("⚠️ رمز الاستعادة غير صالح أو منتهي الصلاحية.");
      });
  });

  const submit = async () => {
    if (password.length < 6) {
      setMessage("كلمة المرور 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setMessage("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      // تعيين كلمة المرور الجديدة على Firebase
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
      setMessage("✅ تم تعيين كلمة مرور جديدة بنجاح. سيتم تحويلك لتسجيل الدخول...");
      setTimeout(() => navigate("/login"), 2500);
    } catch (e: any) {
      const code = e?.code || "";
      let msg = "تعذّر تعيين كلمة المرور.";
      if (code === "auth/weak-password") msg = "كلمة المرور ضعيفة.";
      else if (code === "auth/invalid-action-code") msg = "رمز الاستعادة غير صالح.";
      else if (code === "auth/expired-action-code") msg = "انتهت صلاحية رمز الاستعادة.";
      setMessage("⚠️ " + msg);
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
      <h3 style={{ textAlign: "center" }}>تعيين كلمة مرور جديدة</h3>

      {!done && validCode !== false && (
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
              background: loading ? "#94a3b8" : "linear-gradient(135deg,#3b82f6,#6366f1)",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>
        </>
      )}

      {validCode === false && !done && (
        <p style={{ marginTop: 14, color: "#991b1b", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>
      )}

      {done && (
        <p style={{ marginTop: 14, color: "#065f46", fontSize: 14, lineHeight: 1.7 }}>
          {message}
        </p>
      )}

      {!done && validCode !== false && message && (
        <p style={{ marginTop: 14, color: "#334155", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>
      )}

      <p style={{ marginTop: 16, textAlign: "center" }}>
        <Link to="/login">العودة لتسجيل الدخول</Link>
      </p>
    </div>
  );
}
