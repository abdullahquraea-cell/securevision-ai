import os
import ssl
import smtplib
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

_ENV_CACHE = None


def _load_env() -> dict:
    global _ENV_CACHE
    if _ENV_CACHE is not None:
        return _ENV_CACHE
    cfg = {}
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    _ENV_CACHE = cfg
    return cfg


def _get(key: str, default: str = "") -> str:
    return os.getenv(key) or _load_env().get(key, default)


def email_enabled() -> bool:
    return _get("EMAIL_ENABLED", "false").lower() == "true"


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """يرسل بريداً. يعيد True عند النجاح، False إن كان معطّلاً أو فشل."""
    if not email_enabled():
        return False

    host = _get("SMTP_HOST", "smtp.gmail.com")
    port = int(_get("SMTP_PORT", "587") or 587)
    user = _get("SMTP_USER")
    password = _get("SMTP_PASSWORD")
    sender = _get("SMTP_FROM") or user

    if not user or not password:
        print("[EMAIL] بيانات SMTP ناقصة")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.starttls(context=context)
            server.login(user, password)
            server.sendmail(sender, [to_email], msg.as_string())
        print(f"[EMAIL] تم الإرسال إلى {to_email} ✅")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_verification_email(to_email: str, link: str) -> bool:
    subject = "تأكيد بريدك الإلكتروني - SecureVision AI"
    html = f"""
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;
                border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;direction:rtl">
      <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">SecureVision AI</h1>
        <p style="color:#e0e7ff;margin:6px 0 0;font-size:14px">منصة إدارة الثغرات الأمنية</p>
      </div>
      <div style="padding:32px;text-align:center">
        <h2 style="color:#1e293b;font-size:20px">مرحباً بك 👋</h2>
        <p style="color:#475569;line-height:1.8">
          شكراً لتسجيلك. اضغط الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.
        </p>
        <a href="{link}" style="display:inline-block;margin-top:18px;padding:14px 36px;
           background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;
           border-radius:10px;font-weight:700;font-size:15px">تأكيد البريد ✅</a>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px">
          إن لم يعمل الزر، انسخ هذا الرابط في متصفحك:<br>
          <span style="color:#3b82f6;word-break:break-all">{link}</span>
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:12px">
        إن لم تنشئ هذا الحساب، تجاهل هذه الرسالة.
      </div>
    </div>
    """
    return send_email(to_email, subject, html)


def send_reset_email(to_email: str, link: str) -> bool:
    subject = "استعادة كلمة المرور - SecureVision AI"
    html = f"""
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;
                border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;direction:rtl">
      <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">SecureVision AI</h1>
        <p style="color:#fee2e2;margin:6px 0 0;font-size:14px">استعادة كلمة المرور</p>
      </div>
      <div style="padding:32px;text-align:center">
        <h2 style="color:#1e293b;font-size:20px">طلب إعادة تعيين كلمة المرور 🔑</h2>
        <p style="color:#475569;line-height:1.8">
          تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك. اضغط الزر أدناه لتعيين كلمة جديدة.
          <br>الرابط صالح لمدة ساعة واحدة.
        </p>
        <a href="{link}" style="display:inline-block;margin-top:18px;padding:14px 36px;
           background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;
           border-radius:10px;font-weight:700;font-size:15px">إعادة تعيين كلمة المرور</a>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px">
          إن لم تطلب هذا، تجاهل الرسالة وكلمتك تبقى كما هي.
        </p>
      </div>
    </div>
    """
    return send_email(to_email, subject, html)