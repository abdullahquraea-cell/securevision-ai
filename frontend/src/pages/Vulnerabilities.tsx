import { useEffect, useState } from "react";
import api from "../api/axios";

// ألوان ونصوص مستويات الخطورة
const severityStyle: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "#fee2e2", color: "#dc2626", label: "حرجة" },
  high:     { bg: "#ffedd5", color: "#ea580c", label: "عالية" },
  medium:   { bg: "#fef9c3", color: "#ca8a04", label: "متوسطة" },
  low:      { bg: "#dcfce7", color: "#16a34a", label: "منخفضة" },
  info:     { bg: "#e0f2fe", color: "#0284c7", label: "معلومة" },
};

const severityOrder = ["critical", "high", "medium", "low", "info"];

// تحديد المحرّك المصدر من عنوان الثغرة
function engineOf(title: string) {
  const t = title || "";
  if (t.startsWith("[Nmap]"))
    return { label: "Nmap", emoji: "🔍", bg: "#e0f2fe", color: "#0369a1" };
  if (t.startsWith("[Nuclei]"))
    return { label: "Nuclei", emoji: "🚀", bg: "#f3e8ff", color: "#7c3aed" };
  return { label: "SecureVision", emoji: "🛡️", bg: "#ccfbf1", color: "#0d9488" };
}

// إزالة بادئة المحرّك من العنوان (الشارة تغني عنها)
function cleanTitle(title: string) {
  return (title || "").replace(/^\[(Nmap|Nuclei)\]\s*/, "");
}

function Vulnerabilities() {
  const [findings, setFindings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  // حالات تحليل الذكاء الاصطناعي
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    const [findingsRes, summaryRes] = await Promise.all([
      api.get("/findings", { params: { severity: filter } }),
      api.get("/findings/summary"),
    ]);
    setFindings(findingsRes.data);
    setSummary(summaryRes.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const runAiAnalysis = async (findingId: number) => {
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const response = await api.post(`/ai/analyze/${findingId}`);
      const prefix = response.data.cached ? "💾 (تحليل محفوظ — بلا تكلفة)\n\n" : "";
      setAiAnalysis(prefix + response.data.analysis);
    } catch (error: any) {
      setAiAnalysis(
        "⚠️ " + (error.response?.data?.detail || "فشل التحليل")
      );
    } finally {
      setAiLoading(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setAiAnalysis("");
  };

  return (
    <div>
      <h2 className="page-title">🐞 الثغرات</h2>

      {/* ملخص حسب الخطورة */}
      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="icon">📊</div>
            <div className="label">الإجمالي</div>
            <div className="value">{summary.total}</div>
          </div>
          {severityOrder.map((sev) => (
            <div className="stat-card" key={sev}>
              <div className="icon" style={{ color: severityStyle[sev].color }}>
                ●
              </div>
              <div className="label">{severityStyle[sev].label}</div>
              <div className="value">{summary[sev]}</div>
            </div>
          ))}
        </div>
      )}

      {/* أزرار الفلترة */}
      <div className="panel">
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["all", ...severityOrder].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                background: filter === sev ? "#1d4ed8" : "#f1f5f9",
                color: filter === sev ? "white" : "#334155",
              }}
            >
              {sev === "all" ? "الكل" : severityStyle[sev].label}
            </button>
          ))}
        </div>
      </div>

      {/* جدول الثغرات */}
      <div className="panel">
        <h3>النتائج ({findings.length})</h3>

        {findings.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            لا توجد ثغرات — شغّل فحصاً من صفحة الفحص الأمني أولاً
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الخطورة</th>
                <th>المحرّك</th>
                <th>العنوان</th>
                <th>المشروع</th>
                <th>الموقع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => {
                const s = severityStyle[f.severity] || severityStyle.info;
                const eng = engineOf(f.title);
                return (
                  <tr key={f.id}>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: eng.bg, color: eng.color }}
                        title={`اكتشفها محرّك ${eng.label}`}
                      >
                        {eng.emoji} {eng.label}
                      </span>
                    </td>
                    <td>{cleanTitle(f.title)}</td>
                    <td>{f.project_name}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>
                      {f.location}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelected(f)}
                        style={{
                          padding: "5px 14px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        تفاصيل
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* نافذة تفاصيل الثغرة */}
      {selected && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              width: "550px",
              maxWidth: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              direction: "rtl",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span
                  className="status-badge"
                  style={{
                    background: (severityStyle[selected.severity] || severityStyle.info).bg,
                    color: (severityStyle[selected.severity] || severityStyle.info).color,
                  }}
                >
                  {(severityStyle[selected.severity] || severityStyle.info).label}
                </span>
                <span
                  className="status-badge"
                  style={{
                    background: engineOf(selected.title).bg,
                    color: engineOf(selected.title).color,
                  }}
                >
                  {engineOf(selected.title).emoji} {engineOf(selected.title).label}
                </span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <h2 style={{ marginTop: "15px" }}>{cleanTitle(selected.title)}</h2>

            <div style={{ marginTop: "20px" }}>
              <h4 style={{ color: "#64748b", marginBottom: "5px" }}>📝 الوصف</h4>
              <p style={{ whiteSpace: "pre-wrap" }}>{selected.description}</p>
            </div>

            <div style={{ marginTop: "15px" }}>
              <h4 style={{ color: "#64748b", marginBottom: "5px" }}>📍 الموقع</h4>
              <p style={{ direction: "ltr", textAlign: "right" }}>
                {selected.location}
              </p>
            </div>

            <div style={{ marginTop: "15px" }}>
              <h4 style={{ color: "#64748b", marginBottom: "5px" }}>
                🛠️ التوصية
              </h4>
              <p
                style={{
                  background: "#f0fdf4",
                  padding: "15px",
                  borderRadius: "8px",
                  borderRight: "4px solid #16a34a",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selected.recommendation}
              </p>
            </div>

            {/* زر تحليل الذكاء الاصطناعي */}
            <div style={{ marginTop: "20px" }}>
              <button
                onClick={() => runAiAnalysis(selected.id)}
                disabled={aiLoading}
                style={{
                  padding: "10px 20px",
                  background: aiLoading ? "#94a3b8" : "#7c3aed",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: aiLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {aiLoading ? "⏳ جارٍ التحليل..." : "🤖 حلّل بالذكاء الاصطناعي"}
              </button>

              {aiAnalysis && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "15px",
                    background: "#faf5ff",
                    borderRadius: "8px",
                    borderRight: "4px solid #7c3aed",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.8",
                    fontSize: "14px",
                  }}
                >
                  {aiAnalysis}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vulnerabilities;