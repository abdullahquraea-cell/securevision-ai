import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const typeMeta: Record<string, { icon: string; label: string; color: string }> = {
  web: { icon: "🌐", label: "موقع ويب", color: "#3b82f6" },
  api: { icon: "🔌", label: "API", color: "#8b5cf6" },
  code: { icon: "💻", label: "كود مصدري", color: "#0ea5e9" },
  mobile: { icon: "📱", label: "تطبيق جوال", color: "#10b981" },
  docker: { icon: "🐳", label: "Docker", color: "#06b6d4" },
};

const sevStyle: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "#fee2e2", color: "#dc2626", label: "حرجة" },
  high: { bg: "#ffedd5", color: "#ea580c", label: "عالية" },
  medium: { bg: "#fef9c3", color: "#ca8a04", label: "متوسطة" },
  low: { bg: "#dcfce7", color: "#16a34a", label: "منخفضة" },
  info: { bg: "#e0f2fe", color: "#0284c7", label: "معلومة" },
};

function isLocalTarget(t: string): boolean {
  const h = (t || "").replace(/^https?:\/\//, "").split("/")[0].split(":")[0].toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.") || h.startsWith("172.");
}

function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("web");
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");

  // نافذة التفاصيل + الذكاء الاصطناعي
  const [detail, setDetail] = useState<any>(null);
  const [detFindings, setDetFindings] = useState<any[]>([]);
  const [detLoading, setDetLoading] = useState(false);
  const [aiMap, setAiMap] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch {
      setMessage("فشل تحميل المشاريع");
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const createProject = async () => {
    if (!name.trim()) { setMessage("⚠️ اسم المشروع مطلوب"); return; }
    try {
      await api.post("/projects", { name, project_type: projectType, target, description });
      setName(""); setTarget(""); setDescription(""); setProjectType("web");
      setMessage("✅ تم إنشاء المشروع بنجاح");
      setShowForm(false);
      loadProjects();
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "فشل إنشاء المشروع");
    }
  };

  const deleteProject = async (id: number, projectName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف مشروع "${projectName}"؟`)) return;
    try {
      await api.delete(`/projects/${id}`);
      setMessage("🗑️ تم حذف المشروع");
      loadProjects();
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "فشل حذف المشروع");
    }
  };

  const openDetails = async (p: any) => {
    setDetail(p);
    setDetFindings([]);
    setAiMap({});
    setAiLoading({});
    setDetLoading(true);
    try {
      const res = await api.get("/findings", { params: { severity: "all" } });
      const list = res.data.filter(
        (f: any) => f.project_id === p.id || f.project_name === p.name
      );
      setDetFindings(list);
    } catch {
      setDetFindings([]);
    } finally {
      setDetLoading(false);
    }
  };

  const runAi = async (id: number) => {
    setAiLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`/ai/analyze/${id}`);
      const prefix = res.data.cached ? "💾 (تحليل محفوظ — بلا تكلفة)\n\n" : "";
      setAiMap((prev) => ({ ...prev, [id]: prefix + res.data.analysis }));
    } catch (e: any) {
      setAiMap((prev) => ({ ...prev, [id]: "⚠️ " + (e.response?.data?.detail || "فشل التحليل") }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filtered = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.target || "").toLowerCase().includes(search.toLowerCase())
  );

  const field = {
    width: "100%", padding: "11px 13px", border: "1px solid #e2e8f0",
    borderRadius: "10px", fontFamily: "inherit", fontSize: "14px",
    outline: "none", background: "#f8fafc", boxSizing: "border-box" as const,
  };

  return (
    <div>
      <style>{`
        .pj-card { transition: transform .2s ease, box-shadow .2s ease; cursor:pointer; }
        .pj-card:hover { transform: translateY(-5px); box-shadow: 0 18px 40px -16px rgba(15,23,42,.35); }
        .pj-del:hover { background: #dc2626 !important; color:#fff !important; }
        .pj-field:focus { border-color:#6366f1 !important; background:#fff !important; box-shadow:0 0 0 3px #6366f122; }
        .pj-new:hover { filter: brightness(1.08); }
      `}</style>

      {/* رأس الصفحة */}
      <div style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #2563eb 100%)",
        borderRadius: "18px", padding: "26px 28px", color: "white", marginBottom: "22px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "16px", boxShadow: "0 16px 40px -18px #4f46e5aa",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px" }}>📁 المشاريع</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.9, fontSize: "14px" }}>أنشئ وأدِر الأصول التي تريد فحصها أمنياً</p>
        </div>
        <div style={{ display: "flex", gap: "22px", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "30px", fontWeight: "bold", fontFamily: "monospace" }}>{projects.length}</div>
            <div style={{ fontSize: "12px", opacity: 0.85 }}>إجمالي المشاريع</div>
          </div>
          <button className="pj-new" onClick={() => setShowForm((v) => !v)} style={{
            padding: "12px 22px", background: "rgba(255,255,255,0.18)", color: "white",
            border: "1px solid rgba(255,255,255,0.35)", borderRadius: "12px", cursor: "pointer",
            fontFamily: "inherit", fontSize: "15px", fontWeight: "bold",
          }}>{showForm ? "✕ إغلاق" : "➕ مشروع جديد"}</button>
        </div>
      </div>

      {message && (
        <div style={{
          marginBottom: "18px", padding: "12px 16px", borderRadius: "10px",
          background: message.startsWith("✅") || message.startsWith("🗑️") ? "#ecfdf5" : "#fef2f2",
          color: message.startsWith("✅") || message.startsWith("🗑️") ? "#065f46" : "#991b1b",
          border: `1px solid ${message.startsWith("✅") || message.startsWith("🗑️") ? "#a7f3d0" : "#fecaca"}`,
          fontSize: "14px",
        }}>{message}</div>
      )}

      {/* نموذج الإنشاء */}
      {showForm && (
        <div style={{
          background: "white", borderRadius: "16px", padding: "24px", marginBottom: "22px",
          boxShadow: "0 10px 30px -14px rgba(15,23,42,.2)", border: "1px solid #eef2f7",
        }}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>➕ إنشاء مشروع جديد</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>اسم المشروع *</label>
              <input className="pj-field" style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: نظام ERP" />
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>نوع المشروع</label>
              <select className="pj-field" style={field} value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                <option value="web">🌐 موقع ويب</option>
                <option value="api">🔌 API</option>
                <option value="code">💻 كود مصدري</option>
                <option value="mobile">📱 تطبيق جوال</option>
                <option value="docker">🐳 Docker</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>الهدف (رابط أو مسار)</label>
              <input className="pj-field" style={{ ...field, direction: "ltr" }} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://example.com" />
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>الوصف</label>
              <input className="pj-field" style={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر للمشروع" />
            </div>
          </div>
          <button className="pj-new" onClick={createProject} style={{
            marginTop: "18px", padding: "12px 34px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "white", border: "none", borderRadius: "10px", cursor: "pointer",
            fontFamily: "inherit", fontSize: "15px", fontWeight: "bold", boxShadow: "0 8px 20px -8px #6d28d9aa",
          }}>🚀 إنشاء المشروع</button>
        </div>
      )}

      {/* البحث */}
      <div style={{ marginBottom: "18px" }}>
        <input className="pj-field" style={field} value={search}
          onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث باسم المشروع أو الهدف..." />
      </div>

      {/* البطاقات */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", color: "#94a3b8",
          background: "white", borderRadius: "16px", border: "2px dashed #e2e8f0",
        }}>
          <div style={{ fontSize: "50px", marginBottom: "10px" }}>📂</div>
          {projects.length === 0 ? "لا توجد مشاريع بعد — أنشئ أول مشروع بالزر بالأعلى" : "لا نتائج مطابقة للبحث"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "18px" }}>
          {filtered.map((p) => {
            const meta = typeMeta[p.project_type] || { icon: "📦", label: p.project_type, color: "#64748b" };
            const local = isLocalTarget(p.target || "");
            return (
              <div key={p.id} className="pj-card" onClick={() => openDetails(p)} style={{
                background: "white", borderRadius: "16px", padding: "20px",
                boxShadow: "0 4px 16px -8px rgba(15,23,42,.15)", borderTop: `4px solid ${meta.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <div style={{
                    width: "48px", height: "48px", borderRadius: "12px", background: `${meta.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px",
                  }}>{meta.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "17px", color: "#1e293b" }}>{p.name}</div>
                    <div style={{ fontSize: "12px", color: meta.color, fontWeight: 600 }}>{meta.label}</div>
                  </div>
                </div>

                <div style={{
                  background: "#f8fafc", borderRadius: "10px", padding: "10px 12px",
                  marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <span style={{
                    fontSize: "11px", fontWeight: "bold", padding: "2px 8px", borderRadius: "20px",
                    background: local ? "#dcfce7" : "#fef3c7", color: local ? "#16a34a" : "#b45309", flexShrink: 0,
                  }}>{local ? "🏠 محلي" : "🌐 خارجي"}</span>
                  <span style={{
                    direction: "ltr", fontFamily: "monospace", fontSize: "12.5px", color: "#475569",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left",
                  }} title={p.target}>{p.target || "بدون هدف"}</span>
                </div>

                {p.description && (
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px", lineHeight: 1.6 }}>{p.description}</p>
                )}

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderTop: "1px solid #f1f5f9", paddingTop: "12px",
                }}>
                  <button onClick={(e) => { e.stopPropagation(); openDetails(p); }} style={{
                    padding: "6px 14px", background: "#eef2ff", color: "#4f46e5", border: "none",
                    borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 600,
                  }}>🔎 تفاصيل</button>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link to="/scans" onClick={(e) => e.stopPropagation()} style={{
                      padding: "6px 14px", background: "linear-gradient(135deg, #16a34a, #059669)",
                      color: "white", borderRadius: "8px", fontSize: "13px", textDecoration: "none", fontWeight: 600,
                    }}>🛡️ فحص</Link>
                    <button className="pj-del" onClick={(e) => { e.stopPropagation(); deleteProject(p.id, p.name); }} style={{
                      padding: "6px 14px", background: "#fee2e2", color: "#dc2626", border: "none",
                      borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 600,
                    }}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== نافذة تفاصيل المشروع + الذكاء الاصطناعي ===== */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "white", borderRadius: "16px", width: "640px", maxWidth: "100%",
            maxHeight: "88vh", overflowY: "auto", direction: "rtl",
          }}>
            {/* رأس النافذة */}
            <div style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white",
              padding: "22px 24px", borderRadius: "16px 16px 0 0",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "22px" }}>{typeMeta[detail.project_type]?.icon || "📦"} {detail.name}</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.9, fontSize: "13px", direction: "ltr", textAlign: "right" }}>
                  {detail.target || "بدون هدف"}
                </p>
              </div>
              <button onClick={() => setDetail(null)} style={{
                background: "rgba(255,255,255,0.2)", border: "none", color: "white",
                width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "18px",
              }}>✕</button>
            </div>

            <div style={{ padding: "22px 24px" }}>
              <h3 style={{ marginTop: 0, color: "#1e293b" }}>🐞 ثغرات هذا المشروع ({detFindings.length})</h3>

              {detLoading ? (
                <p style={{ color: "#64748b" }}>جارٍ تحميل الثغرات...</p>
              ) : detFindings.length === 0 ? (
                <p style={{ color: "#64748b" }}>
                  لا توجد ثغرات لهذا المشروع بعد — شغّل فحصاً من صفحة الفحص الأمني.
                </p>
              ) : (
                detFindings.map((f) => {
                  const s = sevStyle[f.severity] || sevStyle.info;
                  return (
                    <div key={f.id} style={{
                      border: "1px solid #eef2f7", borderRadius: "12px", padding: "14px", marginBottom: "12px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <span style={{
                          background: s.bg, color: s.color, padding: "3px 10px",
                          borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
                        }}>{s.label}</span>
                        <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                          {(f.title || "").replace(/^\[(Nmap|Nuclei|SQLMap)\]\s*/, "")}
                        </span>
                      </div>
                      <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 10px", direction: "ltr", textAlign: "right" }}>
                        {f.location}
                      </p>

                      <button onClick={() => runAi(f.id)} disabled={aiLoading[f.id]} style={{
                        padding: "7px 16px", background: aiLoading[f.id] ? "#94a3b8" : "#7c3aed",
                        color: "white", border: "none", borderRadius: "8px",
                        cursor: aiLoading[f.id] ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "13px",
                      }}>
                        {aiLoading[f.id] ? "⏳ جارٍ التحليل..." : "🤖 حلّل بالذكاء الاصطناعي"}
                      </button>

                      {aiMap[f.id] && (
                        <div style={{
                          marginTop: "12px", padding: "14px", background: "#faf5ff",
                          borderRadius: "8px", borderRight: "4px solid #7c3aed",
                          whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: "13px", color: "#334155",
                        }}>{aiMap[f.id]}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;