import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type Stats = {
  users: { total: number; verified: number; new_this_week: number; new_today: number };
  organizations: { total: number };
  projects: { total: number };
  scans: { total: number; today: number; this_week: number; completed: number; running: number; failed: number };
  findings: { total: number; critical: number; high: number; medium: number; low: number; info: number };
  subscriptions: { free: number; pro: number; enterprise: number };
  generated_at: string;
};

type Growth = { day: string; count: number }[];

function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<Growth>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, g] = await Promise.all([
        api.get("/admin/stats/overview"),
        api.get("/admin/stats/user-growth?days=30"),
      ]);
      setStats(s.data);
      setGrowth(g.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "فشل تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/login");
      return;
    }
    api.get("/auth/me")
      .then((r) => {
        if (r.data.role !== "admin") {
          localStorage.removeItem("admin_token");
          navigate("/login");
          return;
        }
        setUser(r.data);
        loadAll();
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        navigate("/login");
      });
    // eslint-disable-next-line
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      {/* الشريط العلوي */}
      <div style={{
        background: "#1e293b", borderBottom: "1px solid #334155",
        padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "16px" }}>SecureVision Admin</div>
            <div style={{ color: "#94a3b8", fontSize: "11px" }}>لوحة تحكّم المدير</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button onClick={loadAll} disabled={loading} style={{
            padding: "6px 14px", background: "#1e40af", border: "none", color: "#fff",
            borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px",
          }}>
            {loading ? "⏳" : "🔄 تحديث"}
          </button>
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>👤 {user.username}</span>
          <button onClick={logout} style={{
            padding: "6px 14px", background: "#7f1d1d33", border: "1px solid #dc2626",
            color: "#fca5a5", borderRadius: "8px", cursor: "pointer", fontSize: "13px",
          }}>🚪 خروج</button>
        </div>
      </div>

      {/* المحتوى */}
      <div style={{ padding: "30px 24px", maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ color: "#f8fafc", fontSize: "26px", marginBottom: "6px" }}>📊 نظرة عامّة</h1>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "24px" }}>
          {stats?.generated_at
            ? `آخر تحديث: ${new Date(stats.generated_at).toLocaleString("ar-EG")}`
            : "جارٍ التحميل..."}
        </p>

        {error && (
          <div style={{
            padding: "14px 18px", background: "#7f1d1d33", border: "1px solid #dc2626",
            borderRadius: "10px", color: "#fca5a5", marginBottom: "20px",
          }}>⚠️ {error}</div>
        )}

        {loading && !stats ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
            ⏳ جارٍ تحميل الإحصائيات...
          </div>
        ) : stats && (
          <>
            {/* الصفّ الأوّل — المستخدمون / المنظّمات / المشاريع / الفحوص */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <BigStat icon="👥" label="المستخدمون" value={stats.users.total} sub={`${stats.users.new_this_week} جديد هذا الأسبوع`} color="#3b82f6" />
              <BigStat icon="🏢" label="المنظّمات" value={stats.organizations.total} sub="—" color="#8b5cf6" />
              <BigStat icon="📁" label="المشاريع" value={stats.projects.total} sub="—" color="#06b6d4" />
              <BigStat icon="🔍" label="الفحوص" value={stats.scans.total} sub={`${stats.scans.today} اليوم`} color="#10b981" />
            </div>

            {/* رسم نموّ المستخدمين */}
            <Section title="📈 نموّ المستخدمين (آخر 30 يوم)">
              {growth.length === 0 ? (
                <p style={{ color: "#64748b", padding: "20px 0" }}>لا توجد بيانات كافية</p>
              ) : (
                <BarChart data={growth} />
              )}
            </Section>

            {/* الفحوص التفصيلية */}
            <Section title="🔍 تفاصيل الفحوص">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                <MiniStat label="مكتملة" value={stats.scans.completed} color="#10b981" />
                <MiniStat label="قيد التنفيذ" value={stats.scans.running} color="#f59e0b" />
                <MiniStat label="فاشلة" value={stats.scans.failed} color="#ef4444" />
                <MiniStat label="اليوم" value={stats.scans.today} color="#3b82f6" />
                <MiniStat label="هذا الأسبوع" value={stats.scans.this_week} color="#8b5cf6" />
              </div>
            </Section>

            {/* الثغرات حسب الخطورة */}
            <Section title="🐞 الثغرات حسب الخطورة">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                <MiniStat label="حرجة" value={stats.findings.critical} color="#dc2626" />
                <MiniStat label="عالية" value={stats.findings.high} color="#ea580c" />
                <MiniStat label="متوسّطة" value={stats.findings.medium} color="#ca8a04" />
                <MiniStat label="منخفضة" value={stats.findings.low} color="#16a34a" />
                <MiniStat label="معلومات" value={stats.findings.info} color="#0284c7" />
              </div>
            </Section>

            {/* الاشتراكات */}
            <Section title="💳 توزيع الاشتراكات">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <PlanCard name="Free" count={stats.subscriptions.free} color="#64748b" />
                <PlanCard name="Pro" count={stats.subscriptions.pro} color="#3b82f6" />
                <PlanCard name="Enterprise" count={stats.subscriptions.enterprise} color="#8b5cf6" />
              </div>
            </Section>

            {/* المستخدمون التفصيليون */}
            <Section title="👥 تفاصيل المستخدمين">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                <MiniStat label="الإجمالي" value={stats.users.total} color="#3b82f6" />
                <MiniStat label="مُفعَّلون" value={stats.users.verified} color="#10b981" />
                <MiniStat label="جدد اليوم" value={stats.users.new_today} color="#f59e0b" />
                <MiniStat label="جدد هذا الأسبوع" value={stats.users.new_this_week} color="#8b5cf6" />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// ============ Reusable Components ============

function BigStat({ icon, label, value, sub, color }: { icon: string; label: string; value: number; sub: string; color: string }) {
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155", borderRadius: "14px",
      padding: "22px", borderRight: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: "28px", marginBottom: "6px" }}>{icon}</div>
      <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "32px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>
        {value.toLocaleString()}
      </div>
      <div style={{ color: "#64748b", fontSize: "12px", marginTop: "6px" }}>{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #334155", borderRadius: "10px",
      padding: "14px", textAlign: "center",
    }}>
      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color, fontFamily: "monospace" }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function PlanCard({ name, count, color }: { name: string; count: number; color: string }) {
  return (
    <div style={{
      background: "#0f172a", border: `1px solid ${color}`, borderRadius: "12px",
      padding: "18px", textAlign: "center",
    }}>
      <div style={{ color: color, fontSize: "15px", fontWeight: 700, marginBottom: "8px" }}>{name}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>
        {count.toLocaleString()}
      </div>
      <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>مستخدم</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155", borderRadius: "14px",
      padding: "20px", marginBottom: "20px",
    }}>
      <h2 style={{ color: "#f8fafc", fontSize: "18px", marginBottom: "16px" }}>{title}</h2>
      {children}
    </div>
  );
}

function BarChart({ data }: { data: Growth }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 800;
  const height = 180;
  const barWidth = width / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", direction: "ltr" }}>
      {data.map((d, i) => {
        const h = (d.count / max) * (height - 40);
        const x = i * barWidth + 2;
        const y = height - h - 20;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth - 4} height={h} fill="#3b82f6" rx="2" />
            {d.count > 0 && (
              <text x={x + barWidth / 2 - 2} y={y - 4} fill="#94a3b8" fontSize="10" textAnchor="middle">
                {d.count}
              </text>
            )}
            {i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
              <text x={x + barWidth / 2 - 2} y={height - 4} fill="#64748b" fontSize="9" textAnchor="middle">
                {d.day.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default AdminDashboard;