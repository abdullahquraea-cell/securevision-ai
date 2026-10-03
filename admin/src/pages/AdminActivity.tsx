import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type Activity = {
  id: number;
  action: string;
  details: string;
  created_at: string | null;
  user_id: number | null;
  username: string;
};

type Stats = {
  total: number;
  last_24h: number;
  last_7d: number;
  last_30d: number;
  by_action: { action: string; count: number }[];
};

function AdminActivity() {
  const [me, setMe] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // فلاتر
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const navigate = useNavigate();

  const loadActivities = async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset: page * limit };
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo + " 23:59:59";

      const [a, s] = await Promise.all([
        api.get("/admin/activity", { params }),
        api.get("/admin/activity/stats"),
      ]);
      setActivities(a.data.activities);
      setActionTypes(a.data.action_types);
      setTotal(a.data.total);
      setStats(s.data);
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
        loadActivities();
      })
      .catch(() => navigate("/login"));
    // eslint-disable-next-line
  }, [navigate]);

  useEffect(() => {
    if (me) loadActivities();
    // eslint-disable-next-line
  }, [page]);

  const applyFilters = () => {
    setPage(0);
    loadActivities();
  };

  const resetFilters = () => {
    setSearch("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
    setTimeout(loadActivities, 50);
  };

  const actionColor = (action: string): string => {
    const a = action.toLowerCase();
    if (a.includes("login")) return "#10b981";
    if (a.includes("logout")) return "#64748b";
    if (a.includes("create")) return "#3b82f6";
    if (a.includes("update") || a.includes("edit")) return "#f59e0b";
    if (a.includes("delete")) return "#dc2626";
    if (a.includes("scan")) return "#8b5cf6";
    if (a.includes("register") || a.includes("signup")) return "#06b6d4";
    return "#64748b";
  };

  const actionIcon = (action: string): string => {
    const a = action.toLowerCase();
    if (a.includes("login")) return "🔐";
    if (a.includes("logout")) return "🚪";
    if (a.includes("create")) return "➕";
    if (a.includes("update") || a.includes("edit")) return "✏️";
    if (a.includes("delete")) return "🗑️";
    if (a.includes("scan")) return "🔍";
    if (a.includes("register") || a.includes("signup")) return "👤";
    return "📝";
  };

  const totalPages = Math.ceil(total / limit);

  if (!me) return null;

  return (
    <AdminLayout title="سجلّ النشاط" subtitle={`الإجماليّ: ${total.toLocaleString("ar-EG")} حدث`}>
      {msg && (
        <div style={{
          padding: "12px 16px",
          marginBottom: 16,
          borderRadius: 10,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#dc2626",
          fontSize: 14,
          fontWeight: 500,
        }}>{msg}</div>
      )}

      {/* بطاقات الإحصائيات */}
      {stats && (
        <div style={styles.statsGrid}>
          <StatCard icon="📊" label="الإجماليّ" value={stats.total} color="#3b82f6" />
          <StatCard icon="⏱️" label="آخر 24 ساعة" value={stats.last_24h} color="#10b981" />
          <StatCard icon="📅" label="آخر 7 أيّام" value={stats.last_7d} color="#8b5cf6" />
          <StatCard icon="🗓️" label="آخر 30 يوم" value={stats.last_30d} color="#f59e0b" />
        </div>
      )}

      {/* أكثر الأحداث شيوعًا */}
      {stats && stats.by_action.length > 0 && (
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>🔥 أكثر الأحداث شيوعًا (آخر 30 يوم)</h2>
          <div style={styles.actionChips}>
            {stats.by_action.map((a) => (
              <div key={a.action} style={{ ...styles.actionChip, borderColor: actionColor(a.action) + "40" }}>
                <span style={{ fontSize: 16 }}>{actionIcon(a.action)}</span>
                <span style={{ color: actionColor(a.action), fontWeight: 600 }}>{a.action}</span>
                <span style={styles.chipCount}>{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="🔍 بحث بالمستخدم، الحدث، أو الوصف..."
            style={styles.input}
          />
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الأحداث</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.input}
            title="من تاريخ"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={styles.input}
            title="إلى تاريخ"
          />
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
                <th style={styles.th}>الحدث</th>
                <th style={styles.th}>المستخدم</th>
                <th style={styles.th}>التفاصيل</th>
                <th style={styles.th}>التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={styles.emptyCell}>⏳ جارٍ التحميل...</td></tr>
              ) : activities.length === 0 ? (
                <tr><td colSpan={5} style={styles.emptyCell}>لا توجد أحداث مطابقة</td></tr>
              ) : activities.map((a) => (
                <tr key={a.id} style={styles.tableRow}>
                  <td style={{ ...styles.td, color: "#94a3b8", fontSize: 12 }}>{a.id}</td>
                  <td style={styles.td}>
                    <span style={actionBadge(actionColor(a.action))}>
                      <span style={{ marginInlineEnd: 6 }}>{actionIcon(a.action)}</span>
                      {a.action}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>
                    {a.username}
                    {a.user_id && <span style={styles.userIdTag}>#{a.user_id}</span>}
                  </td>
                  <td style={{ ...styles.td, color: "#475569", fontSize: 13 }}>{a.details || "—"}</td>
                  <td style={{ ...styles.td, direction: "ltr", textAlign: "right", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                    {a.created_at ? a.created_at.slice(0, 19).replace("T", " ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ترقيم الصفحات */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{ ...styles.pageBtn, opacity: page === 0 ? 0.4 : 1 }}
            >
              → السابق
            </button>
            <span style={styles.pageInfo}>
              صفحة {page + 1} من {totalPages}
            </span>
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
      <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{value.toLocaleString("ar-EG")}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  sectionCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 700,
    margin: "0 0 14px 0",
  },
  actionChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  actionChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    fontSize: 13,
  },
  chipCount: {
    background: "#fff",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    border: "1px solid #e2e8f0",
  },
  filtersCard: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  },
  input: {
    padding: "10px 14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    color: "#0f172a",
    outline: "none",
    fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
  },
  btnPrimary: {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    border: "none",
    color: "#fff",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    boxShadow: "0 2px 8px rgba(59,130,246,0.25)",
  },
  btnSecondary: {
    padding: "10px 18px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 800,
  },
  tableHeadRow: {
    background: "#f8fafc",
  },
  th: {
    padding: "14px 12px",
    textAlign: "right",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    borderBottom: "1px solid #e2e8f0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    borderTop: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px",
    fontSize: 14,
    color: "#334155",
  },
  emptyCell: {
    padding: 60,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
  },
  userIdTag: {
    marginInlineStart: 8,
    padding: "2px 8px",
    background: "#f1f5f9",
    color: "#64748b",
    borderRadius: 10,
    fontSize: 11,
    fontFamily: "monospace",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: "16px 20px",
    borderTop: "1px solid #f1f5f9",
    background: "#f8fafc",
  },
  pageBtn: {
    padding: "8px 16px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    color: "#334155",
  },
  pageInfo: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 500,
  },
};

const actionBadge = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 12px",
  background: `${color}15`,
  color: color,
  border: `1px solid ${color}30`,
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
});

export default AdminActivity;