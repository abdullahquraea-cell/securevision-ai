import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const mapFirebaseError = (code: string): string => {
    switch (code) {
      case "auth/email-already-in-use":
        return "البريد الإلكتروني مستخدَم بالفعل.";
      case "auth/invalid-email":
        return "صيغة البريد غير صحيحة.";
      case "auth/weak-password":
        return "كلمة المرور ضعيفة (6 أحرف على الأقل).";
      case "auth/network-request-failed":
        return "تعذّر الاتصال بالإنترنت.";
      default:
        return "فشل إنشاء الحساب. حاول مجدداً.";
    }
  };

  const register = async () => {
    setMessage("");

    if (!username || !email || !password) {
      setMessage("الرجاء تعبئة جميع الحقول");
      return;
    }
    if (password.length < 6) {
      setMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setMessage("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);

    try {
      // 1) إنشاء الحساب على Firebase
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2) حفظ اسم المستخدم في ملف Firebase الشخصي
      await updateProfile(user, { displayName: username });

      // 3) إرسال بريد التأكيد
      await sendEmailVerification(user);

      setSuccess(true);
      setMessage(
        "تم إنشاء الحساب بنجاح! أرسلنا رابط تأكيد إلى بريدك الإلكتروني. اضغط عليه ثم عد لتسجيل الدخول."
      );
    } catch (error: any) {
      const code = error?.code || "";
      setMessage(mapFirebaseError(code));
    } finally {
      setLoading(false);
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

      <input
        type="password"
        placeholder="تأكيد كلمة المرور"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && register()}
        style={{ width: "100%", padding: "10px", margin: "10px 0", boxSizing: "border-box" }}
      />

      <button
        onClick={register}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          cursor: loading ? "not-allowed" : "pointer",
          background: loading
            ? "#94a3b8"
            : "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
        }}
      >
        {loading ? "جارٍ الإنشاء..." : "إنشاء حساب"}
      </button>

      {message && (
        <p
          style={{
            marginTop: 16,
            color: success ? "#065f46" : "#991b1b",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {message}
        </p>
      )}

      {success && (
        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 10,
            cursor: "pointer",
            border: "1px solid #10b981",
            borderRadius: 8,
            background: "#ecfdf5",
            color: "#065f46",
            fontWeight: 600,
          }}
        >
          الذهاب لتسجيل الدخول
        </button>
      )}

      <p style={{ marginTop: 16, textAlign: "center" }}>
        لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
      </p>
    </div>
  );
}

export default Register;
