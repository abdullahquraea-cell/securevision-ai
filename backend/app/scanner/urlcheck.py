import re
from urllib.parse import urlparse

SUSPICIOUS_TLDS = {"tk", "ml", "ga", "cf", "gq", "top", "xyz", "work",
                   "click", "link", "country", "science", "party", "zip", "mov"}

SHORTENERS = {"bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
              "buff.ly", "adf.ly", "cutt.ly", "rebrand.ly", "shorturl.at"}

PHISH_KEYWORDS = ["login", "signin", "verify", "account", "secure", "update",
                  "confirm", "password", "wallet", "bonus", "gift", "webscr", "banking"]

BRAND_WORDS = ["paypal", "apple", "microsoft", "google", "amazon",
               "facebook", "instagram", "netflix", "whatsapp", "binance"]

SEV_POINTS = {"critical": 40, "high": 25, "medium": 15, "low": 8}


def analyze_url(raw: str) -> dict:
    checks = []
    score = 0

    url = raw.strip()
    if "://" not in url:
        url = "http://" + url
    p = urlparse(url)
    host = (p.hostname or "").lower()
    after_scheme = url.split("://", 1)[1] if "://" in url else url

    def add(name, ok, sev, detail):
        nonlocal score
        if not ok:
            score += SEV_POINTS.get(sev, 0)
        checks.append({
            "name": name,
            "ok": ok,
            "severity": sev if not ok else "info",
            "detail": detail,
        })

    # 1) عنوان IP بدل نطاق
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host):
        add("استخدام IP بدل اسم نطاق", False, "high", f"يستخدم IP مباشر: {host}")
    else:
        add("استخدام IP بدل اسم نطاق", True, "high", "يستخدم اسم نطاق عادي")

    # 2) رمز @
    if "@" in after_scheme:
        add("وجود رمز @ في الرابط", False, "high", "@ يُستخدم لإخفاء الوجهة الحقيقية")
    else:
        add("وجود رمز @ في الرابط", True, "high", "لا يوجد @")

    # 3) HTTPS
    if p.scheme != "https":
        add("الاتصال مشفّر (HTTPS)", False, "medium", "يستخدم HTTP غير المشفّر")
    else:
        add("الاتصال مشفّر (HTTPS)", True, "medium", "يستخدم HTTPS")

    # 4) امتداد مشبوه
    tld = host.split(".")[-1] if "." in host else ""
    if tld in SUSPICIOUS_TLDS:
        add("امتداد نطاق مشبوه", False, "medium", f".{tld} شائع في المواقع المزيفة")
    else:
        add("امتداد نطاق مشبوه", True, "medium", f"امتداد .{tld} عادي")

    # 5) مختصِر روابط
    if host in SHORTENERS:
        add("مختصِر روابط", False, "medium", f"{host} يخفي الوجهة الحقيقية")
    else:
        add("مختصِر روابط", True, "medium", "ليس مختصِر روابط")

    # 6) Punycode / انتحال حروف
    if "xn--" in host:
        add("نطاق بحروف محاكية (Punycode)", False, "high", "قد يحاكي علامة تجارية بأحرف مشابهة")
    else:
        add("نطاق بحروف محاكية (Punycode)", True, "high", "لا يوجد ترميز مشبوه")

    # 7) طول الرابط
    if len(url) > 75:
        add("طول الرابط", False, "low", f"طويل ({len(url)} حرف) — أسلوب تمويه")
    else:
        add("طول الرابط", True, "low", "طول طبيعي")

    # 8) كثرة النطاقات الفرعية
    dots = host.count(".")
    if dots >= 4:
        add("كثرة النطاقات الفرعية", False, "medium", f"{dots} نطاقات فرعية — تمويه")
    else:
        add("كثرة النطاقات الفرعية", True, "medium", "عدد طبيعي")

    # 9) كلمات تصيّد في النطاق
    hits = [k for k in PHISH_KEYWORDS if k in host]
    if hits:
        add("كلمات تصيّد في النطاق", False, "medium", "كلمات: " + ", ".join(hits))
    else:
        add("كلمات تصيّد في النطاق", True, "medium", "لا كلمات مشبوهة")

    # 10) انتحال علامة تجارية
    brand_hits = [b for b in BRAND_WORDS if b in host]
    legit = any(host == b + ".com" or host.endswith("." + b + ".com") for b in brand_hits)
    if brand_hits and not legit:
        add("انتحال علامة تجارية", False, "high", "اسم علامة (" + ", ".join(brand_hits) + ") في نطاق غير رسمي")
    else:
        add("انتحال علامة تجارية", True, "high", "لا انتحال واضح")

    # 11) رموز وأرقام كثيرة
    digits = sum(c.isdigit() for c in host)
    if host.count("-") >= 3 or digits >= 5:
        add("شرطات/أرقام كثيرة في النطاق", False, "low", "مؤشّر تمويه")
    else:
        add("شرطات/أرقام في النطاق", True, "low", "طبيعي")

    # 12) رموز مُرمّزة
    if "%" in url:
        add("رموز مُرمّزة في الرابط", False, "low", "قد تُستخدم لإخفاء محتوى")
    else:
        add("رموز مُرمّزة في الرابط", True, "low", "لا ترميز مشبوه")

    risk = min(100, score)
    if risk >= 60:
        verdict, level = "🔴 خطير — على الأرجح رابط تصيّد/ملغّم", "critical"
    elif risk >= 30:
        verdict, level = "🟠 مشبوه — توخَّ الحذر الشديد", "high"
    elif risk >= 12:
        verdict, level = "🟡 مشكوك فيه قليلاً", "medium"
    else:
        verdict, level = "🟢 يبدو آمناً", "low"

    return {
        "url": raw,
        "host": host,
        "risk": risk,
        "verdict": verdict,
        "level": level,
        "checks": checks,
    }