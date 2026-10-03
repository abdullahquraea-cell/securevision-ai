import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

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
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      <div style={topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/dashboard")} style={{
            background: "transparent", border: "1px solid #334155", color: "#94a3b8",
            padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px",
          }}>← رجوع</button>
          <span style={{ fontSize: "20px" }}>💳</span>
          <div style={{ fontWeight: 700, color: "#f8fafc" }}>الاشتراكات والإيرادات</div>
        </div>
        <div style={{ color: "#94a3b8", fontSize: "13px" }}>👤 {me.username}</div>
      </div>

      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        {msg && (
          <div style={{
            padding: "10px 14px", marginBottom: "14px", borderRadius: "8px",
            background: msg.startsWith("⚠️") ? "#7f1d1d33" : "#14532d33",
            border: `1px solid ${msg.startsWith("⚠️") ? "#dc2626" : "#16a34a"}`,
            color: msg.startsWith("⚠️") ? "#fca5a5" : "#86efac", fontSize: "13px",
          }}>{msg}</div>
        )}

        {/* بطاقات الإيرادات */}
        {revenue && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <RevenueCard icon="💵" label="MRR (دخل شهري)" value={`$${revenue.mrr.toLocaleString()}`} sub="يُحتسب تلقائياً" color="#10b981" />
              <RevenueCard icon="📈" label="ARR (دخل سنوي)" value={`$${revenue.arr.toLocaleString()}`} sub="MRR × 12" color="#3b82f6" />
              <RevenueCard icon="⭐" label="المشتركون الدافعون" value={revenue.total_paid_users.toLocaleString()} sub={`من ${revenue.total_users}`} color="#8b5cf6" />
              <RevenueCard icon="🎯" label="نسبة التحويل" value={`${revenue.conversion_rate}%`} sub="Free → Paid" color="#f59e0b" />
            </div>

            {/* توزيع الخطط */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "20px", marginBottom: "24px" }}>
              <h2 style={{ color: "#f8fafc", fontSize: "18px", marginBottom: "16px" }}>💰 توزيع الإيرادات حسب الخطّة</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <PlanRevenue name="Free" count={revenue.plans.free.count} price={revenue.plans.free.price} revenue={revenue.plans.free.revenue} color="#64748b" />
                <PlanRevenue name="Pro" count={revenue.plans.pro.count} price={revenue.plans.pro.price} revenue={revenue.plans.pro.revenue} color="#3b82f6" />
                <PlanRevenue name="Enterprise" count={revenue.plans.enterprise.count} price={revenue.plans.enterprise.price} revenue={revenue.plans.enterprise.revenue} color="#8b5cf6" />
              </div>
            </div>
          </>
        )}

        {/* فلتر */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={{ ...input, maxWidth: "200px" }}>
            <option value="">كلّ المشتركين</option>
            <option value="free">Free فقط</option>
            <option value="pro">Pro فقط</option>
            <option value="enterprise">Enterprise فقط</option>
          </select>
          <button onClick={loadAll} style={btnPrimary}>🔎 تطبيق</button>
        </div>

        {/* جدول المشتركين */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  <th style={th}>#</th>
                  <th style={th}>المستخدم</th>
                  <th style={th}>البريد</th>
                  <th style={th}>المنظّمة</th>
                  <th style={th}>الخطّة</th>
                  <th style={th}>السعر/شهر</th>
                  <th style={th}>التسجيل</th>
                  <th style={th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>⏳ جارٍ التحميل...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>لا نتائج</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid #334155" }}>
                    <td style={td}>{u.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{u.username}</td>
                    <td style={{ ...td, fontSize: "12px", color: "#94a3b8", direction: "ltr", textAlign: "right" }}>{u.email}</td>
                    <td style={{ ...td, fontSize: "12px", color: "#94a3b8" }}>{u.org_name}</td>
                    <td style={td}>
                      <span style={badge(u.plan === "pro" ? "#3b82f6" : u.plan === "enterprise" ? "#8b5cf6" : "#64748b")}>
                        {u.plan}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "center", fontFamily: "monospace", color: u.monthly_price > 0 ? "#10b981" : "#64748b" }}>
                      ${u.monthly_price}
                    </td>
                    <td style={{ ...td, fontSize: "11px", color: "#64748b", direction: "ltr", textAlign: "right" }}>
                      {u.created_at ? u.created_at.slice(0, 10) : "—"}
                    </td>
                    <td style={td}>
                      <button onClick={() => openEdit(u)} style={btnMini("#3b82f6")}>✏️ تغيير الخطّة</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editUser && (
        <div onClick={() => setEditUser(null)} style={modal}>
          <div onClick={(e) => e.stopPropagation()} style={modalContent}>
            <h3 style={{ marginTop: 0, color: "#f8fafc" }}>💳 تغيير خطّة: {editUser.username}</h3>
            <div style={{ marginTop: "14px" }}>
              <label style={label}>الخطّة الجديدة</label>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} style={input}>
                <option value="free">Free ($0)</option>
                <option value="pro">Pro ($29)</option>
                <option value="enterprise">Enterprise ($99)</option>
              </select>
            </div>
            <div style={{ marginTop: "12px", padding: "10px", background: "#0f172a", borderRadius: "8px", fontSize: "12px", color: "#94a3b8" }}>
              💡 ملاحظة: هذا تغيير يدوي داخلي. لن يُحاسب المستخدم تلقائياً — استعمله للترقيات المجّانية أو تصحيح يدوي.
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px", justifyContent: "flex-end" }}>
              <button onClick={() => setEditUser(null)} style={btnSecondary}>إلغاء</button>
              <button onClick={saveEdit} style={btnPrimary}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155", borderRadius: "14px",
      padding: "22px", borderRight: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: "28px", marginBottom: "6px" }}>{icon}</div>
      <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: "12px", marginTop: "6px" }}>{sub}</div>
    </div>
  );
}

function PlanRevenue({ name, count, price, revenue, color }: { name: string; count: number; price: number; revenue: number; color: string }) {
  return (
    <div style={{
      background: "#0f172a", border: `1px solid ${color}`, borderRadius: "12px",
      padding: "16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ color: color, fontSize: "15px", fontWeight: 700 }}>{name}</div>
        <div style={{ color: "#64748b", fontSize: "12px" }}>${price}/شهر</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: "11px" }}>عدد المشتركين</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>{count}</div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "#94a3b8", fontSize: "11px" }}>الإيراد</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>${revenue}</div>
        </div>
      </div>
    </div>
  );
}

const topBar: React.CSSProperties = { background: "#1e293b", borderBottom: "1px solid #334155", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const input: React.CSSProperties = { padding: "10px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", outline: "none", fontSize: "13px", fontFamily: "inherit", width: "100%" };
const btnPrimary: React.CSSProperties = { padding: "10px 16px", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 };
const btnSecondary: React.CSSProperties = { padding: "10px 16px", background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", cursor: "pointer", fontSize: "13px" };
const btnMini = (color: string): React.CSSProperties => ({ padding: "5px 10px", background: `${color}22`, border: `1px solid ${color}`, color: color, borderRadius: "6px", cursor: "pointer", fontSize: "12px" });
const th: React.CSSProperties = { padding: "12px 10px", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "#94a3b8", borderBottom: "1px solid #334155" };
const td: React.CSSProperties = { padding: "10px", fontSize: "13px", color: "#e2e8f0" };
const badge = (color: string): React.CSSProperties => ({ display: "inline-block", padding: "3px 10px", background: `${color}22`, color: color, border: `1px solid ${color}55`, borderRadius: "12px", fontSize: "11px", fontWeight: 600 });
const modal: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" };
const modalContent: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "480px", direction: "rtl" };
const label: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px" };

export default AdminSubscriptions;