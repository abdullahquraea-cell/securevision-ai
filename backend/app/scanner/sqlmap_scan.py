import os
import re
import subprocess
import sys


# مسار SQLMap
SQLMAP_PATH = os.getenv(
    "SQLMAP_PATH",
    r"D:\Projects\SecureVision-AI\tools\sqlmap-master\sqlmap.py",
)


def is_available() -> bool:
    """هل ملف sqlmap.py موجود؟"""
    return os.path.isfile(SQLMAP_PATH)


def run_sqlmap(url: str, get_dbs: bool = True, timeout: int = 180) -> dict:
    """يشغّل SQLMap على رابط ويُعيد نتيجة منظّمة."""

    result = {
        "injectable": False,
        "parameter": "",
        "type": "",
        "title": "",
        "payload": "",
        "dbms": "",
        "databases": [],
        "raw_tail": "",
    }

    if not is_available():
        result["raw_tail"] = "SQLMap غير مثبّت على الخادم."
        return result

    cmd = [
        sys.executable,          # نفس مفسّر Python الحالي
        SQLMAP_PATH,
        "-u", url,
                "--batch",               # تلقائي بلا أسئلة
        "--level=2",
        "--risk=1",
        "--technique=BEU",       # أنواع سريعة فقط (Boolean/Error/Union) — نتجنّب time-based البطيء
        "--flush-session",       # نتائج نظيفة كل مرة
        "--disable-coloring",
    ]
    if get_dbs:
        cmd.append("--dbs")

    try:
        proc = subprocess.run(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="ignore",
            timeout=timeout,
        )
        out = proc.stdout or ""
    except subprocess.TimeoutExpired:
        result["raw_tail"] = "انتهت مهلة SQLMap (الهدف بطيء أو غير مستجيب)."
        return result
    except Exception as e:
        result["raw_tail"] = f"تعذّر تشغيل SQLMap: {e}"
        return result

    # هل الهدف قابل للحقن؟
    if "identified the following injection point" in out or "is vulnerable" in out:
        result["injectable"] = True

    # استخراج التفاصيل من المخرجات
    def grab(pattern):
        m = re.search(pattern, out)
        return m.group(1).strip() if m else ""

    result["parameter"] = grab(r"Parameter:\s*(.+)")
    result["type"] = grab(r"Type:\s*(.+)")
    result["title"] = grab(r"Title:\s*(.+)")
    result["payload"] = grab(r"Payload:\s*(.+)")
    result["dbms"] = grab(r"back-end DBMS:\s*(.+)")

    # قواعد البيانات المكتشفة
    dbs_block = re.search(
        r"available databases \[\d+\]:(.+?)(?:\n\n|\[\*\] ending)", out, re.S
    )
    if dbs_block:
        for line in dbs_block.group(1).splitlines():
            line = line.strip()
            if line.startswith("[*]"):
                result["databases"].append(line[3:].strip())

    # آخر جزء من المخرجات الخام (للعرض عند عدم وجود حقن)
    result["raw_tail"] = "\n".join(out.strip().splitlines()[-15:])

    return result