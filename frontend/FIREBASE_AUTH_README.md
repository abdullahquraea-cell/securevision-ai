# SecureVision AI — دليل دمج Firebase Authentication

تم تعديل الواجهة الأمامية (frontend) لاستخدام **Firebase Authentication** في عمليات:
- تسجيل الدخول
- إنشاء حساب جديد
- نسيان كلمة المرور (إرسال رابط الاستعادة)
- تعيين كلمة مرور جديدة (عبر رابط Firebase)
- تأكيد البريد الإلكتروني (Firebase Email Verification)

---

## 1) الملفات المعدّلة

| الملف | الغرض |
|------|------|
| `frontend/src/firebase.ts` | تهيئة Firebase (إعدادات المشروع + Auth) — **ملف جديد** |
| `frontend/package.json` | إضافة الحزمة `firebase` |
| `frontend/src/pages/Login.tsx` | `signInWithEmailAndPassword` + التحقق من `emailVerified` + إعادة إرسال رابط التأكيد |
| `frontend/src/pages/Register.tsx` | `createUserWithEmailAndPassword` + `updateProfile` + `sendEmailVerification` |
| `frontend/src/pages/ForgotPassword.tsx` | `sendPasswordResetEmail` |
| `frontend/src/pages/ResetPassword.tsx` | `verifyPasswordResetCode` + `confirmPasswordReset` (يقرأ `oobCode` من URL) |
| `frontend/src/pages/Verify.tsx` | `applyActionCode` (لتفعيل البريد عبر Firebase) |
| `frontend/src/components/DashboardLayout.tsx` | `onAuthStateChanged` + `getIdToken` (تحديث الـ token لكل API) + `signOut` عند الخروج |
| `frontend/src/App.tsx` | إضافة مسارات `/reset-password` و `/verify` بدون token لدعم روابط Firebase |

> لم يُعدّل أي ملف في `backend/` — يمكنك متابعة استخدام الباك-إند الأصلي أو إيقافه مؤقتاً؛ الواجهة ستعمل بالكامل مع Firebase.

---

## 2) تثبيت الحزم

```bash
cd frontend
npm install
```

سيقوم npm بتنزيل حزمة `firebase` تلقائياً (مذكورة في `package.json`).

---

## 3) تشغيل الواجهة

```bash
npm run dev
```

افتح المتصفح على: <http://localhost:5173>

---

## 4) إعداد Firebase Console (مطلوب لمرة واحدة)

1. ادخل إلى: <https://console.firebase.google.com/project/vision-ai-94a5a>
2. **Authentication → Sign-in method**: فعّل **Email/Password**.
3. **Authentication → Settings → Authorized domains**: أضف نطاقاتك (مثل `localhost`, `vision-ai-94a5a.firebaseapp.com`, نطاق الإنتاج).
4. **Authentication → Templates**:
   - **Password reset**: عدّل القالب وحدد `Action URL` للرابط:
     `https://your-frontend-domain/reset-password` (سيُضيف Firebase `?oobCode=...` تلقائياً).
   - **Email verification**: عدّل القالب وحدد `Action URL` للرابط:
     `https://your-frontend-domain/verify` (سيُضيف Firebase `?mode=verifyEmail&oobCode=...` تلقائياً).
5. (اختياري) **Authentication → Settings → User actions**: فعّل "Prevent account enumeration attacks" لمزيد من الأمان.

---

## 5) كيف تتم العملية الآن؟

### إنشاء حساب
1. المستخدم يدخل: username, email, password, confirm.
2. `createUserWithEmailAndPassword` يُنشئ الحساب على Firebase.
3. `updateProfile` يضبط `displayName` باسم المستخدم.
4. `sendEmailVerification` يرسل بريد التأكيد.
5. تظهر رسالة للمستخدم بضرورة تأكيد البريد قبل تسجيل الدخول.

### تسجيل الدخول
1. `signInWithEmailAndPassword`.
2. إن لم يكن البريد مُؤكَّداً (`emailVerified === false`) تظهر رسالة + زر إعادة إرسال رابط التأكيد.
3. عند النجاح يُحفظ `token` (Firebase ID Token) و `user` في `localStorage` ثم يُنقل المستخدم إلى `/dashboard`.

### نسيان كلمة المرور
1. `sendPasswordResetEmail` — Firebase يرسل بريداً يحوي رابطاً بصيغة:
   `https://your-frontend-domain/reset-password?oobCode=XXX&...`
2. الصفحة `ResetPassword` تقرأ `oobCode` من URL، تتحقق منه عبر `verifyPasswordResetCode`، ثم تستدعي `confirmPasswordReset` لتعيين كلمة المرور الجديدة.

### تأكيد البريد
- عند الضغط على رابط التأكيد، ينقل المستخدم إلى `/verify?mode=verifyEmail&oobCode=XXX`.
- `Verify.tsx` يستدعي `applyActionCode(auth, oobCode)`.

---

## 6) التكامل مع الباك-إند (اختياري)

لتأكيد هوية المستخدم على الـ backend:

```python
# في الباك-إند: استخدم firebase-admin للتحقق من الـ token
from firebase_admin import auth as fb_auth

def verify_firebase_token(id_token: str):
    decoded = fb_auth.verify_id_token(id_token)
    return decoded  # يحوي: uid, email, email_verified, ...
```

ثم في `axios.ts` تُرسل الـ `token` تلقائياً عبر:
```
Authorization: Bearer <firebase-id-token>
```

> الواجهة معدّة سابقاً لذلك: يتم تحديث `localStorage.token` بـ Firebase ID Token عند كل تسجيل دخول/إعادة تحميل.

---

## 7) ملاحظات أمان

- لا تكشف الواجهة عن وجود بريد مسجَّل (رسالة محايدة عند نسيان كلمة المرور).
- Firebase ID Token تنتهي صلاحيته بعد ساعة — يتم تجديده تلقائياً عبر `onAuthStateChanged` في `DashboardLayout`.
- لإيقاف جلسة المستخدم تماماً عند تسجيل الخروج، يستدعي `signOut(auth)` من Firebase.

---

## 8) استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `auth/unauthorized-domain` | أضف نطاقك إلى Authorized domains في Firebase Console. |
| `auth/email-already-in-use` | البريد مسجّل مسبقاً — استخدم نسيان كلمة المرور. |
| لا يصلك بريد التأكيد | تحقق من تبويب السبام / Firestore → Authentication → Users لمعرفة إن كان الحساب أُنشئ. |
| صفحة `/verify` تُظهر "غير صالح" | تأكد من ضبط `Action URL` في قالب Firebase إلى نفس نطاق الواجهة. |
| `400 apikey-not-valid` | راجع أن `firebaseConfig` في `src/firebase.ts` يطابق ما في Firebase Console. |

---

تم إعداد التكامل بعناية ليبقى متوافقاً مع بقية أجزاء المنصة (Routing, axios, localStorage) دون كسر أي ميزة قائمة.
