import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

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
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      <div style={topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/dashboard")} style={{
            background: "transparent", border: "1px solid #334155", color: "#94a3b8",
            padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px",
          }}>← رجوع</button>
          <span style={{ fontSize: "20px" }}>🏢</span>
          <div style={{ fontWeight: 700, color: "#f8fafc" }}>إدارة المنظّمات</div>
        </div>
        <div style={{ color: "#94a3b8", fontSize: "13px" }}>👤 {me.username}</div>
      </div>

      <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 بحث باسم المنظّمة..." style={input} />
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={input}>
            <option value="">كلّ الخطط</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button onClick={loadOrgs} style={btnPrimary}>🔎 تطبيق</button>
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
          الإجمالي: {total} منظّمة
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  <th style={th}>#</th>
                  <th style={th}>اسم المنظّمة</th>
                  <th style={th}>المالك</th>
                  <th style={th}>الخطّة</th>
                  <th style={th}>الأعضاء</th>
                  <th style={th}>المشاريع</th>
                  <th style={th}>الفحوص</th>
                  <th style={th}>التاريخ</th>
                  <th style={th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>⏳ جارٍ التحميل...</td></tr>
                ) : orgs.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>لا توجد منظّمات</td></tr>
                ) : orgs.map((o) => (
                  <tr key={o.id} style={{ borderTop: "1px solid #334155" }}>
                    <td style={td}>{o.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{o.name}</td>
                    <td style={{ ...td, fontSize: "12px", color: "#94a3b8" }}>{o.owner_name}</td>
                    <td style={td}><span style={badge(o.plan === "pro" ? "#3b82f6" : o.plan === "enterprise" ? "#8b5cf6" : "#64748b")}>{o.plan}</span></td>
                    <td style={{ ...td, textAlign: "center", fontFamily: "monospace", color: "#3b82f6" }}>{o.member_count}</td>
                    <td style={{ ...td, textAlign: "center", fontFamily: "monospace", color: "#06b6d4" }}>{o.project_count}</td>
                    <td style={{ ...td, textAlign: "center", fontFamily: "monospace", color: "#10b981" }}>{o.scan_count}</td>
                    <td style={{ ...td, fontSize: "11px", color: "#64748b", direction: "ltr", textAlign: "right" }}>
                      {o.created_at ? o.created_at.slice(0, 10) : "—"}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <button onClick={() => openEdit(o)} style={btnMini("#3b82f6")}>✏️</button>
                        <button onClick={() => showMembers(o)} style={btnMini("#8b5cf6")}>👥</button>
                        <button onClick={() => deleteOrg(o)} style={btnMini("#dc2626")}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editOrg && (
        <div onClick={() => setEditOrg(null)} style={modal}>
          <div onClick={(e) => e.stopPropagation()} style={modalContent}>
            <h3 style={{ marginTop: 0, color: "#f8fafc" }}>✏️ تعديل: {editOrg.name}</h3>
            <div style={{ marginTop: "14px" }}>
              <label style={label}>اسم المنظّمة</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} style={input} />
            </div>
            <div style={{ marginTop: "14px" }}>
              <label style={label}>الخطّة (ستُطبّق على كلّ الأعضاء)</label>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} style={input}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px", justifyContent: "flex-end" }}>
              <button onClick={() => setEditOrg(null)} style={btnSecondary}>إلغاء</button>
              <button onClick={saveEdit} style={btnPrimary}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {membersOrg && (
        <div onClick={() => setMembersOrg(null)} style={modal}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalContent, maxWidth: "600px" }}>
            <h3 style={{ marginTop: 0, color: "#f8fafc" }}>👥 أعضاء: {membersOrg.name}</h3>
            {members.length === 0 ? (
              <p style={{ color: "#64748b" }}>لا يوجد أعضاء.</p>
            ) : (
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {members.map((m, i) => (
                  <div key={i} style={{ padding: "12px", borderBottom: "1px solid #334155" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#f8fafc" }}>{m.username}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", direction: "ltr", textAlign: "right" }}>{m.email}</div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span style={badge(m.org_role === "owner" ? "#8b5cf6" : "#3b82f6")}>{m.org_role || "member"}</span>
                        {m.is_verified
                          ? <span style={badge("#16a34a")}>✓</span>
                          : <span style={badge("#dc2626")}>✗</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: "16px", textAlign: "left" }}>
              <button onClick={() => setMembersOrg(null)} style={btnSecondary}>إغلاق</button>
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

export default AdminOrganizations;