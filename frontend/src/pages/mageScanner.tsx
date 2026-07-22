import { useState } from "react";
import api from "../api/axios";

const levelColor: Record<string, string> = {
  critical: "#f43f5e", high: "#fb923c", medium: "#fbbf24", low: "#34d399",
};

function ImageScanner() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api.post("/imagecheck/analyze", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "فشل الفحص");
    } finally {
      setLoading(false);
    }
  };

  const rColor = result ? levelColor[result.level] : "#64748b";

  return (
    <div>
      <h2 className="page-title">🖼️ فاحص الصور الملغّمة</h2>

      <div className="panel">
        <h3>افحص أي صورة قبل فتحها</h3>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          يكشف الكود المدسوس داخل الصور، الملفات المخفية (EXE/ZIP)، والصور المزيّفة — بلا فتح أو تنفيذ.
        </p>

        <label style={{
          display: "inline-block", padding: "12px 30px",
          background: loading ? "#94a3b8" : "#1d4ed8", color: "white",
          borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "⏳ جارٍ الفحص..." : "📤 اختر صورة للفحص"}
          <input type="file" accept="image/*" onChange={handleFile}
            disabled={loading} style={{ display: "none" }} />
        </label>

        {fileName && <p style={{ color: "#64748b", fontSize: "13px" }}>الملف: {fileName}</p>}
        {error && <p style={{ color: "#dc2626" }}>⚠️ {error}</p>}
      </div>

      {result && (
        <>
          <div className="panel">
            <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
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
                <div style={{ color: "#64748b", fontSize: "14px" }}>
                  النوع الحقيقي: <b>{result.real_type}</b> — الحجم: {result.size_kb} KB
                </div>
              </div>
            </div>
          </div>

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
                  }}>مخاطرة</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ImageScanner;