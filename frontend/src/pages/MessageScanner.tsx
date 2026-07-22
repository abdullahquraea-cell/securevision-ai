import { useState } from "react";
import api from "../api/axios";

const levelColor: Record<string, string> = {
  critical: "#f43f5e", high: "#fb923c", medium: "#fbbf24", low: "#34d399",
};

function MessageScanner() {
  const [text, setText] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scan = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/messagecheck/analyze", { text, use_ai: useAi });
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
      <h2 className="page-title">💬 فاحص الرسائل الملغّمة</h2>

      <div className="panel">
        <h3>الصق أي رسالة مشبوهة للفحص</h3>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          يكشف رسائل الاحتيال والتصيّد (بريد، SMS، واتساب) — روابط خطيرة، طلب بيانات، إلحاح، إغراءات.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="مثال: مبروك! ربحت جائزة 100000 ريال. للاستلام أدخل بيانات بطاقتك خلال 24 ساعة على bit.ly/xxx"
          style={{
            width: "100%", padding: "12px", border: "1px solid #e2e8f0",
            borderRadius: "8px", fontFamily: "inherit", fontSize: "14px", resize: "vertical",
          }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", color: "#334155", fontSize: "14px" }}>
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          🤖 تحليل عميق بالذكاء الاصطناعي (Claude) — أدق وأشمل
        </label>

        <button
          onClick={scan}
          disabled={loading}
          style={{
            marginTop: "12px", padding: "12px 30px",
            background: loading ? "#94a3b8" : "#1d4ed8", color: "white",
            border: "none", borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          {loading ? "⏳ جارٍ الفحص..." : "🔍 افحص الرسالة"}
        </button>

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
              <div style={{ flex: 1, minWidth: "220px", fontSize: "20px", fontWeight: "bold", color: rColor }}>
                {result.verdict}
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
                  <div style={{ fontSize: "14px", color: c.ok ? "#334155" : levelColor[c.severity] }}>{c.name}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>{c.detail}</div>
                </div>
                {!c.ok && (
                  <span className="status-badge" style={{ background: levelColor[c.severity] + "22", color: levelColor[c.severity] }}>مخاطرة</span>
                )}
              </div>
            ))}
          </div>

          {result.ai_analysis && (
            <div className="panel">
              <h3>🤖 تحليل الذكاء الاصطناعي</h3>
              <div style={{
                background: "#faf5ff", padding: "15px", borderRadius: "8px",
                borderRight: "4px solid #7c3aed", whiteSpace: "pre-wrap",
                lineHeight: "1.8", fontSize: "14px",
              }}>
                {result.ai_analysis}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MessageScanner;