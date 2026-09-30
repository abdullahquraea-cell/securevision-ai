import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

type UserRow = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_verified: boolean;
  subscription_plan: string;
  created_at: string | null;
  organization_id: number | null;
};

function AdminUsers() {
  const [me, setMe] = useState<any>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [editPlan, setEditPlan] = useState("");
  const [activityUser, setActivityUser] = useState<UserRow | null>(null);
  const [activityRows, setActivityRows] = useState<any[]>([]);
  const navigate = useNavigate();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (verifiedFilter) params.verified = verifiedFilter === "true";
      if (planFilter) params.plan = planFilter;
      const res = await api.get("/admin/users", { params });
      setUsers(res.data.users);
      setTotal(res.data.total);
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
        loadUsers();
      })
      .catch(() => navigate("/login"));
    // eslint-disable-next-line
  }, [navigate]);

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditVerified(u.is_verified);
    setEditPlan(u.subscription_plan);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await api.patch(`/admin/users/${editUser.id}`, {
        role: editRole, is_verified: editVerified, subscription_plan: editPlan,
      });
      setMsg("✅ تمّ التحديث");
      setEditUser(null);
      loadUsers();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل التحديث"));
    }
  };

  const deleteUser = async (u: UserRow) => {
    if (!window.confirm(`حذف نهائي للمستخدم "${u.username}" وكلّ بياناته؟`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      setMsg(`🗑️ حُذف ${u.username}`);
      loadUsers();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الحذف"));
    }
  };

  const showActivity = async (u: UserRow) => {
    setActivityUser(u);
    setActivityRows([]);
    try {
      const res = await api.get(`/admin/users/${u.id}/activity`);
      setActivityRows(res.data);
    } catch { setActivityRows([]); }
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
          <span style={{ fontSize: "20px" }}>👥</span>
          <div style={{ fontWeight: 700, color: "#f8fafc" }}>إدارة المستخدمين</div>
        </div>
        <div style={{ color: "#94a3b8", fontSize: "13px" }}>👤 {me.username}</div>
      </div>

      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث..." style={input} />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={input}>
            <option value="">كلّ الأدوار</option>
            <option value="admin">admin</option>
            <option value="analyst">analyst</option>
            <option value="viewer">viewer</option>
          </select>
          <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} style={input}>
            <option value="">كلّ الحالات</option>
            <option value="true">مُفعَّل</option>
            <option value="false">غير مُفعَّل</option>
          </select>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={input}>
            <option value="">كلّ الخطط</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button onClick={loadUsers} style={btnPrimary}>🔎 تطبيق</button>
        </div>

        {msg && (
          <div style={{
            padding: "10px 14px", marginBottom: "14px", borderRadius: "8px",
            background: msg.startsWith("⚠️") ? "#7f1d1d33" : "#14532d33",
            border: `1px solid ${msg.startsWith("⚠️") ? "#dc2626" : "#16a34a"}`,
            color: msg.startsWith("⚠️") ? "#fca5a5" : "#86efac", fontSize: "13px",
          }}>{msg}</div>
        )}

        <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "10px" }}>
          الإجمالي: {total} · معروض: {users.length}
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  <th style={th}>#</th>
                  <th style={th}>اسم المستخدم</th>
                  <th style={th}>البريد</th>
                  <th style={th}>الدور</th>
                  <th style={th}>الحالة</th>
                  <th style={th}>الخطّة</th>
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
                    <td style={{ ...td, fontWeight: 600 }}>
                      {u.username}
                      {u.id === me.id && <span style={{ color: "#3b82f6", fontSize: "11px", marginInlineStart: "6px" }}>(أنت)</span>}
                    </td>
                    <td style={{ ...td, direction: "ltr", textAlign: "right", fontSize: "12px", color: "#94a3b8" }}>{u.email}</td>
                    <td style={td}><span style={badge(u.role === "admin" ? "#8b5cf6" : "#3b82f6")}>{u.role}</span></td>
                    <td style={td}>{u.is_verified
                      ? <span style={badge("#16a34a")}>✓ مُفعَّل</span>
                      : <span style={badge("#dc2626")}>✗ غير مُفعَّل</span>}</td>
                    <td style={td}><span style={badge(u.subscription_plan === "pro" ? "#3b82f6" : u.subscription_plan === "enterprise" ? "#8b5cf6" : "#64748b")}>{u.subscription_plan}</span></td>
                    <td style={{ ...td, fontSize: "11px", color: "#64748b", direction: "ltr", textAlign: "right" }}>
                      {u.created_at ? u.created_at.slice(0, 10) : "—"}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <button onClick={() => openEdit(u)} style={btnMini("#3b82f6")}>✏️</button>
                        <button onClick={() => showActivity(u)} style={btnMini("#8b5cf6")}>📜</button>
                        <button onClick={() => deleteUser(u)} disabled={u.id === me.id} style={btnMini(u.id === me.id ? "#475569" : "#dc2626")}>🗑️</button>
                      </div>
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
            <h3 style={{ marginTop: 0, color: "#f8fafc" }}>✏️ تعديل: {editUser.username}</h3>
            <div style={{ marginTop: "14px" }}>
              <label style={label}>الدور</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={input}>
                <option value="viewer">viewer</option>
                <option value="analyst">analyst</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div style={{ marginTop: "14px" }}>
              <label style={{ ...label, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={editVerified} onChange={(e) => setEditVerified(e.target.checked)} />
                <span>مُفعَّل (Verified)</span>
              </label>
            </div>
            <div style={{ marginTop: "14px" }}>
              <label style={label}>الخطّة</label>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} style={input}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px", justifyContent: "flex-end" }}>
              <button onClick={() => setEditUser(null)} style={btnSecondary}>إلغاء</button>
              <button onClick={saveEdit} style={btnPrimary}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {activityUser && (
        <div onClick={() => setActivityUser(null)} style={modal}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalContent, maxWidth: "600px" }}>
            <h3 style={{ marginTop: 0, color: "#f8fafc" }}>📜 نشاط: {activityUser.username}</h3>
            {activityRows.length === 0 ? (
              <p style={{ color: "#64748b" }}>لا يوجد نشاط مسجّل.</p>
            ) : (
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {activityRows.map((a, i) => (
                  <div key={i} style={{ padding: "10px", borderBottom: "1px solid #334155" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>{a.action}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{a.description}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>{a.created_at}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: "16px", textAlign: "left" }}>
              <button onClick={() => setActivityUser(null)} style={btnSecondary}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const topBar: React.CSSProperties = { background: "#1e293b", borderBottom: "1px solid #334155", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const input: React.CSSProperties = { padding: "10px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", outline: "none", fontSize: "13px", fontFamily: "inherit", width: "100%" };
const btnPrimary: React.CSSProperties = { padding: "10px 16px", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 };
const btnSecondary: React.CSSProperties = { padding: "10px 16px", background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", cursor: "pointer", fontSize: "13px" };
const btnMini = (color: string): React.CSSProperties => ({ padding: "5px 10px", background: `${color}22`, border: `1px solid ${color}`, color: color, borderRadius: "6px", cursor: "pointer", fontSize: "13px" });
const th: React.CSSProperties = { padding: "12px 10px", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "#94a3b8", borderBottom: "1px solid #334155" };
const td: React.CSSProperties = { padding: "10px", fontSize: "13px", color: "#e2e8f0" };
const badge = (color: string): React.CSSProperties => ({ display: "inline-block", padding: "3px 10px", background: `${color}22`, color: color, border: `1px solid ${color}55`, borderRadius: "12px", fontSize: "11px", fontWeight: 600 });
const modal: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" };
const modalContent: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "480px", direction: "rtl" };
const label: React.CSSProperties = { display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px" };

export default AdminUsers;