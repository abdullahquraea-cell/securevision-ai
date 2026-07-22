import { useRef, useState } from "react";
import api from "../api/axios";

const sev: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "#fee2e2", color: "#dc2626", label: "حرجة" },
  high: { bg: "#ffedd5", color: "#ea580c", label: "عالية" },
  medium: { bg: "#fef9c3", color: "#ca8a04", label: "متوسطة" },
  low: { bg: "#dcfce7", color: "#16a34a", label: "منخفضة" },
  info: { bg: "#e0f2fe", color: "#0284c7", label: "معلومة" },
};
const sevOrder = ["critical", "high", "medium", "low", "info"];

function CodeScanner() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    const reader = new FileReader();
    reader.onload = () => setCode(String(reader.result || ""));
    reader.readAsText(f);
  };

  const runScan = async () => {
    if (!code.trim()) {
      setError("⚠️ ألصق كوداً أو ارفع ملفاً أولاً");
      return;
    }
    setError("");
    setData(null);
    setLoading(true);
    try {
      const res = await api.post("/codescan/scan", { code, filename });
      setData(res.data);
    } catch (e: any) {
      setError("⚠️ " + (e.response?.data?.detail || "فشل الفحص"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">👨‍💻 فحص الكود المصدري (SAST)</h2>

      <div className="panel" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        ℹ️ يحلّل الكود بحثاً عن أسرار مكشوفة، دوال خطيرة، وأنماط ثغرات (SQLi/XSS). يدعم Python, JS, PHP, Java وغيرها.
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ margin: 0 }}>📝 الكود</h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {filename && <span style={{ fontSize: "12px", color: "#64748b", direction: "ltr" }}>📄 {filename}</span>}
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding: "8px 16px", background: "#f1f5f9", color: "#334155",
                border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px",
              }}
            >
              📁 رفع ملف
            </button>
            <input ref={fileRef} type="file" onChange={onFile} style={{ display: "none" }}
              accept=".py,.js,.ts,.tsx,.jsx,.php,.java,.rb,.go,.c,.cpp,.cs,.html,.env,.txt,.json,.yml,.yaml,.sql" />
          </div>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="الصق الكود هنا... (أو ارفع ملفاً)"
          spellCheck={false}
          style={{
            width: "100%", minHeight: "260px", padding: "14px",
            border: "1px solid #e2e8f0", borderRadius: "10px",
            fontFamily: "monospace", fontSize: "13px", direction: "ltr", textAlign: "left",
            background: "#0f172a", color: "#e2e8f0", lineHeight: 1.6, boxSizing: "border-box",
            resize: "vertical",
          }}
        />

        <button
          onClick={runScan}
          disabled={loading}
          style={{
            marginTop: "14px", padding: "12px 30px",
            background: loading ? "#94a3b8" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "white", border: "none", borderRadius: "10px",
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "15px", fontWeight: "bold",
          }}
        >
          {loading ? "⏳ جارٍ الفحص..." : "🔍 افحص الكود"}
        </button>

        {error && <p style={{ color: "#dc2626", marginTop: "10px" }}>{error}</p>}
      </div>

      {data && (
        <>
          {/* ملخص */}
          <div className="panel">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: "13px" }}>
                📄 {data.lines} سطر — {data.total} نتيجة
              </span>
              {sevOrder.map((s) => (
                <span key={s} style={{
                  padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold",
                  background: sev[s].bg, color: sev[s].color,
                }}>
                  {sev[s].label}: {data.counts[s] || 0}
                </span>
              ))}
            </div>
          </div>

          {/* النتائج */}
          <div className="panel">
            <h3>النتائج ({data.total})</h3>
            {data.total === 0 ? (
              <p style={{ color: "#16a34a", fontWeight: "bold" }}>✅ لم تُكتشف مشاكل أمنية معروفة في الكود — ممتاز!</p>
            ) : (
              data.findings.map((f: any, i: number) => {
                const s = sev[f.severity] || sev.info;
                return (
                  <div key={i} style={{ border: "1px solid #eef2f7", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                        {s.label}
                      </span>
                      <span style={{ fontWeight: 600, color: "#1e293b" }}>{f.title}</span>
                      <span style={{ fontSize: "12px", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px" }}>
                        سطر {f.line}
                      </span>
                    </div>
                    <pre style={{
                      direction: "ltr", textAlign: "left", background: "#0f172a", color: "#fca5a5",
                      padding: "10px 12px", borderRadius: "8px", overflowX: "auto", fontSize: "12.5px", margin: "0 0 8px",
                    }}>{f.code}</pre>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 6px" }}>{f.description}</p>
                    <p style={{
                      fontSize: "13px", color: "#166534", margin: 0, background: "#f0fdf4",
                      padding: "8px 12px", borderRadius: "8px", borderRight: "3px solid #16a34a",
                    }}>
                      🛠️ {f.recommendation}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CodeScanner;