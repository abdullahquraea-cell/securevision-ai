import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

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
    <AdminLayout title="إدارة المستخدمين" subtitle={`الإجمالي: ${total} · معروض: ${users.length}`}>
      {/* شريط الفلاتر */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث بالاسم أو البريد..." style={styles.input} />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الأدوار</option>
            <option value="admin">admin</option>
            <option value="analyst">analyst</option>
            <option value="viewer">viewer</option>
          </select>
          <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الحالات</option>
            <option value="true">مُفعَّل</option>
            <option value="false">غير مُفعَّل</option>
          </select>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الخطط</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button onClick={loadUsers} style={styles.btnPrimary}>🔎 تطبيق</button>
        </div>
      </div>

      {/* رسالة */}
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

      {/* الجدول */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>اسم المستخدم</th>
                <th style={styles.th}>البريد</th>
                <th style={styles.th}>الدور</th>
                <th style={styles.th}>الحالة</th>
                <th style={styles.th}>الخطّة</th>
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
                  <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>
                    {u.username}
                    {u.id === me.id && <span style={styles.youTag}>(أنت)</span>}
                  </td>
                  <td style={{ ...styles.td, direction: "ltr", textAlign: "right", fontSize: 12, color: "#64748b" }}>{u.email}</td>
                  <td style={styles.td}><span style={badge(u.role === "admin" ? "#8b5cf6" : "#3b82f6")}>{u.role}</span></td>
                  <td style={styles.td}>
                    {u.is_verified
                      ? <span style={badge("#16a34a")}>✓ مُفعَّل</span>
                      : <span style={badge("#dc2626")}>✗ غير مُفعَّل</span>}
                  </td>
                  <td style={styles.td}>
                    <span style={badge(u.subscription_plan === "pro" ? "#3b82f6" : u.subscription_plan === "enterprise" ? "#8b5cf6" : "#64748b")}>
                      {u.subscription_plan}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontSize: 12, color: "#64748b", direction: "ltr", textAlign: "right" }}>
                    {u.created_at ? u.created_at.slice(0, 10) : "—"}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openEdit(u)} style={btnMini("#3b82f6")} title="تعديل">✏️</button>
                      <button onClick={() => showActivity(u)} style={btnMini("#8b5cf6")} title="النشاط">📜</button>
                      <button onClick={() => deleteUser(u)} disabled={u.id === me.id} style={btnMini(u.id === me.id ? "#cbd5e1" : "#dc2626")} title="حذف">🗑️</button>
                    </div>
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
            <h3 style={styles.modalTitle}>✏️ تعديل: {editUser.username}</h3>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>الدور</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={styles.input}>
                <option value="viewer">viewer</option>
                <option value="analyst">analyst</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={editVerified} onChange={(e) => setEditVerified(e.target.checked)} />
                <span>مُفعَّل (Verified)</span>
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>الخطّة</label>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} style={styles.input}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setEditUser(null)} style={styles.btnSecondary}>إلغاء</button>
              <button onClick={saveEdit} style={styles.btnPrimary}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة النشاط */}
      {activityUser && (
        <div onClick={() => setActivityUser(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...styles.modalContent, maxWidth: 600 }}>
            <h3 style={styles.modalTitle}>📜 نشاط: {activityUser.username}</h3>
            {activityRows.length === 0 ? (
              <p style={{ color: "#64748b", marginTop: 14 }}>لا يوجد نشاط مسجّل.</p>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto", marginTop: 14 }}>
                {activityRows.map((a, i) => (
                  <div key={i} style={styles.activityRow}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{a.action}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{a.description}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{a.created_at}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setActivityUser(null)} style={styles.btnSecondary}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    transition: "background 0.15s",
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
  youTag: {
    color: "#3b82f6",
    fontSize: 11,
    marginInlineStart: 6,
    fontWeight: 500,
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
  activityRow: {
    padding: "12px 0",
    borderBottom: "1px solid #f1f5f9",
  },
};

const btnMini = (color: string): React.CSSProperties => ({
  padding: "6px 12px",
  background: `${color}15`,
  border: `1px solid ${color}40`,
  color: color,
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
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

export default AdminUsers;