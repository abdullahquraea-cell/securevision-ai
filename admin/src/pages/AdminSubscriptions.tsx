import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type SubUser = {
  id: number;
  username: string;
  email: string;
  plan: string;
  is_verified: boolean;
  created_at: string | null;
  org_name: string;
  monthly_price: number;
};

type Revenue = {
  plans: {
    free: { count: number; price: number; revenue: number };
    pro: { count: number; price: number; revenue: number };
    enterprise: { count: number; price: number; revenue: number };
  };
  mrr: number;
  arr: number;
  total_paid_users: number;
  total_users: number;
  conversion_rate: number;
};

function AdminSubscriptions() {
  const [me, setMe] = useState<any>(null);
  const [users, setUsers] = useState<SubUser[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [editUser, setEditUser] = useState<SubUser | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const navigate = useNavigate();

  const loadAll = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (planFilter) params.plan = planFilter;
      const [s, r] = await Promise.all([
        api.get("/admin/subscriptions", { params }),
        api.get("/admin/subscriptions/revenue"),
      ]);
      setUsers(s.data.users);
      setRevenue(r.data);
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

  const openEdit = (u: SubUser) => {
    setEditUser(u);
    setEditPlan(u.plan);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await api.patch(`/admin/subscriptions/${editUser.id}`, { plan: editPlan });
      setMsg(`✅ تمّ تحديث خطّة ${editUser.username}`);
      setEditUser(null);
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل التحديث"));
    }
  };

  if (!me) return null;

  return (
    <AdminLayout title="الاشتراكات والإيرادات" subtitle="إدارة خطط المستخدمين ومتابعة الإيرادات">
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

      {/* بطاقات الإيرادات */}
      {revenue && (
        <>
          <div style={styles.revenueGrid}>
            <RevenueCard icon="💵" label="MRR (دخل شهريّ)" value={`$${revenue.mrr.toLocaleString()}`} sub="يُحتسب تلقائيًّا" color="#10b981" />
            <RevenueCard icon="📈" label="ARR (دخل سنويّ)" value={`$${revenue.arr.toLocaleString()}`} sub="MRR × 12" color="#3b82f6" />
            <RevenueCard icon="⭐" label="المشتركون الدافعون" value={revenue.total_paid_users.toLocaleString()} sub={`من ${revenue.total_users}`} color="#8b5cf6" />
            <RevenueCard icon="🎯" label="نسبة التحويل" value={`${revenue.conversion_rate}%`} sub="Free → Paid" color="#f59e0b" />
          </div>

          {/* توزيع الخطط */}
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>💰 توزيع الإيرادات حسب الخطّة</h2>
            <div style={styles.plansGrid}>
              <PlanRevenue name="Free" count={revenue.plans.free.count} price={revenue.plans.free.price} revenue={revenue.plans.free.revenue} color="#64748b" />
              <PlanRevenue name="Pro" count={revenue.plans.pro.count} price={revenue.plans.pro.price} revenue={revenue.plans.pro.revenue} color="#3b82f6" />
              <PlanRevenue name="Enterprise" count={revenue.plans.enterprise.count} price={revenue.plans.enterprise.price} revenue={revenue.plans.enterprise.revenue} color="#8b5cf6" />
            </div>
          </div>
        </>
      )}

      {/* الفلتر */}
      <div style={styles.filtersCard}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={{ ...styles.input, maxWidth: 240 }}>
            <option value="">كلّ المشتركين</option>
            <option value="free">Free فقط</option>
            <option value="pro">Pro فقط</option>
            <option value="enterprise">Enterprise فقط</option>
          </select>
          <button onClick={loadAll} style={styles.btnPrimary}>🔎 تطبيق</button>
        </div>
      </div>

      {/* جدول المشتركين */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>المستخدم</th>
                <th style={styles.th}>البريد</th>
                <th style={styles.th}>المنظّمة</th>
                <th style={styles.th}>الخطّة</th>
                <th style={styles.th}>السعر/شهر</th>
                <th style={styles.th}>التسجيل</th>
                <th style={styles.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={styles.emptyCell}>⏳ جارٍ التحميل...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} style={styles.emptyCell}>لا نتائج</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} style={styles.tableRow}>
                  <td style={styles.td}>{u.id}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{u.username}</td>
                  <td style={{ ...styles.td, fontSize: 13, color: "#64748b", direction: "ltr", textAlign: "right" }}>{u.email}</td>
                  <td style={{ ...styles.td, fontSize: 13, color: "#64748b" }}>{u.org_name}</td>
                  <td style={styles.td}>
                    <span style={badge(u.plan === "pro" ? "#3b82f6" : u.plan === "enterprise" ? "#8b5cf6" : "#64748b")}>
                      {u.plan}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: u.monthly_price > 0 ? "#10b981" : "#94a3b8" }}>
                    ${u.monthly_price}
                  </td>
                  <td style={{ ...styles.td, fontSize: 12, color: "#94a3b8", direction: "ltr", textAlign: "right" }}>
                    {u.created_at ? u.created_at.slice(0, 10) : "—"}
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => openEdit(u)} style={btnMini("#3b82f6")}>✏️ تغيير الخطّة</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة التعديل */}
      {editUser && (
        <div onClick={() => setEditUser(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
            <h3 style={styles.modalTitle}>💳 تغيير خطّة: {editUser.username}</h3>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>الخطّة الجديدة</label>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} style={styles.input}>
                <option value="free">Free ($0)</option>
                <option value="pro">Pro ($29)</option>
                <option value="enterprise">Enterprise ($99)</option>
              </select>
            </div>
            <div style={styles.noteBox}>
              💡 ملاحظة: هاذا تغيير يدويّ داخليّ. لن يُحاسَب المستخدم تلقائيًّا — استعمله للترقيات المجّانيّة أو التصحيح اليدويّ.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setEditUser(null)} style={styles.btnSecondary}>إلغاء</button>
              <button onClick={saveEdit} style={styles.btnPrimary}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function RevenueCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 16,
      padding: 24,
      borderRight: `4px solid ${color}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>{value}</div>
      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function PlanRevenue({ name, count, price, revenue, color }: { name: string; count: number; price: number; revenue: number; color: string }) {
  return (
    <div style={{
      background: "#f8fafc",
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: 18,
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ color: color, fontSize: 16, fontWeight: 700 }}>{name}</div>
        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>${price}/شهر</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>عدد المشتركين</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{count}</div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>الإيراد</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>${revenue}</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  revenueGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  sectionCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 700,
    margin: "0 0 16px 0",
  },
  plansGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  filtersCard: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
    minWidth: 900,
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
    padding: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 28,
    width: "100%",
    maxWidth: 480,
    direction: "rtl",
    boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 700,
  },
  label: {
    display: "block",
    color: "#475569",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  },
  noteBox: {
    marginTop: 14,
    padding: 14,
    background: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: 10,
    fontSize: 13,
    color: "#0369a1",
    lineHeight: 1.6,
  },
};

const btnMini = (color: string): React.CSSProperties => ({
  padding: "7px 14px",
  background: `${color}15`,
  border: `1px solid ${color}40`,
  color: color,
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
});

const badge = (color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "4px 12px",
  background: `${color}15`,
  color: color,
  border: `1px solid ${color}30`,
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
});

export default AdminSubscriptions;