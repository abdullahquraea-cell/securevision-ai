import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#dc2626", "#06b6d4", "#f97316"];

const severityColors: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#10b981",
  info: "#3b82f6",
  unknown: "#64748b",
};

const planColors: Record<string, string> = {
  free: "#64748b",
  pro: "#3b82f6",
  enterprise: "#8b5cf6",
};

function AdminAnalytics() {
  const [me, setMe] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [usersGrowth, setUsersGrowth] = useState<any[]>([]);
  const [scansTimeline, setScansTimeline] = useState<any[]>([]);
  const [plansDist, setPlansDist] = useState<any[]>([]);
  const [severityDist, setSeverityDist] = useState<any[]>([]);
  const [topScanners, setTopScanners] = useState<any[]>([]);
  const [activityByDay, setActivityByDay] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, ug, st, pd, sd, ts, ad, rt] = await Promise.all([
        api.get("/admin/analytics/summary"),
        api.get("/admin/analytics/users-growth?days=30"),
        api.get("/admin/analytics/scans-timeline?days=30"),
        api.get("/admin/analytics/plans-distribution"),
        api.get("/admin/analytics/severity-distribution"),
        api.get("/admin/analytics/top-scanners?limit=10"),
        api.get("/admin/analytics/activity-by-day"),
        api.get("/admin/analytics/revenue-trend"),
      ]);
      setSummary(s.data);
      setUsersGrowth(ug.data.data || []);
      setScansTimeline(st.data.data || []);
      setPlansDist(pd.data.data || []);
      setSeverityDist(sd.data.data || []);
      setTopScanners(ts.data.data || []);
      setActivityByDay(ad.data.data || []);
      setRevenueTrend(rt.data.data || []);
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
        loadAll();
      })
      .catch(() => navigate("/login"));
    // eslint-disable-next-line
  }, [navigate]);

  if (!me) return null;

  return (
    <AdminLayout title="التحليلات المتقدّمة" subtitle="رسوم بيانيّة ومؤشّرات الأداء">
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

      {/* KPIs */}
      {summary && (
        <div style={styles.kpiGrid}>
          <KPICard
            icon="👥"
            label="إجماليّ المستخدمين"
            value={summary.total_users}
            change={summary.growth_rate}
            color="#3b82f6"
          />
          <KPICard
            icon="📈"
            label="مستخدمون جدد (30 يوم)"
            value={summary.new_users_30d}
            color="#10b981"
          />
          <KPICard
            icon="🔍"
            label="فحوصات 30 يوم"
            value={summary.scans_30d}
            color="#8b5cf6"
          />
          <KPICard
            icon="🚨"
            label="ثغرات حرجة"
            value={summary.critical_count}
            color="#dc2626"
          />
          <KPICard
            icon="💰"
            label="مشتركون مدفوعون"
            value={summary.paid_users}
            color="#f59e0b"
          />
          <KPICard
            icon="🎯"
            label="معدّل التحويل"
            value={`${summary.conversion_rate}%`}
            color="#06b6d4"
          />
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>⏳ جارٍ التحميل...</div>
      ) : (
        <>
          {/* نموّ المستخدمين */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>📈 نموّ المستخدمين (آخر 30 يوم)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={usersGrowth}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="new" stroke="#3b82f6" fill="url(#colorNew)" name="جدد" />
                <Area type="monotone" dataKey="total" stroke="#8b5cf6" fill="url(#colorTotal)" name="المجموع" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* الفحوصات والثغرات */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>🔍 الفحوصات اليوميّة والثغرات المكتشفة</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scansTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={2} name="فحوصات" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="findings" stroke="#f97316" strokeWidth={2} name="ثغرات" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Charts */}
          <div style={styles.row2}>
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>🥧 توزيع المستخدمين حسب الخطّة</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={plansDist}
                    dataKey="count"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(e: any) => `${e.plan}: ${e.count}`}
                  >
                    {plansDist.map((entry, i) => (
                      <Cell key={i} fill={planColors[entry.plan] || COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>🎯 توزيع الثغرات حسب الشدّة</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={severityDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="severity" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="عدد الثغرات">
                    {severityDist.map((entry, i) => (
                      <Cell key={i} fill={severityColors[entry.severity] || "#64748b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* النشاط حسب اليوم */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>📅 النشاط حسب أيّام الأسبوع (آخر 30 يوم)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={activityByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#3b82f6" name="عدد الأحداث" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* اتّجاه الإيرادات */}
          {revenueTrend.length > 0 && (
            <div style={styles.chartCard}>
              <h2 style={styles.chartTitle}>💰 اتّجاه الإيرادات الشهريّ ($)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRevenue)" name="الإيراد ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Scanners */}
          <div style={styles.chartCard}>
            <h2 style={styles.chartTitle}>🏆 أكثر المستخدمين فحصًا (Top 10)</h2>
            {topScanners.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>لا توجد بيانات</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>المستخدم</th>
                      <th style={styles.th}>الخطّة</th>
                      <th style={styles.th}>عدد الفحوصات</th>
                      <th style={styles.th}>الثغرات المكتشفة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topScanners.map((u, i) => (
                      <tr key={u.id} style={styles.tableRow}>
                        <td style={{ ...styles.td, fontWeight: 700, color: i < 3 ? "#f59e0b" : "#64748b" }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{u.username}</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: "3px 10px",
                            background: (planColors[u.plan] || "#64748b") + "15",
                            color: planColors[u.plan] || "#64748b",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                          }}>{u.plan}</span>
                        </td>
                        <td style={{ ...styles.td, fontWeight: 700, color: "#3b82f6" }}>{u.scans}</td>
                        <td style={{ ...styles.td, fontWeight: 700, color: "#f97316" }}>{u.findings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function KPICard({ icon, label, value, change, color }: { icon: string; label: string; value: any; change?: number; color: string }) {
  return (
    <div style={{
      background: "#fff",
      padding: 20,
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      borderRight: `4px solid ${color}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 28 }}>{icon}</div>
        {change !== undefined && (
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 20,
            background: change >= 0 ? "#f0fdf4" : "#fef2f2",
            color: change >= 0 ? "#16a34a" : "#dc2626",
            border: `1px solid ${change >= 0 ? "#bbf7d0" : "#fecaca"}`,
          }}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
          </div>
        )}
      </div>
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 500, marginTop: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const styles: Record<string, React.CSSProperties> = {
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 },
  chartCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  chartTitle: { color: "#0f172a", fontSize: 16, fontWeight: 700, margin: "0 0 16px 0" },
  row2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20, marginBottom: 20 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 600 },
  tableHeadRow: { background: "#f8fafc" },
  th: { padding: "12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" },
  tableRow: { borderTop: "1px solid #f1f5f9" },
  td: { padding: "12px", fontSize: 14, color: "#334155" },
};

export default AdminAnalytics;