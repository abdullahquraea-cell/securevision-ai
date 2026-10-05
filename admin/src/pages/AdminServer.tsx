import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type ServerStats = {
  cpu: { percent: number; count: number; freq_mhz: number | null; load_avg: number[] };
  memory: { total_gb: number; used_gb: number; free_gb: number; percent: number };
  swap: { total_gb: number; used_gb: number; percent: number };
  disk: { total_gb: number; used_gb: number; free_gb: number; percent: number };
  network: { sent_mb: number; recv_mb: number };
  uptime_sec: number;
  timestamp: number;
};

type DbStats = {
  db_size_mb: number;
  pg_version: string;
  active_connections: number;
  table_count: number;
  tables: { name: string; size_mb: number; row_count: number }[];
};

type Process = {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
};

function AdminServer() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [msg, setMsg] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<any>(null);
  const navigate = useNavigate();

  const loadAll = async () => {
    try {
      const [s, d, p] = await Promise.all([
        api.get("/admin/server/stats"),
        api.get("/admin/server/db-stats"),
        api.get("/admin/server/processes?limit=10"),
      ]);
      setStats(s.data);
      setDbStats(d.data);
      setProcesses(p.data.processes || []);
      setLastUpdate(new Date());
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل التحميل"));
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

  useEffect(() => {
    if (!autoRefresh || !me) return;
    timerRef.current = setInterval(loadAll, 5000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [autoRefresh, me]);

  const formatUptime = (sec: number): string => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d} يوم ${h} ساعة`;
    if (h > 0) return `${h} ساعة ${m} دقيقة`;
    return `${m} دقيقة`;
  };

  const barColor = (percent: number): string => {
    if (percent >= 90) return "#dc2626";
    if (percent >= 75) return "#f97316";
    if (percent >= 50) return "#f59e0b";
    return "#10b981";
  };

  if (!me || !stats) {
    return (
      <AdminLayout title="مراقبة السيرفر" subtitle="تحميل الإحصائيّات...">
        <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>⏳ جارٍ التحميل...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="مراقبة السيرفر"
      subtitle={lastUpdate ? `آخر تحديث: ${lastUpdate.toLocaleTimeString("ar-EG")}` : "..."}
    >
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

      {/* شريط التحكّم */}
      <div style={styles.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={styles.liveDot}>
            <span style={{ ...styles.pulseDot, background: autoRefresh ? "#10b981" : "#94a3b8" }} />
            <span style={{ color: autoRefresh ? "#10b981" : "#64748b", fontWeight: 600, fontSize: 13 }}>
              {autoRefresh ? "LIVE - تحديث كلّ 5 ثواني" : "متوقّف"}
            </span>
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            ⏱️ Uptime: <strong style={{ color: "#0f172a" }}>{formatUptime(stats.uptime_sec)}</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={styles.btnSecondary}>
            {autoRefresh ? "⏸️ إيقاف" : "▶️ تشغيل"}
          </button>
          <button onClick={loadAll} style={styles.btnPrimary}>🔄 تحديث يدويّ</button>
        </div>
      </div>

      {/* الموارد الرئيسيّة */}
      <div style={styles.resourcesGrid}>
        <ResourceCard
          icon="🧠"
          title="المعالج (CPU)"
          percent={stats.cpu.percent}
          color={barColor(stats.cpu.percent)}
          detail={`${stats.cpu.count} أنوية${stats.cpu.freq_mhz ? ` · ${stats.cpu.freq_mhz} MHz` : ""}`}
          sub={stats.cpu.load_avg.length ? `Load: ${stats.cpu.load_avg.join(" / ")}` : ""}
        />
        <ResourceCard
          icon="💾"
          title="الذاكرة (RAM)"
          percent={stats.memory.percent}
          color={barColor(stats.memory.percent)}
          detail={`${stats.memory.used_gb} / ${stats.memory.total_gb} GB`}
          sub={`المتاح: ${stats.memory.free_gb} GB`}
        />
        <ResourceCard
          icon="💿"
          title="القرص الصلب (Disk)"
          percent={stats.disk.percent}
          color={barColor(stats.disk.percent)}
          detail={`${stats.disk.used_gb} / ${stats.disk.total_gb} GB`}
          sub={`المتاح: ${stats.disk.free_gb} GB`}
        />
        {stats.swap.total_gb > 0 && (
          <ResourceCard
            icon="📦"
            title="Swap"
            percent={stats.swap.percent}
            color={barColor(stats.swap.percent)}
            detail={`${stats.swap.used_gb} / ${stats.swap.total_gb} GB`}
            sub=""
          />
        )}
      </div>

      {/* الشبكة */}
      <div style={styles.sectionCard}>
        <h2 style={styles.sectionTitle}>🌐 حركة الشبكة (إجماليّ)</h2>
        <div style={styles.networkGrid}>
          <div style={styles.networkBox}>
            <div style={{ fontSize: 32 }}>📤</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>مُرسَل</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{stats.network.sent_mb.toLocaleString("ar-EG")} MB</div>
          </div>
          <div style={styles.networkBox}>
            <div style={{ fontSize: 32 }}>📥</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>مُستقبَل</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{stats.network.recv_mb.toLocaleString("ar-EG")} MB</div>
          </div>
        </div>
      </div>

      {/* قاعدة البيانات */}
      {dbStats && (
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>🗄️ قاعدة البيانات (PostgreSQL)</h2>
          <div style={styles.dbGrid}>
            <DbStat icon="📊" label="الحجم الإجماليّ" value={`${dbStats.db_size_mb} MB`} color="#3b82f6" />
            <DbStat icon="📋" label="عدد الجداول" value={dbStats.table_count.toString()} color="#8b5cf6" />
            <DbStat icon="🔗" label="اتّصالات نشطة" value={dbStats.active_connections.toString()} color="#10b981" />
            <DbStat icon="⚙️" label="النسخة" value={dbStats.pg_version.split(" ")[0]} color="#f59e0b" />
          </div>

          <h3 style={{ ...styles.sectionTitle, fontSize: 15, marginTop: 20, marginBottom: 12 }}>📋 الجداول (حسب الحجم)</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>الجدول</th>
                  <th style={styles.th}>الحجم</th>
                  <th style={styles.th}>عدد الصفوف</th>
                  <th style={styles.th}>النسبة</th>
                </tr>
              </thead>
              <tbody>
                {dbStats.tables.map((t) => {
                  const pct = dbStats.db_size_mb > 0 ? (t.size_mb / dbStats.db_size_mb) * 100 : 0;
                  return (
                    <tr key={t.name} style={styles.tableRow}>
                      <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{t.name}</td>
                      <td style={{ ...styles.td, fontFamily: "monospace", direction: "ltr", textAlign: "right" }}>{t.size_mb} MB</td>
                      <td style={{ ...styles.td, color: "#3b82f6", fontWeight: 600 }}>{t.row_count.toLocaleString("ar-EG")}</td>
                      <td style={styles.td}>
                        <div style={styles.pctBarWrap}>
                          <div style={{ ...styles.pctBar, width: `${Math.min(100, pct)}%`, background: "#8b5cf6" }} />
                          <span style={styles.pctText}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* أعلى العمليّات */}
      {processes.length > 0 && (
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>🔥 أعلى العمليّات (CPU)</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>PID</th>
                  <th style={styles.th}>الاسم</th>
                  <th style={styles.th}>CPU %</th>
                  <th style={styles.th}>RAM %</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p) => (
                  <tr key={p.pid} style={styles.tableRow}>
                    <td style={{ ...styles.td, fontFamily: "monospace", color: "#94a3b8" }}>{p.pid}</td>
                    <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{p.name}</td>
                    <td style={styles.td}>
                      <span style={{ color: barColor(p.cpu_percent), fontWeight: 700 }}>{p.cpu_percent}%</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: barColor(p.memory_percent), fontWeight: 700 }}>{p.memory_percent}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function ResourceCard({ icon, title, percent, color, detail, sub }: { icon: string; title: string; percent: number; color: string; detail: string; sub: string }) {
  return (
    <div style={{
      background: "#fff",
      padding: 20,
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 28 }}>{icon}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{percent.toFixed(1)}%</div>
      </div>
      <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{detail}</div>
      <div style={{ marginTop: 12, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, percent)}%`, height: "100%", background: color, transition: "width 0.5s ease" }} />
      </div>
      {sub && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function DbStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "#f8fafc",
      padding: 16,
      borderRadius: 12,
      border: `1px solid ${color}30`,
      borderTop: `3px solid ${color}`,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: { background: "#fff", padding: "14px 20px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  liveDot: { display: "flex", alignItems: "center", gap: 8 },
  pulseDot: { width: 10, height: 10, borderRadius: "50%", animation: "pulse 2s infinite" },
  resourcesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 },
  sectionCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: 700, margin: "0 0 14px 0" },
  networkGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  networkBox: { background: "#f8fafc", padding: 20, borderRadius: 12, textAlign: "center", border: "1px solid #e2e8f0" },
  dbGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 500 },
  tableHeadRow: { background: "#f8fafc" },
  th: { padding: "12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { borderTop: "1px solid #f1f5f9" },
  td: { padding: "10px 12px", fontSize: 13, color: "#334155" },
  pctBarWrap: { position: "relative", height: 20, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", minWidth: 100 },
  pctBar: { height: "100%", transition: "width 0.5s ease" },
  pctText: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 11, fontWeight: 600, color: "#0f172a" },
  btnPrimary: { padding: "8px 16px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  btnSecondary: { padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500 },
};

export default AdminServer;