import { useEffect, useState } from "react";
import api from "../api/axios";

const typeMeta: Record<string, { icon: string; color: string }> = {
  web: { icon: "🌐", color: "#3b82f6" },
  api: { icon: "🔌", color: "#8b5cf6" },
  code: { icon: "💻", color: "#0ea5e9" },
  mobile: { icon: "📱", color: "#10b981" },
  docker: { icon: "🐳", color: "#06b6d4" },
};

const sevMeta: Record<string, { color: string; label: string }> = {
  critical: { color: "#dc2626", label: "حرجة" },
  high: { color: "#ea580c", label: "عالية" },
  medium: { color: "#ca8a04", label: "متوسطة" },
  low: { color: "#16a34a", label: "منخفضة" },
  info: { color: "#0284c7", label: "معلومة" },
};
const sevOrder = ["critical", "high", "medium", "low", "info"];

function Reports() {
  const [projects, setProjects] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/projects").then((res) => setProjects(res.data)).catch(() => {});
    api.get("/findings", { params: { severity: "all" } }).then((res) => setFindings(res.data)).catch(() => {});
  }, []);

  const countsFor = (p: any) => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
    findings.forEach((f) => {
      if (f.project_id === p.id || f.project_name === p.name) {
        if (c[f.severity as keyof typeof c] !== undefined) (c as any)[f.severity]++;
        c.total++;
      }
    });
    return c;
  };

  const downloadReport = async (projectId: number, projectName: string) => {
    setDownloading(projectId);
    setMessage("");
    try {
      const response = await api.get(`/reports/project/${projectId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report_${projectName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("✅ تم تنزيل التقرير بنجاح");
    } catch {
      setMessage("⚠️ فشل توليد التقرير");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <style>{`
        .rp-card { transition: transform .2s, box-shadow .2s; }
        .rp-card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px -16px rgba(15,23,42,.3); }
        .rp-btn:hover { filter: brightness(1.08); }
      `}</style>

      {/* رأس فخم */}
      <div style={{
        background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#0891b2 100%)",
        borderRadius: "18px", padding: "26px 28px", color: "white", marginBottom: "22px",
        boxShadow: "0 16px 40px -18px #1d4ed8aa",
      }}>
        <h2 style={{ margin: 0, fontSize: "26px" }}>📄 التقارير الأمنية</h2>
        <p style={{ margin: "6px 0 0", opacity: 0.9, fontSize: "14px" }}>
          حمّل تقريراً احترافياً (PDF) لكل مشروع — ملخص تنفيذي، درجة الأمان، توزيع الأدوات، وكل الثغرات مع التوصيات.
        </p>
      </div>

      {message && (
        <div style={{
          marginBottom: "18px", padding: "12px 16px", borderRadius: "10px",
          background: message.startsWith("✅") ? "#ecfdf5" : "#fef2f2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          border: `1px solid ${message.startsWith("✅") ? "#a7f3d0" : "#fecaca"}`,
          fontSize: "14px",
        }}>{message}</div>
      )}

      {projects.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", color: "#94a3b8",
          background: "white", borderRadius: "16px", border: "2px dashed #e2e8f0",
        }}>
          <div style={{ fontSize: "50px", marginBottom: "10px" }}>📭</div>
          لا توجد مشاريع — أنشئ مشروعاً وشغّل فحصاً أولاً
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" }}>
          {projects.map((p) => {
            const meta = typeMeta[p.project_type] || { icon: "📦", color: "#64748b" };
            const c = countsFor(p);
            return (
              <div key={p.id} className="rp-card" style={{
                background: "white", borderRadius: "16px", padding: "20px",
                boxShadow: "0 4px 16px -8px rgba(15,23,42,.15)", borderTop: `4px solid ${meta.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <div style={{
                    width: "46px", height: "46px", borderRadius: "12px", background: `${meta.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
                  }}>{meta.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "16px", color: "#1e293b" }}>{p.name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", direction: "ltr", textAlign: "right" }}>
                      {p.target || "بدون هدف"}
                    </div>
                  </div>
                </div>

                {/* ملخص الثغرات */}
                {c.total === 0 ? (
                  <div style={{
                    background: "#f8fafc", borderRadius: "10px", padding: "12px", textAlign: "center",
                    color: "#94a3b8", fontSize: "13px", marginBottom: "14px",
                  }}>لا توجد ثغرات — شغّل فحصاً أولاً</div>
                ) : (
                  <div style={{
                    background: "#f8fafc", borderRadius: "10px", padding: "12px", marginBottom: "14px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>إجمالي الثغرات</span>
                      <span style={{ fontWeight: "bold", color: "#1e293b" }}>{c.total}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {sevOrder.filter((s) => (c as any)[s] > 0).map((s) => (
                        <span key={s} style={{
                          fontSize: "11.5px", fontWeight: "bold", padding: "2px 8px", borderRadius: "20px",
                          background: `${sevMeta[s].color}18`, color: sevMeta[s].color,
                        }}>{sevMeta[s].label} {(c as any)[s]}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="rp-btn"
                  onClick={() => downloadReport(p.id, p.name)}
                  disabled={downloading === p.id}
                  style={{
                    width: "100%", padding: "11px", border: "none", borderRadius: "10px",
                    background: downloading === p.id ? "#94a3b8" : "linear-gradient(135deg,#1d4ed8,#0891b2)",
                    color: "white", cursor: downloading === p.id ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: "14px", fontWeight: "bold",
                    boxShadow: "0 8px 18px -10px #1d4ed8aa",
                  }}
                >
                  {downloading === p.id ? "⏳ جارٍ توليد التقرير..." : "📥 تحميل تقرير PDF"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Reports;