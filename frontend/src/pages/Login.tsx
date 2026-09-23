import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { auth } from "../firebase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ترجمة رموز أخطاء Firebase إلى رسائل عربية واضحة
  const mapFirebaseError = (code: string): string => {
    switch (code) {
      case "auth/invalid-email":
        return "صيغة البريد الإلكتروني غير صحيحة.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "البريد أو كلمة المرور غير صحيحة.";
      case "auth/user-disabled":
        return "تم تعطيل هذا الحساب. تواصل مع المسؤول.";
      case "auth/too-many-requests":
        return "محاولات كثيرة فاشلة. حاول لاحقاً.";
      case "auth/network-request-failed":
        return "تعذّر الاتصال بالإنترنت.";
      case "auth/unverified-email":
        return "يجب تأكيد بريدك الإلكتروني أولاً.";
      default:
        return "فشل تسجيل الدخول. حاول مجدداً.";
    }
  };

  // تخزين بيانات المستخدم محلياً لتغذية بقية صفحات التطبيق
  const persistUser = async (user: any) => {
    // محاولة الحصول على ID Token الأصلي من Firebase
    const token = await user.getIdToken(true);
    const username =
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "مستخدم");
    const payload = {
      access_token: token,
      token_type: "bearer",
      user_id: user.uid,
      username,
      email: user.email,
      role: "analyst", // قيمة افتراضية حتى يربط الحساب بخادم المنصة لاحقاً
      is_verified: user.emailVerified,
    };
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(payload));
    localStorage.setItem("firebase_uid", user.uid);
  };

  const login = async () => {
    if (!email || !password) {
      setMessage("الرجاء تعبئة جميع الحقول");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // التحقق إن كان البريد مُؤكَّداً (إن لم يكن كذلك نتيح الفرصة لإعادة الإرسال)
      if (!user.emailVerified) {
        setMessage(
          "يجب تأكيد بريدك الإلكتروني أولاً. اضغط الزر بالأسفل لإرسال رابط التفعيل."
        );
        setLoading(false);
        return;
      }

      await persistUser(user);
      navigate("/dashboard");
    } catch (error: any) {
      const code = error?.code || "";
      setMessage(mapFirebaseError(code));
    } finally {
      setLoading(false);
    }
  };

  // إعادة إرسال رابط تأكيد البريد إذا لم يكن الحساب مفعّلاً
  const resendVerification = async () => {
    try {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          setMessage("تم تأكيد بريدك ✅. يمكنك تسجيل الدخول الآن.");
          return;
        }
        await sendEmailVerification(auth.currentUser);
        setMessage("تم إرسال رابط التأكيد إلى بريدك.");
      }
    } catch (e: any) {
      setMessage("تعذّر إرسال رابط التأكيد: " + e.message);
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
        onKeyDown={(e) => e.key === "Enter" && login()}
        style={{ width: "100%", padding: "10px", margin: "10px 0", boxSizing: "border-box" }}
      />

      <button
        onClick={login}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          cursor: loading ? "not-allowed" : "pointer",
          border: "none",
          borderRadius: "8px",
          background: loading
            ? "#94a3b8"
            : "linear-gradient(135deg,#3b82f6,#6366f1)",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {loading ? "جارٍ الدخول..." : "دخول"}
      </button>

      {message && (
        <p style={{ marginTop: 12, color: "#991b1b", fontSize: 14, lineHeight: 1.6 }}>
          {message}
        </p>
      )}

      {/* زر إعادة إرسال رابط التأكيد في حال لم يكن البريد مؤكَّداً */}
      {message &&
        message.includes("تأكيد بريدك") && (
          <button
            onClick={resendVerification}
            style={{
              marginTop: 8,
              width: "100%",
              padding: 9,
              cursor: "pointer",
              border: "1px solid #3b82f6",
              borderRadius: 8,
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            إعادة إرسال رابط التأكيد
          </button>
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
