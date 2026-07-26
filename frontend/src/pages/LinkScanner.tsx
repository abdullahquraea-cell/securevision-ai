import { useState } from "react";
import api from "../api/axios";

const levelColor: Record<string, string> = {
  critical: "#f43f5e", high: "#fb923c", medium: "#fbbf24", low: "#34d399",
};

function LinkScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scan = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/urlcheck/analyze", { url });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "فشل الفحص");
    } finally {
      setLoading(false);
    }
  };

  const rColor = result ? levelColor[result.level] : "#64748b";

  return (
    <div>
      <h2 className="page-title">🔗 فاحص الروابط الملغّمة</h2>

      <div className="panel">
        <h3>افحص أي رابط قبل فتحه</h3>
        <p style={{ color: "#64748b", marginTop: 0 }}>
                   فحص حقيقي: يحلّل بنية الرابط (تصيّد/انتحال) + يتّصل بالموقع فعلياً (استجابة، تحويلات، شهادة SSL).
        </p>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scan()}
            placeholder="مثال: http://paypal-secure-login.tk/verify"
            style={{
              flex: 1, minWidth: "260px", padding: "12px",
              border: "1px solid #e2e8f0", borderRadius: "8px",
              fontFamily: "inherit", direction: "ltr", textAlign: "left",
            }}
          />
          <button
            onClick={scan}
            disabled={loading}
            style={{
              padding: "12px 30px", background: loading ? "#94a3b8" : "#1d4ed8",
              color: "white", border: "none", borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}
          >
            {loading ? "⏳ جارٍ الفحص..." : "🔍 افحص الرابط"}
          </button>
        </div>

        {error && <p style={{ color: "#dc2626" }}>⚠️ {error}</p>}
      </div>

      {result && (
        <>
          {/* النتيجة */}
          <div className="panel">
            <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
              {/* مقياس الخطر */}
              <div style={{
                width: "130px", height: "130px", borderRadius: "50%",
                background: `conic-gradient(${rColor} ${result.risk * 3.6}deg, #f1f5f9 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <div style={{
                  width: "100px", height: "100px", borderRadius: "50%", background: "white",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: "32px", fontWeight: "bold", color: rColor }}>{result.risk}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>درجة الخطر</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: "220px" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: rColor, marginBottom: "8px" }}>
                  {result.verdict}
                </div>
                <div style={{ color: "#64748b", fontSize: "14px", direction: "ltr", textAlign: "right" }}>
                  {result.url}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>
                  النطاق: <span style={{ direction: "ltr", display: "inline-block" }}>{result.host}</span>
                </div>
              </div>
            </div>
          </div>

          {/* تفاصيل الفحوصات */}
          <div className="panel">
            <h3>تفاصيل الفحوصات ({result.checks.length})</h3>
            {result.checks.map((c: any, i: number) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "11px 0", borderBottom: "1px solid #f1f5f9",
              }}>
                <span style={{ fontSize: "16px" }}>{c.ok ? "✅" : "⚠️"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: c.ok ? "#334155" : levelColor[c.severity] }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>{c.detail}</div>
                </div>
                {!c.ok && (
                  <span className="status-badge" style={{
                    background: levelColor[c.severity] + "22", color: levelColor[c.severity],
                  }}>
                    مخاطرة
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LinkScanner;