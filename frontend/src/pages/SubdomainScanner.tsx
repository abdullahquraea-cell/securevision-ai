import { useState } from "react";
import api from "../api/axios";

function SubdomainScanner() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const runScan = async () => {
    if (!domain.trim()) {
      setError("⚠️ أدخل نطاقاً (مثل example.com)");
      return;
    }
    setError("");
    setData(null);
    setLoading(true);
    try {
      const res = await api.post("/subdomains/scan", { domain: domain.trim() });
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
      <h2 className="page-title">🌐 تعداد النطاقات الفرعية</h2>

      <div className="panel" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        ℹ️ استطلاع سلبي عبر استعلامات DNS العامة فقط (لا يلمس خادم الهدف) — يكشف الخوادم الفرعية المخفية.
      </div>

      <div className="panel">
        <h3>🎯 النطاق</h3>
        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
          أدخل النطاق الأساسي (بدون http). مثال:
          <br />
          <code style={{ direction: "ltr", display: "inline-block", marginTop: "5px" }}>
            github.com
          </code>
        </p>
        <input
          style={inputStyle}
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />

        <button
          onClick={runScan}
          disabled={loading}
          style={{
            marginTop: "15px",
            padding: "12px 30px",
            background: loading ? "#94a3b8" : "#0369a1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: "15px",
          }}
        >
          {loading ? "⏳ جارٍ التعداد..." : "🔍 ابدأ تعداد النطاقات"}
        </button>

        {error && <p style={{ color: "#dc2626", marginTop: "10px" }}>{error}</p>}
      </div>

      {loading && (
        <div className="panel" style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: "40px" }}>🌐</div>
          جارٍ استعلام عشرات النطاقات الفرعية الشائعة...
        </div>
      )}

      {data && data.error && (
        <div className="panel" style={{ color: "#dc2626" }}>⚠️ {data.error}</div>
      )}

      {data && !data.error && (
        <div className="panel">
          <h3>
            النطاقات الفرعية المكتشفة لـ <span style={{ direction: "ltr" }}>{data.domain}</span> ({data.found.length})
          </h3>

          {data.found.length === 0 ? (
            <p style={{ color: "#64748b" }}>لم يُعثر على نطاقات فرعية من القائمة الشائعة.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>النطاق الفرعي</th>
                  <th>عنوان IP</th>
                </tr>
              </thead>
              <tbody>
                {data.found.map((s: any, i: number) => (
                  <tr key={i}>
                    <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace" }}>
                      {s.subdomain}
                    </td>
                    <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace", color: "#0369a1" }}>
                      {s.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default SubdomainScanner;