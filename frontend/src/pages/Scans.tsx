import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

const levelColors: Record<string, string> = {
  acc: "#22d3ee", ok: "#34d399", warn: "#fbbf24",
  crit: "#f43f5e", mut: "#64748b", info: "#cbd5e1",
};

const sevMeta: Record<string, { color: string; label: string }> = {
  critical: { color: "#f43f5e", label: "حرجة" },
  high: { color: "#fb923c", label: "عالية" },
  medium: { color: "#fbbf24", label: "متوسطة" },
  low: { color: "#34d399", label: "منخفضة" },
  info: { color: "#38bdf8", label: "معلومة" },
};
const sevOrder = ["critical", "high", "medium", "low", "info"];

const scanTypes = [
  { value: "full", icon: "🎯", label: "فحص كامل", desc: "منافذ + بصمة + ملفات + عميق + Nuclei" },
  { value: "nuclei", icon: "🚀", label: "فحص احترافي", desc: "Nuclei — 6774+ قالب CVE" },
  { value: "deep", icon: "🔬", label: "فحص عميق", desc: "SSL + مسارات + SQLi/XSS" },
  { value: "ports", icon: "🔌", label: "فحص المنافذ", desc: "Nmap — خدمات وإصدارات" },
  { value: "headers", icon: "📋", label: "ترويسات الأمان", desc: "فحص ترويسات HTTP" },
];

const statusMeta: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: "#dcfce7", color: "#16a34a", label: "مكتمل" },
  running: { bg: "#cffafe", color: "#0891b2", label: "قيد التشغيل" },
  failed: { bg: "#fee2e2", color: "#dc2626", label: "فاشل" },
};

function isLocalTarget(t: string): boolean {
  const h = (t || "").replace(/^https?:\/\//, "").split("/")[0].split(":")[0].toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.") || h.startsWith("172.");
}

function Scans() {
  const [projects, setProjects] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [scanType, setScanType] = useState("full");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [severity, setSeverity] = useState<any>({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  const [portsScanned, setPortsScanned] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [targetName, setTargetName] = useState("");

  const pollRef = useRef<any>(null);
  const termRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([api.get("/projects"), api.get("/scans")]);
      setProjects(pRes.data);
      setScans(sRes.data);
    } catch {
      setMessage("فشل تحميل البيانات");
    }
  };

  useEffect(() => {
    loadData();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  const selectedProj = projects.find((p) => String(p.id) === String(selectedProject));
  const needsConsent = selectedProj && !isLocalTarget(selectedProj.target);

  const startScan = async () => {
    if (!selectedProject) { setMessage("⚠️ اختر مشروعاً أولاً"); return; }
    setMessage("");
    const proj = selectedProj;
    if (proj && !isLocalTarget(proj.target) && !consent) {
      setMessage("⚠️ يجب تأكيد ملكية الهدف الخارجي قبل بدء الفحص");
      return;
    }
    setTargetName(proj ? `${proj.name} (${proj.target})` : "");
    setShowModal(true);
    setRunning(true);
    setProgress(0);
    setLogs([]);
    setSeverity({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
    setPortsScanned(0);
    setLiveCount(0);

    try {
      const res = await api.post("/scans/start", {
        project_id: Number(selectedProject),
        scan_type: scanType,
        consent: consent,
      });
      const scanId = res.data.scan_id;

      pollRef.current = setInterval(async () => {
        try {
          const st = await api.get(`/scans/${scanId}/status`);
          const d = st.data;
          setProgress(d.progress || 0);
          setLogs(d.logs || []);
          setLiveCount(d.findings_count || 0);
          setPortsScanned(d.ports_scanned || 0);
          if (d.severity) setSeverity(d.severity);
          if (d.status === "completed" || d.status === "failed") {
            clearInterval(pollRef.current);
            setRunning(false);
            loadData();
          }
        } catch {
          clearInterval(pollRef.current);
          setRunning(false);
        }
      }, 800);
    } catch (error: any) {
      setRunning(false);
      setShowModal(false);
      setMessage(error.response?.data?.detail || "فشل بدء الفحص");
    }
  };

  const closeModal = () => setShowModal(false);

  const downloadReport = async () => {
    if (!selectedProject) return;
    try {
      const response = await api.get(`/reports/project/${selectedProject}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "scan_report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { /* تجاهل */ }
  };

  const maxSev = Math.max(1, ...sevOrder.map((s) => severity[s] || 0));

  const blips: { cx: number; cy: number; color: string; delay: number }[] = [];
  let bIdx = 0;
  sevOrder.forEach((sv) => {
    const c = severity[sv] || 0;
    for (let k = 0; k < c; k++) {
      const angle = (bIdx * 137.5) * (Math.PI / 180);
      const radius = 28 + ((bIdx * 31) % 58);
      blips.push({
        cx: 100 + radius * Math.cos(angle),
        cy: 100 + radius * Math.sin(angle),
        color: sevMeta[sv].color,
        delay: (bIdx % 6) * 0.25,
      });
      bIdx++;
    }
  });

  return (
    <div>
      <style>{`
        .sc-type { transition: all .15s ease; }
        .sc-type:hover { border-color:#0891b2 !important; transform: translateY(-2px); }
        .sc-start:hover { filter: brightness(1.08); }
        .sc-card { transition: transform .2s, box-shadow .2s; }
        .sc-card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px -16px rgba(15,23,42,.3); }
        .sc-select:focus { border-color:#0891b2 !important; box-shadow:0 0 0 3px #0891b222; outline:none; }
      `}</style>

      {/* رأس فخم */}
      <div style={{
        background: "linear-gradient(135deg,#0f766e 0%,#0891b2 55%,#1d4ed8 100%)",
        borderRadius: "18px", padding: "26px 28px", color: "white", marginBottom: "20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "16px", boxShadow: "0 16px 40px -18px #0891b2aa",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px" }}>🛡️ الفحص الأمني</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.9, fontSize: "14px" }}>
            فحص شامل حي بـ 6 محرّكات — منافذ، ثغرات، حقن، وأكثر
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "30px", fontWeight: "bold", fontFamily: "monospace" }}>{scans.length}</div>
          <div style={{ fontSize: "12px", opacity: 0.85 }}>إجمالي الفحوصات</div>
        </div>
      </div>

      <div style={{
        background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px",
        padding: "12px 16px", marginBottom: "20px", fontSize: "13.5px", color: "#78350f",
      }}>
        ⚠️ افحص فقط الأنظمة التي تملكها أو لديك إذن صريح بفحصها.
      </div>

      {/* بطاقة بدء الفحص */}
      <div style={{
        background: "white", borderRadius: "16px", padding: "24px",
        marginBottom: "22px", boxShadow: "0 10px 30px -16px rgba(15,23,42,.18)", border: "1px solid #eef2f7",
      }}>
        <h3 style={{ marginTop: 0, color: "#1e293b" }}>▶️ بدء فحص مباشر</h3>

        <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>المشروع (الهدف)</label>
        <select
          className="sc-select"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px",
            fontFamily: "inherit", fontSize: "14px", background: "#f8fafc", marginBottom: "18px",
          }}
        >
          <option value="">— اختر مشروعاً —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.target || "بدون هدف"})</option>
          ))}
        </select>

        <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "10px" }}>نوع الفحص</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {scanTypes.map((t) => {
            const active = scanType === t.value;
            return (
              <div
                key={t.value}
                className="sc-type"
                onClick={() => setScanType(t.value)}
                style={{
                  cursor: "pointer", padding: "14px", borderRadius: "12px",
                  border: `2px solid ${active ? "#0891b2" : "#e2e8f0"}`,
                  background: active ? "#ecfeff" : "#fff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                  <span style={{ fontSize: "20px" }}>{t.icon}</span>
                  <span style={{ fontWeight: "bold", color: active ? "#0e7490" : "#1e293b", fontSize: "14px" }}>{t.label}</span>
                  {active && <span style={{ marginInlineStart: "auto", color: "#0891b2" }}>✓</span>}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{t.desc}</div>
              </div>
            );
          })}
        </div>

        {needsConsent && (
          <label style={{
            display: "flex", alignItems: "flex-start", gap: "8px", marginTop: "16px", padding: "12px",
            background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", cursor: "pointer",
          }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: "3px" }} />
            <span style={{ fontSize: "13px", color: "#78350f" }}>
              أُقرّ بأنني أملك هذا الهدف أو لديّ إذن صريح وخطّي بفحصه، وأتحمّل المسؤولية القانونية الكاملة.
            </span>
          </label>
        )}

        <button
          className="sc-start"
          onClick={startScan}
          disabled={!!(needsConsent && !consent)}
          style={{
            marginTop: "18px", padding: "13px 36px",
            background: needsConsent && !consent ? "#94a3b8" : "linear-gradient(135deg,#16a34a,#0891b2)",
            color: "white", border: "none", borderRadius: "10px",
            cursor: needsConsent && !consent ? "not-allowed" : "pointer",
            fontFamily: "inherit", fontSize: "15px", fontWeight: "bold",
            boxShadow: "0 8px 20px -8px #0891b2aa",
          }}
        >
          🚀 ابدأ الفحص
        </button>

        {message && <p style={{ color: "#dc2626", marginTop: "12px" }}>{message}</p>}
      </div>

      {/* سجل الفحوصات كبطاقات */}
      <h3 style={{ color: "#1e293b", marginBottom: "14px" }}>📜 سجل الفحوصات ({scans.length})</h3>
      {scans.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "50px 20px", color: "#94a3b8",
          background: "white", borderRadius: "16px", border: "2px dashed #e2e8f0",
        }}>
          <div style={{ fontSize: "44px", marginBottom: "8px" }}>🔍</div>
          لا توجد فحوصات بعد — ابدأ أول فحص بالأعلى
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {scans.map((s) => {
            const stm = statusMeta[s.status] || { bg: "#f1f5f9", color: "#64748b", label: s.status };
            const tm = scanTypes.find((t) => t.value === s.scan_type);
            return (
              <div key={s.id} className="sc-card" style={{
                background: "white", borderRadius: "14px", padding: "18px",
                boxShadow: "0 4px 14px -8px rgba(15,23,42,.15)", border: "1px solid #eef2f7",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "monospace" }}>#{s.id}</span>
                  <span style={{ background: stm.bg, color: stm.color, padding: "3px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                    {stm.label}
                  </span>
                </div>
                <div style={{ fontWeight: "bold", fontSize: "16px", color: "#1e293b", marginBottom: "6px" }}>
                  {s.project_name}
                </div>
                <div style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "14px" }}>
                  {tm ? `${tm.icon} ${tm.label}` : s.scan_type}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderTop: "1px solid #f1f5f9", paddingTop: "12px",
                }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>النتائج</span>
                  <span style={{
                    fontSize: "22px", fontWeight: "bold", fontFamily: "monospace",
                    color: s.findings_count > 0 ? "#f43f5e" : "#16a34a",
                  }}>{s.findings_count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== النافذة المنبثقة للفحص المباشر (كما هي) ===== */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}>
          <div style={{
            background: "#0a0e14", border: "1px solid #1e2733", borderRadius: "16px",
            width: "920px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 30px 80px -20px #000", direction: "rtl",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", borderBottom: "1px solid #1e2733" }}>
              <span style={{ fontSize: "18px" }}>🛡️</span>
              <div style={{ color: "#e6edf3", fontWeight: "bold" }}>الفحص المباشر</div>
              <span style={{
                fontFamily: "monospace", fontSize: "12px", color: running ? "#f43f5e" : "#34d399",
                border: "1px solid #1e2733", borderRadius: "20px", padding: "2px 12px",
              }}>{running ? "● LIVE" : "● DONE"}</span>
              <span style={{ color: "#64748b", fontSize: "12.5px", direction: "ltr" }}>{targetName}</span>
              <button onClick={closeModal} style={{
                marginInlineStart: "auto", background: "none", border: "none",
                color: "#8593a6", fontSize: "22px", cursor: "pointer",
              }}>✕</button>
            </div>

            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: "12px", color: "#8593a6", marginBottom: "6px" }}>
                <span>تقدّم الفحص</span>
                <span style={{ color: "#22d3ee" }}>{progress}%</span>
              </div>
              <div style={{ height: "8px", background: "#141d29", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#34d399,#22d3ee)",
                  borderRadius: "6px", transition: "width 0.4s", boxShadow: "0 0 12px #34d399",
                }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "18px", padding: "18px 20px" }}>
              <div ref={termRef} style={{
                direction: "ltr", textAlign: "left", fontFamily: "monospace", fontSize: "12.5px",
                lineHeight: "1.9", color: "#c9d4e0", background: "#05080d", borderRadius: "10px",
                padding: "14px", height: "320px", overflowY: "auto", border: "1px solid #1e2733",
              }}>
                {logs.map((l, i) => (
                  <div key={i} style={{ color: levelColors[l.level] || "#cbd5e1" }}>{l.text}</div>
                ))}
                {running && (
                  <span style={{ display: "inline-block", width: "8px", height: "14px", background: "#34d399", animation: "blink 1s steps(1) infinite" }} />
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <svg width="170" height="170" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="92" fill="none" stroke="#182432" />
                    <circle cx="100" cy="100" r="62" fill="none" stroke="#182432" />
                    <circle cx="100" cy="100" r="32" fill="none" stroke="#182432" />
                    <line x1="100" y1="8" x2="100" y2="192" stroke="#182432" />
                    <line x1="8" y1="100" x2="192" y2="100" stroke="#182432" />
                    <g style={{ transformOrigin: "100px 100px", animation: running ? "spin 2.6s linear infinite" : "none" }}>
                      <defs>
                        <linearGradient id="sweep2" x1="0" x2="1">
                          <stop offset="0" stopColor="#34d39900" />
                          <stop offset="1" stopColor="#34d39955" />
                        </linearGradient>
                      </defs>
                      <path d="M100,100 L100,8 A92,92 0 0,1 168,42 Z" fill="url(#sweep2)" />
                    </g>
                    {blips.map((b, i) => (
                      <circle key={i} cx={b.cx} cy={b.cy} r="4" fill={b.color}
                        style={{ animation: `blipPulse 1.4s ease-in-out ${b.delay}s infinite` }} />
                    ))}
                    <circle cx="100" cy="100" r="3" fill="#22d3ee" />
                  </svg>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
                  <div style={{ background: "#0c131c", border: "1px solid #1e2733", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#22d3ee", fontFamily: "monospace" }}>{portsScanned}</div>
                    <div style={{ fontSize: "11px", color: "#8593a6" }}>منفذ مفحوص</div>
                  </div>
                  <div style={{ background: "#0c131c", border: "1px solid #1e2733", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f43f5e", fontFamily: "monospace" }}>{liveCount}</div>
                    <div style={{ fontSize: "11px", color: "#8593a6" }}>ثغرة</div>
                  </div>
                </div>

                <div>
                  <div style={{ color: "#8593a6", fontSize: "12px", fontFamily: "monospace", marginBottom: "8px" }}>توزيع الخطورة الحيّ</div>
                  {sevOrder.map((s) => {
                    const meta = sevMeta[s];
                    const count = severity[s] || 0;
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                        <span style={{ width: "52px", fontSize: "11.5px", color: "#8593a6" }}>{meta.label}</span>
                        <div style={{ flex: 1, height: "8px", background: "#141d29", borderRadius: "5px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(count / maxSev) * 100}%`, background: meta.color, borderRadius: "5px", transition: "width 0.5s" }} />
                        </div>
                        <span style={{ width: "22px", textAlign: "center", fontFamily: "monospace", fontSize: "12px", color: meta.color }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: "14px 20px", borderTop: "1px solid #1e2733", display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "12px" }}>
              {running ? (
                <span style={{ color: "#8593a6", fontSize: "13px" }}>🔴 الفحص جارٍ... يمكنك الإغلاق وسيكمل في الخلفية</span>
              ) : (
                <span style={{ color: "#34d399", fontSize: "13px" }}>✅ اكتمل الفحص — {liveCount} نتيجة</span>
              )}
              <div style={{ marginInlineStart: "auto", display: "flex", gap: "10px" }}>
                {!running && liveCount > 0 && (
                  <button onClick={downloadReport} style={{
                    padding: "8px 20px", background: "#1d4ed8", color: "white",
                    border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit",
                  }}>📥 تحميل تقرير PDF</button>
                )}
                <button onClick={closeModal} style={{
                  padding: "8px 24px", background: running ? "#334155" : "#16a34a", color: "white",
                  border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit",
                }}>{running ? "إغلاق" : "تم"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scans;