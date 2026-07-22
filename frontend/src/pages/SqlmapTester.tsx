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

function SqlmapTester() {
  const [url, setUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const needsConsent = url.trim() !== "" && !isLocalTarget(url);

  const runTest = async () => {
    if (!url.trim()) {
      setError("⚠️ أدخل رابطاً يحتوي على معامل (مثل ?q=1)");
      return;
    }
    if (needsConsent && !consent) {
      setError("⚠️ يجب تأكيد ملكية الهدف الخارجي قبل الاختبار");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post("/sqlmap/test", { url: url.trim(), consent });
      setResult(res.data);
    } catch (e: any) {
      setError("⚠️ " + (e.response?.data?.detail || "فشل الاختبار"));
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
      <h2 className="page-title">💉 اختبار حقن SQL (SQLMap)</h2>

      <div className="panel" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
        ⚠️ اختبر فقط الأنظمة التي تملكها أو لديك إذن صريح بفحصها. SQLMap أداة استغلال حقيقية.
      </div>

      <div className="panel">
        <h3>🎯 الهدف</h3>
        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
          أدخل رابطاً يحتوي على معامل (parameter). مثال للتجربة على Juice Shop:
          <br />
          <code style={{ direction: "ltr", display: "inline-block", marginTop: "5px" }}>
            http://localhost:3000/rest/products/search?q=1
          </code>
        </p>
        <input
          style={inputStyle}
          placeholder="http://example.com/page?id=1"
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
              أُقرّ بأنني أملك هذا الهدف أو لديّ إذن صريح بفحصه، وأتحمّل المسؤولية القانونية الكاملة.
            </span>
          </label>
        )}

        <button
          onClick={runTest}
          disabled={loading}
          style={{
            marginTop: "15px",
            padding: "12px 30px",
            background: loading ? "#94a3b8" : "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: "15px",
          }}
        >
          {loading ? "⏳ جارٍ الاختبار... (قد يأخذ دقيقة)" : "🚀 ابدأ اختبار الحقن"}
        </button>

        {error && <p style={{ color: "#dc2626", marginTop: "10px" }}>{error}</p>}
      </div>

      {loading && (
        <div className="panel" style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: "40px" }}>💉</div>
          SQLMap يختبر الهدف بعشرات الحمولات... انتظر قليلاً.
        </div>
      )}

      {result && (
        <div className="panel">
          {result.injectable ? (
            <>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  fontWeight: "bold",
                  marginBottom: "18px",
                }}
              >
                🔴 الهدف قابل للحقن (Vulnerable)!
              </div>

              <table className="data-table">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: "bold", width: "150px" }}>المعامل</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{result.parameter || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold" }}>نوع الحقن</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{result.type || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold" }}>العنوان</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{result.title || "—"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold" }}>الحمولة (Payload)</td>
                    <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace", fontSize: "12px" }}>
                      {result.payload || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold" }}>قاعدة البيانات</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{result.dbms || "—"}</td>
                  </tr>
                </tbody>
              </table>

              {result.databases && result.databases.length > 0 && (
                <div style={{ marginTop: "18px" }}>
                  <h4 style={{ color: "#64748b" }}>
                    🗄️ قواعد البيانات المكتشفة ({result.databases.length})
                  </h4>
                  <ul style={{ direction: "ltr", textAlign: "right" }}>
                    {result.databases.map((db: string, i: number) => (
                      <li key={i} style={{ fontFamily: "monospace" }}>{db}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "#dcfce7",
                  color: "#16a34a",
                  fontWeight: "bold",
                  marginBottom: "18px",
                }}
              >
                ✅ لم يُكتشف حقن SQL في هذا المعامل
              </div>
              <pre
                style={{
                  direction: "ltr",
                  textAlign: "left",
                  background: "#0f172a",
                  color: "#cbd5e1",
                  padding: "15px",
                  borderRadius: "8px",
                  overflowX: "auto",
                  fontSize: "12px",
                }}
              >
                {result.raw_tail}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SqlmapTester;