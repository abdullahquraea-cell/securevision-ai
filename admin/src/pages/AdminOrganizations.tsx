import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type Org = {
  id: number;
  name: string;
  owner_id: number;
  owner_name: string;
  plan: string;
  created_at: string | null;
  member_count: number;
  project_count: number;
  scan_count: number;
};

function AdminOrganizations() {
  const [me, setMe] = useState<any>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [membersOrg, setMembersOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const navigate = useNavigate();

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (planFilter) params.plan = planFilter;
      const res = await api.get("/admin/organizations", { params });
      setOrgs(res.data.organizations);
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
        loadOrgs();
      })
      .catch(() => navigate("/login"));
    // eslint-disable-next-line
  }, [navigate]);

  const openEdit = (o: Org) => {
    setEditOrg(o);
    setEditName(o.name);
    setEditPlan(o.plan);
  };

  const saveEdit = async () => {
    if (!editOrg) return;
    try {
      await api.patch(`/admin/organizations/${editOrg.id}`, {
        name: editName,
        plan: editPlan,
      });
      setMsg("✅ تمّ التحديث");
      setEditOrg(null);
      loadOrgs();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل التحديث"));
    }
  };

  const deleteOrg = async (o: Org) => {
    if (!window.confirm(
      `حذف نهائي لمنظّمة "${o.name}"؟\n\n` +
      `• سيُحذف ${o.project_count} مشاريع و${o.scan_count} فحوص.\n` +
      `• ${o.member_count} أعضاء سيبقون كمستخدمين لكن بدون منظّمة.`
    )) return;
    try {
      await api.delete(`/admin/organizations/${o.id}`);
      setMsg(`🗑️ حُذفت ${o.name}`);
      loadOrgs();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الحذف"));
    }
  };

  const showMembers = async (o: Org) => {
    setMembersOrg(o);
    setMembers([]);
    try {
      const res = await api.get(`/admin/organizations/${o.id}/members`);
      setMembers(res.data);
    } catch { setMembers([]); }
  };

  if (!me) return null;

  return (
    <AdminLayout title="إدارة المنظّمات" subtitle={`الإجمالي: ${total} منظّمة`}>
      {/* شريط الفلاتر */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم المنظّمة..." style={styles.input} />
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الخطط</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button onClick={loadOrgs} style={styles.btnPrimary}>🔎 تطبيق</button>
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
                <th style={styles.th}>اسم المنظّمة</th>
                <th style={styles.th}>المالك</th>
                <th style={styles.th}>الخطّة</th>
                <th style={styles.th}>الأعضاء</th>
                <th style={styles.th}>المشاريع</th>
                <th style={styles.th}>الفحوص</th>
                <th style={styles.th}>التاريخ</th>
                <th style={styles.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={styles.emptyCell}>⏳ جارٍ التحميل...</td></tr>
              ) : orgs.length === 0 ? (
                <tr><td colSpan={9} style={styles.emptyCell}>لا توجد منظّمات</td></tr>
              ) : orgs.map((o) => (
                <tr key={o.id} style={styles.tableRow}>
                  <td style={styles.td}>{o.id}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{o.name}</td>
                  <td style={{ ...styles.td, fontSize: 13, color: "#64748b" }}>{o.owner_name}</td>
                  <td style={styles.td}>
                    <span style={badge(o.plan === "pro" ? "#3b82f6" : o.plan === "enterprise" ? "#8b5cf6" : "#64748b")}>
                      {o.plan}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "#3b82f6" }}>{o.member_count}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "#06b6d4" }}>{o.project_count}</td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "#10b981" }}>{o.scan_count}</td>
                  <td style={{ ...styles.td, fontSize: 12, color: "#94a3b8", direction: "ltr", textAlign: "right" }}>
                    {o.created_at ? o.created_at.slice(0, 10) : "—"}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openEdit(o)} style={btnMini("#3b82f6")} title="تعديل">✏️</button>
                      <button onClick={() => showMembers(o)} style={btnMini("#8b5cf6")} title="الأعضاء">👥</button>
                      <button onClick={() => deleteOrg(o)} style={btnMini("#dc2626")} title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة التعديل */}
      {editOrg && (
        <div onClick={() => setEditOrg(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
            <h3 style={styles.modalTitle}>✏️ تعديل: {editOrg.name}</h3>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>اسم المنظّمة</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} style={styles.input} />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>الخطّة (ستُطبّق علا كلّ الأعضاء)</label>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} style={styles.input}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setEditOrg(null)} style={styles.btnSecondary}>إلغاء</button>
              <button onClick={saveEdit} style={styles.btnPrimary}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الأعضاء */}
      {membersOrg && (
        <div onClick={() => setMembersOrg(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...styles.modalContent, maxWidth: 600 }}>
            <h3 style={styles.modalTitle}>👥 أعضاء: {membersOrg.name}</h3>
            {members.length === 0 ? (
              <p style={{ color: "#64748b", marginTop: 14 }}>لا يوجد أعضاء.</p>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto", marginTop: 14 }}>
                {members.map((m, i) => (
                  <div key={i} style={styles.memberRow}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{m.username}</div>
                      <div style={{ fontSize: 12, color: "#64748b", direction: "ltr", textAlign: "right" }}>{m.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={badge(m.org_role === "owner" ? "#8b5cf6" : "#3b82f6")}>{m.org_role || "member"}</span>
                      {m.is_verified
                        ? <span style={badge("#16a34a")}>✓</span>
                        : <span style={badge("#dc2626")}>✗</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setMembersOrg(null)} style={styles.btnSecondary}>إغلاق</button>
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
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
  memberRow: {
    padding: "14px 12px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8fafc",
    marginBottom: 6,
    borderRadius: 10,
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

export default AdminOrganizations;