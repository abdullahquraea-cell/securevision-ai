import { useState } from "react";
import api from "../api/axios";

function isLocalTarget(t: string): boolean {
  const h = (t || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    h.startsWith("172.")
  );
}

const secLabels: Record<string, string> = {
  "Strict-Transport-Security": "فرض HTTPS (HSTS)",
  "Content-Security-Policy": "سياسة أمن المحتوى (CSP)",
  "X-Frame-Options": "منع التضمين (Clickjacking)",
  "X-Content-Type-Options": "منع تخمين النوع",
  "Referrer-Policy": "سياسة المُحيل",
  "Permissions-Policy": "سياسة الأذونات",
};

function ReconScanner() {
  const [url, setUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const needsConsent = url.trim() !== "" && !isLocalTarget(url);

  const runScan = async () => {
    if (!url.trim()) {
      setError("⚠️ أدخل رابط الموقع");
      return;
    }
    if (needsConsent && !consent) {
      setError("⚠️ يجب تأكيد ملكية الهدف الخارجي أولاً");
      return;
    }
    setError("");
    setData(null);
    setLoading(true);
    try {
      const res = await api.post("/recon/scan", { url: url.trim(), consent });
      setData(res.data);
    } catch (e: any) {
      setError("⚠️ " + (e.response?.data?.detail || "فشل الفحص"));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontFamily: "inherit",
    direction: "ltr" as const,
  };

  const infoRow = (label: string, value: any) => (
    <div style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "150px", color: "#64748b", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, direction: "ltr", textAlign: "right", wordBreak: "break-all" }}>
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div>
      <h2 className="page-title">🔎 بصمة الموقع (Reconnaissance)</h2>

      <div className="panel" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
        ⚠️ افحص فقط الأنظمة التي تملكها أو لديك إذن صريح بفحصها.
      </div>

      <div className="panel">
        <h3>🎯 الهدف</h3>
        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
          أدخل رابط الموقع لاستخراج بطاقة تعريف كاملة (الخادم، اللغات، الأطر، الأمان). مثال:
          <br />
          <code style={{ direction: "ltr", display: "inline-block", marginTop: "5px" }}>
            http://localhost:3000
          </code>
        </p>
        <input
          style={inputStyle}
          placeholder="http://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        {needsConsent && (
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginTop: "14px",
              padding: "12px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: "3px" }}
            />
            <span style={{ fontSize: "13px", color: "#78350f" }}>
              أُقرّ بأنني أملك هذا الهدف أو لديّ إذن صريح بفحصه.
            </span>
          </label>
        )}

        <button
          onClick={runScan}
          disabled={loading}
          style={{
            marginTop: "15px",
            padding: "12px 30px",
            background: loading ? "#94a3b8" : "#0d9488",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: "15px",
          }}
        >
          {loading ? "⏳ جارٍ استخراج البصمة..." : "🔍 افحص بصمة الموقع"}
        </button>

        {error && <p style={{ color: "#dc2626", marginTop: "10px" }}>{error}</p>}
      </div>

      {data && data.error && (
        <div className="panel" style={{ color: "#dc2626" }}>⚠️ {data.error}</div>
      )}

      {data && !data.error && (
        <>
          {/* بطاقة التعريف */}
          <div className="panel">
            <h3>🪪 بطاقة التعريف</h3>
            {infoRow("العنوان (Title)", data.title)}
            {infoRow("الرابط", data.url)}
            {infoRow("عنوان IP", data.ip)}
            {infoRow("حالة الاستجابة", data.status_code)}
            {infoRow("الخادم (Server)", data.server)}
            {infoRow("مدعوم بـ (X-Powered-By)", data.powered_by)}
            {infoRow("المولّد (Generator)", data.generator)}
          </div>

          {/* التقنيات */}
          <div className="panel">
            <h3>🧩 التقنيات المكتشفة ({data.technologies.length})</h3>
            {data.technologies.length === 0 ? (
              <p style={{ color: "#64748b" }}>لم تُكتشف تقنيات واضحة من الصفحة الرئيسية.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                {data.technologies.map((t: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 14px",
                      background: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#0f766e" }}>{t.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{t.category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ترويسات الأمان */}
          <div className="panel">
            <h3>🛡️ ترويسات الأمان</h3>
            <div style={{ marginTop: "10px" }}>
              {Object.entries(data.security_headers).map(([h, present]) => (
                <div
                  key={h}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}
                >
                  <span style={{ fontSize: "18px" }}>{present ? "✅" : "❌"}</span>
                  <span style={{ color: present ? "#16a34a" : "#dc2626", width: "230px" }}>
                    {secLabels[h] || h}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: "12px", direction: "ltr" }}>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* الكوكيز */}
          {data.cookies && data.cookies.length > 0 && (
            <div className="panel">
              <h3>🍪 الكوكيز ({data.cookies.length})</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                {data.cookies.map((c: string, i: number) => (
                  <span
                    key={i}
                    style={{
                      padding: "5px 12px",
                      background: "#f1f5f9",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      direction: "ltr",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReconScanner;