import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type Scan = {
  id: number;
  scan_type: string;
  status: string;
  findings_count: number;
  created_at: string | null;
  owner_id: number | null;
  username: string;
  email: string;
  project_id: number | null;
  project_name: string;
};

type ScanStats = {
  total: number;
  today: number;
  last_7d: number;
  running: number;
  failed: number;
  total_findings: number;
  by_status: { status: string; count: number }[];
  by_type: { type: string; count: number }[];
  by_severity: { severity: string; count: number }[];
};

type Finding = {
  id: number;
  title: string;
  severity: string;
  description: string;
  location: string;
  recommendation: string;
  created_at: string | null;
};

function AdminScans() {
  const [me, setMe] = useState<any>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [scanTypes, setScanTypes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 25;

  const [detailScan, setDetailScan] = useState<Scan | null>(null);
  const [detailFindings, setDetailFindings] = useState<Finding[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const navigate = useNavigate();

  const loadScans = async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset: page * limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.scan_type = typeFilter;

      const [s, st] = await Promise.all([
        api.get("/admin/scans", { params }),
        api.get("/admin/scans/stats"),
      ]);
      setScans(s.data.scans);
      setStatuses(s.data.statuses);
      setScanTypes(s.data.scan_types);
      setTotal(s.data.total);
      setStats(st.data);
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل التحميل"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { navigate("/login"); return; }
    api.get("/auth/me")
      .then((r) => {
        if (r.data.role !== "admin") {
          localStorage.removeItem("admin_token");
          navigate("/login");
          return;
        }
        setMe(r.data);
        loadScans();
      })
      .catch(() => navigate("/login"));
    // eslint-disable-next-line
  }, [navigate]);

  useEffect(() => {
    if (me) loadScans();
    // eslint-disable-next-line
  }, [page]);

  const applyFilters = () => {
    setPage(0);
    loadScans();
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setPage(0);
    setTimeout(loadScans, 50);
  };

  const showDetails = async (scan: Scan) => {
    setDetailScan(scan);
    setDetailFindings([]);
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/scans/${scan.id}`);
      setDetailFindings(res.data.findings);
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل جلب التفاصيل"));
    } finally {
      setDetailLoading(false);
    }
  };

  const cancelScan = async (scan: Scan) => {
    if (!window.confirm(`إلغاء الفحص #${scan.id}؟`)) return;
    try {
      await api.post(`/admin/scans/${scan.id}/cancel`);
      setMsg(`✅ تمّ إلغاء الفحص #${scan.id}`);
      loadScans();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الإلغاء"));
    }
  };

  const deleteScan = async (scan: Scan) => {
    if (!window.confirm(`حذف الفحص #${scan.id} وكلّ ${scan.findings_count} ثغرة؟`)) return;
    try {
      await api.delete(`/admin/scans/${scan.id}`);
      setMsg(`🗑️ حُذف الفحص #${scan.id}`);
      loadScans();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الحذف"));
    }
  };

  const statusColor = (s: string): string => {
    const x = s.toLowerCase();
    if (x === "completed") return "#10b981";
    if (x === "running" || x === "pending" || x === "in_progress") return "#3b82f6";
    if (x === "failed") return "#dc2626";
    if (x === "cancelled") return "#64748b";
    return "#64748b";
  };

  const statusIcon = (s: string): string => {
    const x = s.toLowerCase();
    if (x === "completed") return "✅";
    if (x === "running" || x === "pending" || x === "in_progress") return "⏳";
    if (x === "failed") return "❌";
    if (x === "cancelled") return "🚫";
    return "❓";
  };

  const severityColor = (s: string): string => {
    const x = s.toLowerCase();
    if (x === "critical") return "#dc2626";
    if (x === "high") return "#f97316";
    if (x === "medium") return "#f59e0b";
    if (x === "low") return "#10b981";
    if (x === "info") return "#3b82f6";
    return "#64748b";
  };

  const severityIcon = (s: string): string => {
    const x = s.toLowerCase();
    if (x === "critical") return "🔴";
    if (x === "high") return "🟠";
    if (x === "medium") return "🟡";
    if (x === "low") return "🟢";
    if (x === "info") return "🔵";
    return "⚪";
  };

  const totalPages = Math.ceil(total / limit);

  if (!me) return null;

  return (
    <AdminLayout title="الفحوصات الأمنيّة" subtitle={`الإجمالي: ${total.toLocaleString("ar-EG")} فحص`}>
      {msg && (
        <div style={{
          padding: "12px 16px",
          marginBottom: 16,
          borderRadius: 10,
          background: msg.startsWith("⚠️") ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${msg.startsWith("⚠️") ? "#fecaca" : "#bbf7d0"}`,
          color: msg.startsWith("⚠️") ? "#dc2626" : "#16a34a",
          fontSize: 14,
          fontWeight: 500,
        }}>{msg}</div>
      )}

      {/* بطاقات إحصائيّة */}
      {stats && (
        <>
          <div style={styles.statsGrid}>
            <StatCard icon="🔍" label="إجماليّ الفحوصات" value={stats.total} color="#3b82f6" />
            <StatCard icon="📅" label="اليوم" value={stats.today} color="#10b981" />
            <StatCard icon="📆" label="آخر 7 أيّام" value={stats.last_7d} color="#8b5cf6" />
            <StatCard icon="⏳" label="قيد التشغيل" value={stats.running} color="#f59e0b" />
            <StatCard icon="❌" label="فشلت" value={stats.failed} color="#dc2626" />
            <StatCard icon="⚠️" label="إجماليّ الثغرات" value={stats.total_findings} color="#f97316" />
          </div>

          {/* توزيع الثغرات حسب الشدّة */}
          {stats.by_severity.length > 0 && (
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>🎯 توزيع الثغرات حسب الشدّة</h2>
              <div style={styles.severityGrid}>
                {stats.by_severity.map((s) => (
                  <div key={s.severity} style={{
                    ...styles.severityCard,
                    borderTop: `3px solid ${severityColor(s.severity)}`,
                  }}>
                    <div style={{ fontSize: 24 }}>{severityIcon(s.severity)}</div>
                    <div style={{ color: severityColor(s.severity), fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                      {s.severity}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>
                      {s.count.toLocaleString("ar-EG")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* الفلاتر */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="🔍 بحث بالمستخدم أو المشروع..."
            style={styles.input}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الحالات</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الأنواع</option>
            {scanTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={applyFilters} style={styles.btnPrimary}>🔎 تطبيق</button>
          <button onClick={resetFilters} style={styles.btnSecondary}>↻ إعادة</button>
        </div>
      </div>

      {/* الجدول */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>النوع</th>
                <th style={styles.th}>الحالة</th>
                <th style={styles.th}>المالك</th>
                <th style={styles.th}>المشروع</th>
                <th style={styles.th}>الثغرات</th>
                <th style={styles.th}>التاريخ</th>
                <th style={styles.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={styles.emptyCell}>⏳ جارٍ التحميل...</td></tr>
              ) : scans.length === 0 ? (
                <tr><td colSpan={8} style={styles.emptyCell}>لا توجد فحوصات</td></tr>
              ) : scans.map((s) => {
                const isRunning = ["running", "pending", "in_progress"].includes(s.status.toLowerCase());
                return (
                  <tr key={s.id} style={styles.tableRow}>
                    <td style={{ ...styles.td, color: "#94a3b8", fontSize: 13 }}>{s.id}</td>
                    <td style={styles.td}>
                      <span style={badge("#8b5cf6")}>{s.scan_type}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={badge(statusColor(s.status))}>
                        <span style={{ marginInlineEnd: 4 }}>{statusIcon(s.status)}</span>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{s.username}</td>
                    <td style={{ ...styles.td, color: "#475569" }}>{s.project_name}</td>
                    <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: s.findings_count > 0 ? "#f97316" : "#94a3b8" }}>
                      {s.findings_count}
                    </td>
                    <td style={{ ...styles.td, direction: "ltr", textAlign: "right", fontSize: 12, color: "#64748b" }}>
                      {s.created_at ? s.created_at.slice(0, 19).replace("T", " ") : "—"}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => showDetails(s)} style={btnMini("#3b82f6")} title="عرض التفاصيل">👁️</button>
                        {isRunning && (
                          <button onClick={() => cancelScan(s)} style={btnMini("#f59e0b")} title="إلغاء">🚫</button>
                        )}
                        <button onClick={() => deleteScan(s)} style={btnMini("#dc2626")} title="حذف">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{ ...styles.pageBtn, opacity: page === 0 ? 0.4 : 1 }}
            >
              → السابق
            </button>
            <span style={styles.pageInfo}>صفحة {page + 1} من {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              style={{ ...styles.pageBtn, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            >
              التالي ←
            </button>
          </div>
        )}
      </div>

      {/* نافذة التفاصيل */}
      {detailScan && (
        <div onClick={() => setDetailScan(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...styles.modalContent, maxWidth: 800 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div>
                <h3 style={styles.modalTitle}>🔍 فحص #{detailScan.id}</h3>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                  {detailScan.scan_type} · {detailScan.project_name} · {detailScan.username}
                </div>
              </div>
              <span style={badge(statusColor(detailScan.status))}>
                {statusIcon(detailScan.status)} {detailScan.status}
              </span>
            </div>

            <div style={{ padding: 14, background: "#f8fafc", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#475569" }}>
              <strong>الثغرات المكتشفة:</strong> {detailScan.findings_count} ·
              <strong style={{ marginInlineStart: 10 }}>التاريخ:</strong> {detailScan.created_at?.slice(0, 19).replace("T", " ")}
            </div>

            {detailLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>⏳ جاري تحميل الثغرات...</div>
            ) : detailFindings.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>✅ لا توجد ثغرات في هاذا الفحص</div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {detailFindings.map((f) => (
                  <div key={f.id} style={{
                    padding: 14,
                    background: "#f8fafc",
                    border: `1px solid ${severityColor(f.severity)}30`,
                    borderInlineStart: `4px solid ${severityColor(f.severity)}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
                        {severityIcon(f.severity)} {f.title}
                      </div>
                      <span style={badge(severityColor(f.severity))}>{f.severity}</span>
                    </div>
                    {f.location && (
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, direction: "ltr", textAlign: "right", fontFamily: "monospace" }}>
                        📍 {f.location}
                      </div>
                    )}
                    {f.description && (
                      <div style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.6 }}>
                        {f.description}
                      </div>
                    )}
                    {f.recommendation && (
                      <div style={{ marginTop: 10, padding: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 12, color: "#0369a1" }}>
                        💡 <strong>التوصية:</strong> {f.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setDetailScan(null)} style={styles.btnSecondary}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "#fff",
      padding: 20,
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      borderRight: `4px solid ${color}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a" }}>{value.toLocaleString("ar-EG")}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 },
  sectionCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: 700, margin: "0 0 14px 0" },
  severityGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 },
  severityCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, textAlign: "center" },
  filtersCard: { background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  filtersGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 },
  input: { padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, color: "#0f172a", outline: "none", fontSize: 14, fontFamily: "inherit", width: "100%" },
  btnPrimary: { padding: "10px 18px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 2px 8px rgba(59,130,246,0.25)" },
  btnSecondary: { padding: "10px 18px", background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  tableCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  tableHeadRow: { background: "#f8fafc" },
  th: { padding: "14px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { borderTop: "1px solid #f1f5f9" },
  td: { padding: "12px", fontSize: 14, color: "#334155" },
  emptyCell: { padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 14 },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: 16, padding: "16px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" },
  pageBtn: { padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#334155" },
  pageInfo: { fontSize: 13, color: "#64748b", fontWeight: 500 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalContent: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, direction: "rtl", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" },
  modalTitle: { margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 700 },
};

const btnMini = (color: string): React.CSSProperties => ({ padding: "6px 12px", background: `${color}15`, border: `1px solid ${color}40`, color, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 });

const badge = (color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", padding: "4px 12px", background: `${color}15`, color, border: `1px solid ${color}30`, borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" });

export default AdminScans;