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

const sev: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "#fee2e2", color: "#dc2626", label: "حرجة" },
  high: { bg: "#ffedd5", color: "#ea580c", label: "عالية" },
  medium: { bg: "#fef9c3", color: "#ca8a04", label: "متوسطة" },
  low: { bg: "#dcfce7", color: "#16a34a", label: "منخفضة" },
  info: { bg: "#e0f2fe", color: "#0284c7", label: "معلومة" },
};

function FileDiscovery() {
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
      const res = await api.post("/filediscovery/scan", { url: url.trim(), consent });
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

  return (
    <div>
      <h2 className="page-title">🗂️ كشف الملفات والأكواد المكشوفة</h2>

      <div className="panel" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
        ⚠️ افحص فقط الأنظمة التي تملكها أو لديك إذن صريح بفحصها.
      </div>

      <div className="panel">
        <h3>🎯 الهدف</h3>
        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
          يبحث عن ملفات حساسة مكشوفة (.env، .git، نسخ قواعد البيانات، مفاتيح، نسخ احتياطية…). مثال:
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
            background: loading ? "#94a3b8" : "#b45309",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: "15px",
          }}
        >
          {loading ? "⏳ جارٍ البحث..." : "🔍 ابحث عن الملفات المكشوفة"}
        </button>

        {error && <p style={{ color: "#dc2626", marginTop: "10px" }}>{error}</p>}
      </div>

      {loading && (
        <div className="panel" style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: "40px" }}>🗂️</div>
          جارٍ فحص عشرات المسارات الحساسة...
        </div>
      )}

      {data && data.error && (
        <div className="panel" style={{ color: "#dc2626" }}>⚠️ {data.error}</div>
      )}

      {data && !data.error && (
        <div className="panel">
          {data.baseline_200 && (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "15px",
                fontSize: "13px",
                color: "#1e40af",
              }}
            >
              ℹ️ الموقع يرجّع استجابة 200 لكل المسارات (تطبيق SPA) — فعّلنا المعايرة الذكية
              لتجنّب النتائج الكاذبة، ونعرض فقط الملفات المختلفة فعلاً.
            </div>
          )}

          <h3>النتائج ({data.found.length})</h3>

          {data.found.length === 0 ? (
            <p style={{ color: "#16a34a", fontWeight: "bold" }}>
              ✅ لم يُعثر على ملفات حساسة مكشوفة — ممتاز!
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>الخطورة</th>
                  <th>المسار</th>
                  <th>الوصف</th>
                  <th>الحالة</th>
                  <th>الحجم</th>
                </tr>
              </thead>
              <tbody>
                {data.found.map((f: any, i: number) => {
                  const s = sev[f.severity] || sev.info;
                  return (
                    <tr key={i}>
                      <td>
                        <span className="status-badge" style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace" }}>
                        {f.path}
                      </td>
                      <td>{f.description}</td>
                      <td style={{ direction: "ltr", textAlign: "center" }}>
                        {f.status === 200 ? "🔴 200" : `🔒 ${f.status}`}
                      </td>
                      <td style={{ direction: "ltr", textAlign: "center" }}>{f.size}B</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default FileDiscovery;