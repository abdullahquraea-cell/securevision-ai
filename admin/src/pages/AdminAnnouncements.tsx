import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type Announcement = {
  id: number;
  title: string;
  message: string;
  type: string;
  target: string;
  is_active: boolean;
  scheduled_at: string | null;
  expires_at: string | null;
  created_by: number | null;
  created_by_username: string;
  created_at: string | null;
  reads_count: number;
};

type Stats = {
  total: number;
  active: number;
  total_reads: number;
  scheduled: number;
};

const typeMeta: Record<string, { label: string; color: string; icon: string }> = {
  info: { label: "معلومة", color: "#3b82f6", icon: "ℹ️" },
  success: { label: "نجاح", color: "#10b981", icon: "✅" },
  warning: { label: "تحذير", color: "#f59e0b", icon: "⚠️" },
  danger: { label: "خطر", color: "#dc2626", icon: "🚨" },
};

const targetMeta: Record<string, string> = {
  all: "كلّ المستخدمين",
  "plan:free": "خطّة Free",
  "plan:pro": "خطّة Pro",
  "plan:enterprise": "خطّة Enterprise",
  "role:admin": "المديرون فقط",
  "role:analyst": "المحلّلون",
  "role:viewer": "المشاهدون",
};

function AdminAnnouncements() {
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [modal, setModal] = useState<Announcement | "new" | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info",
    target: "all",
    is_active: true,
    scheduled_at: "",
    expires_at: "",
  });

  const navigate = useNavigate();

  const loadAll = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (activeFilter) params.is_active = activeFilter === "true";

      const [a, s] = await Promise.all([
        api.get("/admin/announcements", { params }),
        api.get("/admin/announcements/stats"),
      ]);
      setItems(a.data.announcements);
      setTotal(a.data.total);
      setStats(s.data);
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

  const openNew = () => {
    setForm({ title: "", message: "", type: "info", target: "all", is_active: true, scheduled_at: "", expires_at: "" });
    setModal("new");
  };

  const openEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      target: a.target,
      is_active: a.is_active,
      scheduled_at: a.scheduled_at ? a.scheduled_at.slice(0, 16) : "",
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : "",
    });
    setModal(a);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setMsg("⚠️ العنوان والرسالة مطلوبان");
      return;
    }
    try {
      const payload: any = {
        title: form.title,
        message: form.message,
        type: form.type,
        target: form.target,
        is_active: form.is_active,
        scheduled_at: form.scheduled_at || null,
        expires_at: form.expires_at || null,
      };
      if (modal === "new") {
        await api.post("/admin/announcements", payload);
        setMsg("✅ تمّ إنشاء الإعلان");
      } else if (modal) {
        await api.patch(`/admin/announcements/${modal.id}`, payload);
        setMsg("✅ تمّ التحديث");
      }
      setModal(null);
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الحفظ"));
    }
  };

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm(`حذف الإعلان "${a.title}"؟`)) return;
    try {
      await api.delete(`/admin/announcements/${a.id}`);
      setMsg(`🗑️ حُذف "${a.title}"`);
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الحذف"));
    }
  };

  const toggleActive = async (a: Announcement) => {
    try {
      await api.patch(`/admin/announcements/${a.id}`, { is_active: !a.is_active });
      loadAll();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل التبديل"));
    }
  };

  if (!me) return null;

  return (
    <AdminLayout title="الإعلانات والإشعارات" subtitle={`الإجماليّ: ${total.toLocaleString("ar-EG")} إعلان`}>
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
          <StatCard icon="📢" label="إجماليّ الإعلانات" value={stats.total} color="#3b82f6" />
          <StatCard icon="✅" label="النشطة" value={stats.active} color="#10b981" />
          <StatCard icon="📅" label="المجدولة" value={stats.scheduled} color="#8b5cf6" />
          <StatCard icon="👁️" label="إجماليّ القراءات" value={stats.total_reads} color="#f59e0b" />
        </div>
      )}

      {/* شريط الفلاتر + زرّ الإنشاء */}
      <div style={styles.toolbar}>
        <div style={styles.filtersGrid}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadAll()}
            placeholder="🔍 بحث..."
            style={styles.input}
          />
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} style={styles.input}>
            <option value="">كلّ الحالات</option>
            <option value="true">النشطة فقط</option>
            <option value="false">المعطّلة فقط</option>
          </select>
          <button onClick={loadAll} style={styles.btnPrimary}>🔎 تطبيق</button>
          <button onClick={openNew} style={styles.btnCreate}>➕ إعلان جديد</button>
        </div>
      </div>

      {/* قائمة الإعلانات */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>⏳ جارٍ التحميل...</div>
      ) : items.length === 0 ? (
        <div style={styles.emptyBox}>
          <div style={{ fontSize: 48 }}>📭</div>
          <div style={{ fontSize: 16, color: "#64748b", marginTop: 10 }}>لا توجد إعلانات</div>
          <button onClick={openNew} style={{ ...styles.btnPrimary, marginTop: 16 }}>➕ أنشئ أوّل إعلان</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((a) => {
            const meta = typeMeta[a.type] || typeMeta.info;
            return (
              <div key={a.id} style={{ ...styles.card, borderInlineStart: `4px solid ${meta.color}` }}>
                <div style={styles.cardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <span style={{ fontSize: 24 }}>{meta.icon}</span>
                    <div>
                      <h3 style={styles.cardTitle}>{a.title}</h3>
                      <div style={styles.cardMeta}>
                        <span style={badge(meta.color)}>{meta.label}</span>
                        <span style={badge("#64748b")}>🎯 {targetMeta[a.target] || a.target}</span>
                        {a.is_active ? (
                          <span style={badge("#10b981")}>● نشط</span>
                        ) : (
                          <span style={badge("#94a3b8")}>○ معطّل</span>
                        )}
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          👁️ {a.reads_count} قراءة
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => toggleActive(a)} style={btnMini(a.is_active ? "#f59e0b" : "#10b981")} title={a.is_active ? "تعطيل" : "تفعيل"}>
                      {a.is_active ? "⏸️" : "▶️"}
                    </button>
                    <button onClick={() => openEdit(a)} style={btnMini("#3b82f6")} title="تعديل">✏️</button>
                    <button onClick={() => handleDelete(a)} style={btnMini("#dc2626")} title="حذف">🗑️</button>
                  </div>
                </div>
                <div style={styles.cardMessage}>{a.message}</div>
                <div style={styles.cardFooter}>
                  <span>📅 {a.created_at?.slice(0, 16).replace("T", " ")}</span>
                  {a.created_by_username && <span>· 👤 {a.created_by_username}</span>}
                  {a.scheduled_at && <span>· ⏰ مجدول: {a.scheduled_at.slice(0, 16).replace("T", " ")}</span>}
                  {a.expires_at && <span>· ⏳ ينتهي: {a.expires_at.slice(0, 16).replace("T", " ")}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal إنشاء/تعديل */}
      {modal && (
        <div onClick={() => setModal(null)} style={styles.modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...styles.modalContent, maxWidth: 640 }}>
            <h3 style={styles.modalTitle}>
              {modal === "new" ? "➕ إعلان جديد" : "✏️ تعديل الإعلان"}
            </h3>

            <div style={{ marginTop: 16 }}>
              <label style={styles.label}>العنوان *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={styles.input} placeholder="عنوان الإعلان" />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={styles.label}>الرسالة *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                style={{ ...styles.input, resize: "vertical" }}
                placeholder="تفاصيل الإعلان..."
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <label style={styles.label}>النوع</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={styles.input}>
                  <option value="info">ℹ️ معلومة</option>
                  <option value="success">✅ نجاح</option>
                  <option value="warning">⚠️ تحذير</option>
                  <option value="danger">🚨 خطر</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>الهدف</label>
                <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} style={styles.input}>
                  <option value="all">كلّ المستخدمين</option>
                  <option value="plan:free">خطّة Free</option>
                  <option value="plan:pro">خطّة Pro</option>
                  <option value="plan:enterprise">خطّة Enterprise</option>
                  <option value="role:admin">المديرون</option>
                  <option value="role:analyst">المحلّلون</option>
                  <option value="role:viewer">المشاهدون</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <label style={styles.label}>تاريخ النشر (اختياريّ)</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>تاريخ الانتهاء (اختياريّ)</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontSize: 14, fontWeight: 500 }}>الإعلان نشط (يظهر للمستخدمين فورًا)</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(null)} style={styles.btnSecondary}>إلغاء</button>
              <button onClick={handleSave} style={styles.btnPrimary}>
                {modal === "new" ? "➕ إنشاء" : "💾 حفظ"}
              </button>
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
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 },
  toolbar: { background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  filtersGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 },
  input: { padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, color: "#0f172a", outline: "none", fontSize: 14, fontFamily: "inherit", width: "100%" },
  btnPrimary: { padding: "10px 18px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 2px 8px rgba(59,130,246,0.25)" },
  btnCreate: { padding: "10px 18px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 2px 8px rgba(16,185,129,0.25)" },
  btnSecondary: { padding: "10px 18px", background: "#fff", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" },
  cardMeta: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 },
  cardMessage: { color: "#475569", fontSize: 14, lineHeight: 1.6, padding: "10px 0", borderTop: "1px solid #f1f5f9" },
  cardFooter: { display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#94a3b8", marginTop: 8 },
  emptyBox: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 60, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalContent: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, direction: "rtl", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { margin: 0, color: "#0f172a", fontSize: 20, fontWeight: 700 },
  label: { display: "block", color: "#475569", fontSize: 13, fontWeight: 600, marginBottom: 8 },
};

const btnMini = (color: string): React.CSSProperties => ({ padding: "6px 12px", background: `${color}15`, border: `1px solid ${color}40`, color, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 });

const badge = (color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", background: `${color}15`, color, border: `1px solid ${color}30`, borderRadius: 20, fontSize: 11, fontWeight: 600 });

export default AdminAnnouncements;