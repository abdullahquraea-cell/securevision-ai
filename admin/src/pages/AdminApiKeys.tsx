import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type ApiKey = {
  id: number;
  name: string;
  key_prefix: string;
  scopes: string;
  rate_limit_per_min: number;
  usage_count: number;
  last_used_at: string | null;
  last_used_ip: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string | null;
  user_id: number | null;
  username: string;
  email: string;
  revoked_at: string | null;
};

type Stats = {
  total: number;
  active: number;
  revoked: number;
  total_usage: number;
  used_last_7d: number;
};

function AdminApiKeys() {
  const [me, setMe] = useState<any>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    name: "",
    scopes: "read",
    rate_limit_per_min: 60,
    expires_at: "",
  });

  // عرض المفتاح الجديد مرّة واحدة
  const [newKey, setNewKey] = useState<{ key: string; prefix: string } | null>(null);

  const navigate = useNavigate();

  const loadAll = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (activeFilter) params.is_active = activeFilter === "true";

      const [k, s, u] = await Promise.all([
        api.get("/admin/api-keys", { params }),
        api.get("/admin/api-keys/stats"),
        api.get("/admin/users", { params: { limit: 500 } }),
      ]);
      setKeys(k.data.keys);
      setTotal(k.data.total);
      setStats(s.data);
      setUsers(u.data.users);
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

  const handleCreate = async () => {
    if (!form.user_id || !form.name.trim()) {
      setMsg("⚠️ المستخدم والاسم مطلوبان");
      return;
    }
    try {
      const res = await api.post("/admin/api-keys", {
        user_id: parseInt(form.user_id),
        name: form.name,
        scopes: form.scopes,
        rate_limit_per_min: form.rate_limit_per_min,
        expires_at: form.expires_at || null,
      });
      setNewKey({ key: res.data.key, prefix: res.data.prefix });
      setShowCreate(false);
      setForm({ user_id: "", name: "", scopes: "read", rate_limit_per_min: 60, expires_at: "" });
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الإنشاء"));
    }
  };

  const handleRevoke = async (k: ApiKey) => {
    if (!window.confirm(`إلغاء المفتاح "${k.name}"؟\nسيتوقّف العمل فورًا.`)) return;
    try {
      await api.post(`/admin/api-keys/${k.id}/revoke`);
      setMsg(`🚫 تمّ إلغاء "${k.name}"`);
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الإلغاء"));
    }
  };

  const handleActivate = async (k: ApiKey) => {
    try {
      await api.post(`/admin/api-keys/${k.id}/activate`);
      setMsg(`✅ تمّ تفعيل "${k.name}"`);
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل التفعيل"));
    }
  };

  const handleDelete = async (k: ApiKey) => {
    if (!window.confirm(`حذف المفتاح "${k.name}" نهائيًّا؟`)) return;
    try {
      await api.delete(`/admin/api-keys/${k.id}`);
      setMsg(`🗑️ حُذف "${k.name}"`);
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الحذف"));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMsg("✅ تمّ نسخ المفتاح");
  };

  if (!me) return null;

  return (
    <AdminLayout title="إدارة مفاتيح API" subtitle={`الإجماليّ: ${total.toLocaleString("ar-EG")} مفتاح`}>
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

      {/* إحصائيّات */}
      {stats && (
        <div style={styles.statsGrid}>
          <StatCard icon="🔑" label="إجماليّ المفاتيح" value={stats.total} color="#3b82f6" />
          <StatCard icon="✅" label="نشطة" value={stats.active} color="#10b981" />
          <StatCard icon="🚫" label="ملغاة" value={stats.revoked} color="#dc2626" />
          <StatCard icon="📈" label="إجماليّ الاستخدامات" value={stats.total_usage} color="#8b5cf6" />
          <StatCard icon="⚡" label="نشطة آخر 7 أيّام" value={stats.used_last_7d} color="#f59e0b" />
        </div>
      )}

      {/* شريط الفلاتر */}
      <div style={styles.toolbar}>
        <div style={styles.filtersGrid}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadAll()}
            placeholder="🔍 بحث بالاسم، المستخدم، أو البادئة..."
            style={styles.input}
          />
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الحالات</option>
            <option value="true">نشطة</option>
            <option value="false">ملغاة</option>
          </select>
          <button onClick={loadAll} style={styles.btnPrimary}>🔎 تطبيق</button>
          <button onClick={() => setShowCreate(true)} style={styles.btnCreate}>➕ مفتاح جديد</button>
        </div>
      </div>

      {/* الجدول */}
      <div style={styles.tableCard}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>الاسم</th>
                <th style={styles.th}>المفتاح</th>
                <th style={styles.th}>المالك</th>
                <th style={styles.th}>الصلاحيّات</th>
                <th style={styles.th}>الحد/دقيقة</th>
                <th style={styles.th}>الاستخدامات</th>
                <th style={styles.th}>آخر استخدام</th>
                <th style={styles.th}>الحالة</th>
                <th style={styles.th}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={styles.emptyCell}>⏳ جارٍ التحميل...</td></tr>
              ) : keys.length === 0 ? (
                <tr><td colSpan={9} style={styles.emptyCell}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🔑</div>
                  <div>لا توجد مفاتيح API</div>
                  <button onClick={() => setShowCreate(true)} style={{ ...styles.btnPrimary, marginTop: 16 }}>
                    ➕ أنشئ أوّل مفتاح
                  </button>
                </td></tr>
              ) : keys.map((k) => (
                <tr key={k.id} style={styles.tableRow}>
                  <td style={{ ...styles.td, fontWeight: 600, color: "#0f172a" }}>{k.name}</td>
                  <td style={styles.td}>
                    <code style={styles.keyCode}>{k.key_prefix}•••••</code>
                  </td>
                  <td style={{ ...styles.td, color: "#475569" }}>{k.username}</td>
                  <td style={styles.td}>
                    <span style={badge("#8b5cf6")}>{k.scopes}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 600, color: "#3b82f6" }}>
                    {k.rate_limit_per_min}
                  </td>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700, color: "#10b981" }}>
                    {k.usage_count.toLocaleString("ar-EG")}
                  </td>
                  <td style={{ ...styles.td, fontSize: 12, color: "#64748b", direction: "ltr", textAlign: "right" }}>
                    {k.last_used_at ? k.last_used_at.slice(0, 16).replace("T", " ") : "لم يُستخدم"}
                  </td>
                  <td style={styles.td}>
                    {k.is_active ? (
                      <span style={badge("#10b981")}>● نشط</span>
                    ) : (
                      <span style={badge("#dc2626")}>✗ ملغي</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {k.is_active ? (
                        <button onClick={() => handleRevoke(k)} style={btnMini("#f59e0b")} title="إلغاء">🚫</button>
                      ) : (
                        <button onClick={() => handleActivate(k)} style={btnMini("#10b981")} title="تفعيل">▶️</button>
                      )}
                      <button onClick={() => handleDelete(k)} style={btnMini("#dc2626")} title="حذف">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal إنشاء */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={styles.modalContent}>
            <h3 style={styles.modalTitle}>➕ مفتاح API جديد</h3>

            <div style={{ marginTop: 16 }}>
              <label style={styles.label}>المستخدم *</label>
              <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} style={styles.input}>
                <option value="">اختر المستخدم...</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>اسم المفتاح *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={styles.input}
                placeholder="مثال: Production API Key"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <label style={styles.label}>الصلاحيّات</label>
                <select value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} style={styles.input}>
                  <option value="read">read (قراءة فقط)</option>
                  <option value="read,write">read,write (قراءة + كتابة)</option>
                  <option value="read,write,delete">كلّ الصلاحيّات</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>الحدّ الأقصى/دقيقة</label>
                <input
                  type="number"
                  value={form.rate_limit_per_min}
                  onChange={(e) => setForm({ ...form, rate_limit_per_min: parseInt(e.target.value) || 60 })}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>تاريخ الانتهاء (اختياريّ)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreate(false)} style={styles.btnSecondary}>إلغاء</button>
              <button onClick={handleCreate} style={styles.btnPrimary}>➕ إنشاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal المفتاح الجديد */}
      {newKey && (
        <div onClick={() => setNewKey(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...styles.modalContent, maxWidth: 560 }}>
            <h3 style={styles.modalTitle}>✅ تمّ إنشاء المفتاح</h3>

            <div style={{ marginTop: 20, padding: 16, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, color: "#92400e", fontSize: 13 }}>
              ⚠️ <strong>مهمّ:</strong> هاذه آخر مرّة سترى فيها هاذا المفتاح. انسخه الآن!
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={styles.label}>مفتاح API</label>
              <div style={styles.newKeyBox}>
                <code style={{ fontSize: 13, direction: "ltr", wordBreak: "break-all" }}>{newKey.key}</code>
              </div>
              <button
                onClick={() => copyToClipboard(newKey.key)}
                style={{ ...styles.btnPrimary, width: "100%", marginTop: 10 }}
              >
                📋 نسخ المفتاح
              </button>
            </div>

            <div style={{ marginTop: 20, padding: 14, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, fontSize: 13, color: "#0369a1" }}>
              💡 استخدم المفتاح في Header: <br />
              <code style={{ fontFamily: "monospace", direction: "ltr", display: "block", marginTop: 6 }}>
                Authorization: Bearer {newKey.key.slice(0, 20)}...
              </code>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setNewKey(null)} style={styles.btnSecondary}>تم</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "#fff", padding: 20, borderRadius: 14, border: "1px solid #e2e8f0",
      borderRight: `4px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a" }}>{value.toLocaleString("ar-EG")}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 },
  toolbar: { background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  filtersGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 },
  input: { padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, color: "#0f172a", outline: "none", fontSize: 14, fontFamily: "inherit", width: "100%" },
  btnPrimary: { padding: "10px 18px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 2px 8px rgba(59,130,246,0.25)" },
  btnCreate: { padding: "10px 18px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 2px 8px rgba(16,185,129,0.25)" },
  btnSecondary: { padding: "10px 18px", background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  tableCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1100 },
  tableHeadRow: { background: "#f8fafc" },
  th: { padding: "14px 12px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { borderTop: "1px solid #f1f5f9" },
  td: { padding: "12px", fontSize: 14, color: "#334155" },
  emptyCell: { padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 14 },
  keyCode: { background: "#f1f5f9", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontFamily: "monospace", color: "#475569", direction: "ltr", display: "inline-block" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalContent: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, direction: "rtl", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" },
  modalTitle: { margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 700 },
  label: { display: "block", color: "#475569", fontSize: 13, fontWeight: 600, marginBottom: 8 },
  newKeyBox: { padding: 14, background: "#0f172a", color: "#10b981", borderRadius: 10, border: "1px solid #334155", direction: "ltr", textAlign: "left", wordBreak: "break-all" },
};

const btnMini = (color: string): React.CSSProperties => ({ padding: "6px 12px", background: `${color}15`, border: `1px solid ${color}40`, color, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 });

const badge = (color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", padding: "4px 12px", background: `${color}15`, color, border: `1px solid ${color}30`, borderRadius: 20, fontSize: 11, fontWeight: 600 });

export default AdminApiKeys;