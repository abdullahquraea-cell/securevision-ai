// ============================================================
//  SecureVision AI - Firebase Initialization
//  تُستخدَم لكل عمليات المصادقة: تسجيل الدخول / إنشاء حساب /
//  نسيان كلمة المرور / تأكيد البريد الإلكتروني.
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

// إعدادات Firebase المخصصة للمشروع
const firebaseConfig = {
  apiKey: "AIzaSyAThKtKVw-ZzKO8lNMsPOIq-1wdYU9qiyM",
  authDomain: "vision-ai-94a5a.firebaseapp.com",
  projectId: "vision-ai-94a5a",
  storageBucket: "vision-ai-94a5a.firebasestorage.app",
  messagingSenderId: "738750300359",
  appId: "1:738750300359:web:2f4669598fe2e7beca3ee2",
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تهيئة خدمة المصادقة (Auth)
export const auth = getAuth(app);

// الاحتفاظ بجلسة المستخدم بين إعادة تشغيل المتصفّح
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("تعذّر ضبط استمرارية جلسة Firebase:", err);
});

export default app;
