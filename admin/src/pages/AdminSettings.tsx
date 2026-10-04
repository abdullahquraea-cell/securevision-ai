import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminLayout from "../components/AdminLayout";

type Setting = {
  key: string;
  value: string;
  category: string;
  description: string;
  updated_at: string | null;
};

type GroupedSettings = Record<string, Setting[]>;

const categoryMeta: Record<string, { label: string; icon: string; color: string }> = {
  general: { label: "معلومات المنصّة", icon: "🏢", color: "#3b82f6" },
  security: { label: "الأمان", icon: "🔐", color: "#dc2626" },
  limits: { label: "حدود الخطط", icon: "📊", color: "#8b5cf6" },
  smtp: { label: "إعدادات البريد (SMTP)", icon: "📧", color: "#10b981" },
  other: { label: "أخرى", icon: "⚙️", color: "#64748b" },
};

function AdminSettings() {
  const [me, setMe] = useState<any>(null);
  const [groups, setGroups] = useState<GroupedSettings>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/settings");
      const settings: GroupedSettings = res.data.settings;
      setGroups(settings);

      const v: Record<string, string> = {};
      Object.values(settings).forEach((arr) => {
        arr.forEach((s) => (v[s.key] = s.value));
      });
      setValues(v);
      setDirty(new Set());
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
        loadSettings();
      })
      .catch(() => navigate("/login"));
    // eslint-disable-next-line
  }, [navigate]);

  const handleChange = (key: string, value: string) => {
    setValues({ ...values, [key]: value });
    const newDirty = new Set(dirty);
    newDirty.add(key);
    setDirty(newDirty);
  };

  const handleSave = async () => {
    if (dirty.size === 0) {
      setMsg("ℹ️ لا توجد تغييرات لحفظها");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      dirty.forEach((k) => (payload[k] = values[k]));
      const res = await api.patch("/admin/settings", payload);
      setMsg(`✅ تمّ حفظ ${res.data.count} إعداد بنجاح`);
      await loadSettings();
    } catch (e: any) {
      setMsg("⚠️ " + (e.response?.data?.detail || "فشل الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (dirty.size === 0) return;
    if (!window.confirm("التراجع عن كلّ التغييرات غير المحفوظة؟")) return;
    loadSettings();
  };

  const renderInput = (s: Setting) => {
    const key = s.key;
    const val = values[key] ?? "";

    // boolean toggle
    if (val === "true" || val === "false") {
      const isOn = val === "true";
      return (
        <div style={styles.toggleWrap}>
          <button
            onClick={() => handleChange(key, isOn ? "false" : "true")}
            style={{
              ...styles.toggle,
              background: isOn ? "#10b981" : "#cbd5e1",
            }}
          >
            <div style={{
              ...styles.toggleDot,
              transform: isOn ? "translateX(-24px)" : "translateX(0)",
            }} />
          </button>
          <span style={{ color: isOn ? "#10b981" : "#64748b", fontWeight: 600, fontSize: 13 }}>
            {isOn ? "مُفعَّل" : "معطَّل"}
          </span>
        </div>
      );
    }

    // numeric
    if (/^-?\d+$/.test(val) || key.includes("limit") || key.includes("port") || key.includes("hours") || key.includes("attempts")) {
      return (
        <input
          type="number"
          value={val}
          onChange={(e) => handleChange(key, e.target.value)}
          style={styles.input}
        />
      );
    }

    // textarea for long values
    if (key === "maintenance_message") {
      return (
        <textarea
          value={val}
          onChange={(e) => handleChange(key, e.target.value)}
          rows={3}
          style={{ ...styles.input, resize: "vertical", fontFamily: "inherit" }}
        />
      );
    }

    // email
    if (key.includes("email")) {
      return (
        <input
          type="email"
          value={val}
          onChange={(e) => handleChange(key, e.target.value)}
          style={{ ...styles.input, direction: "ltr", textAlign: "right" }}
        />
      );
    }

    // password
    if (key.includes("password")) {
      return (
        <input
          type="password"
          value={val}
          onChange={(e) => handleChange(key, e.target.value)}
          style={{ ...styles.input, direction: "ltr", textAlign: "right" }}
        />
      );
    }

    return (
      <input
        type="text"
        value={val}
        onChange={(e) => handleChange(key, e.target.value)}
        style={styles.input}
      />
    );
  };

  if (!me) return null;

  return (
    <AdminLayout title="إعدادات النظام" subtitle={`${dirty.size > 0 ? `⚠️ ${dirty.size} تغيير غير محفوظ` : "جميع الإعدادات محفوظة ✓"}`}>
      {msg && (
        <div style={{
          padding: "12px 16px",
          marginBottom: 16,
          borderRadius: 10,
          background: msg.startsWith("⚠️") ? "#fef2f2" : msg.startsWith("ℹ️") ? "#f0f9ff" : "#f0fdf4",
          border: `1px solid ${msg.startsWith("⚠️") ? "#fecaca" : msg.startsWith("ℹ️") ? "#bae6fd" : "#bbf7d0"}`,
          color: msg.startsWith("⚠️") ? "#dc2626" : msg.startsWith("ℹ️") ? "#0369a1" : "#16a34a",
          fontSize: 14,
          fontWeight: 500,
        }}>{msg}</div>
      )}

      {/* شريط الحفظ العلوي */}
      <div style={styles.saveBar}>
        <div style={{ color: "#64748b", fontSize: 14 }}>
          {dirty.size === 0 ? "💾 لم تُجرَ أيّ تغييرات" : `✏️ ${dirty.size} تغيير جاهز للحفظ`}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleReset} disabled={dirty.size === 0 || saving} style={{ ...styles.btnSecondary, opacity: dirty.size === 0 ? 0.5 : 1 }}>
            ↻ تراجع
          </button>
          <button onClick={handleSave} disabled={dirty.size === 0 || saving} style={{ ...styles.btnPrimary, opacity: dirty.size === 0 ? 0.5 : 1 }}>
            {saving ? "⏳ جارٍ الحفظ..." : "💾 حفظ التغييرات"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 16 }}>⏳ جارٍ التحميل...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(groups).map(([cat, settings]) => {
            const meta = categoryMeta[cat] || categoryMeta.other;
            return (
              <div key={cat} style={styles.sectionCard}>
                <div style={{ ...styles.sectionHeader, background: meta.color + "08", borderBottom: `3px solid ${meta.color}` }}>
                  <div style={{ fontSize: 24 }}>{meta.icon}</div>
                  <div>
                    <h2 style={{ ...styles.sectionTitle, color: meta.color }}>{meta.label}</h2>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{settings.length} إعداد</div>
                  </div>
                </div>
                <div style={styles.settingsList}>
                  {settings.map((s) => (
                    <div key={s.key} style={{ ...styles.settingRow, borderInlineStart: dirty.has(s.key) ? "3px solid #f59e0b" : "3px solid transparent" }}>
                      <div style={styles.settingInfo}>
                        <div style={styles.settingLabel}>
                          {s.description}
                          {dirty.has(s.key) && <span style={styles.dirtyTag}>✏️ معدّل</span>}
                        </div>
                        <div style={styles.settingKey}>{s.key}</div>
                      </div>
                      <div style={styles.settingInputWrap}>
                        {renderInput(s)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.infoBox}>
        ⚠️ <strong>تنبيه:</strong> تغيير هاذه الإعدادات يؤثّر علا كامل المنصّة فورًا. تأكّد من القيم قبل الحفظ.
      </div>
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  saveBar: {
    background: "#fff",
    padding: "14px 20px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    marginBottom: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    position: "sticky",
    top: 20,
    zIndex: 10,
  },
  sectionCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  sectionHeader: {
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: 0,
  },
  settingsList: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  settingRow: {
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    gap: 20,
    padding: "14px 10px",
    paddingInlineStart: 14,
    borderRadius: 10,
    background: "#f8fafc",
    alignItems: "center",
  },
  settingInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  settingKey: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "monospace",
    direction: "ltr",
    textAlign: "right",
  },
  settingInputWrap: {
    width: "100%",
  },
  dirtyTag: {
    background: "#fef3c7",
    color: "#d97706",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
  input: {
    padding: "10px 14px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    color: "#0f172a",
    outline: "none",
    fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
  },
  btnPrimary: {
    padding: "10px 20px",
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
    padding: "10px 20px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  toggleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  toggle: {
    width: 56,
    height: 28,
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    padding: 2,
    position: "relative",
    transition: "background 0.2s",
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    background: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    transition: "transform 0.2s",
    marginRight: 28,
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    background: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: 10,
    color: "#92400e",
    fontSize: 13,
    lineHeight: 1.6,
  },
};

export default AdminSettings;