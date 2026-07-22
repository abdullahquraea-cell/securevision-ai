import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api/axios";

const roleMeta: Record<string, { label: string; bg: string; color: string; grad: string }> = {
  admin: { label: "مدير", bg: "#dbeafe", color: "#1d4ed8", grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  analyst: { label: "محلل أمني", bg: "#dcfce7", color: "#16a34a", grad: "linear-gradient(135deg,#22c55e,#16a34a)" },
  viewer: { label: "مشاهد", bg: "#f1f5f9", color: "#64748b", grad: "linear-gradient(135deg,#94a3b8,#64748b)" },
};

function Users() {
  const currentUser = useOutletContext<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [aUsername, setAUsername] = useState("");
  const [aEmail, setAEmail] = useState("");
  const [aPassword, setAPassword] = useState("");
  const [aRole, setARole] = useState("analyst");

  const load = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || "فشل تحميل المستخدمين");
    }
  };

  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!aUsername.trim() || !aEmail.trim() || !aPassword.trim()) {
      setMessage("⚠️ جميع الحقول مطلوبة");
      return;
    }
    try {
      await api.post("/users", { username: aUsername, email: aEmail, password: aPassword, role: aRole });
      setMessage("✅ تم إنشاء المستخدم");
      setAUsername(""); setAEmail(""); setAPassword(""); setARole("analyst");
      setShowAdd(false);
      load();
    } catch (error: any) {
      setMessage("⚠️ " + (error.response?.data?.detail || "فشل الإنشاء"));
    }
  };

  const changeRole = async (userId: number, newRole: string) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setMessage("✅ تم تحديث الصلاحية");
      load();
    } catch (error: any) {
      setMessage("⚠️ " + (error.response?.data?.detail || "فشل التحديث"));
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`حذف المستخدم "${username}"؟`)) return;
    try {
      await api.delete(`/users/${userId}`);
      setMessage("🗑️ تم حذف المستخدم");
      load();
    } catch (error: any) {
      setMessage("⚠️ " + (error.response?.data?.detail || "فشل الحذف"));
    }
  };

  const roleCount = (r: string) => users.filter((u) => u.role === r).length;

  const field = {
    width: "100%", padding: "11px 13px", border: "1px solid #e2e8f0", borderRadius: "10px",
    fontFamily: "inherit", fontSize: "14px", background: "#f8fafc", boxSizing: "border-box" as const,
  };

  return (
    <div>
      <style>{`
        .us-card { transition: transform .2s, box-shadow .2s; }
        .us-card:hover { transform: translateY(-4px); box-shadow: 0 16px 36px -16px rgba(15,23,42,.28); }
        .us-del:hover:not(:disabled) { background:#dc2626 !important; color:#fff !important; }
        .us-new:hover { filter: brightness(1.08); }
      `}</style>

      {/* رأس فخم */}
      <div style={{
        background: "linear-gradient(135deg,#4338ca 0%,#6d28d9 55%,#1d4ed8 100%)",
        borderRadius: "18px", padding: "26px 28px", color: "white", marginBottom: "22px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "16px", boxShadow: "0 16px 40px -18px #6d28d9aa",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px" }}>👥 المستخدمون</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.9, fontSize: "14px" }}>إدارة حسابات الفريق وصلاحياتهم</p>
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          {[["admin", "مدراء"], ["analyst", "محلّلون"], ["viewer", "مشاهدون"]].map(([r, lbl]) => (
            <div key={r} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "26px", fontWeight: "bold", fontFamily: "monospace" }}>{roleCount(r)}</div>
              <div style={{ fontSize: "12px", opacity: 0.85 }}>{lbl}</div>
            </div>
          ))}
          <button className="us-new" onClick={() => setShowAdd((v) => !v)} style={{
            padding: "12px 20px", background: "rgba(255,255,255,0.18)", color: "white",
            border: "1px solid rgba(255,255,255,0.35)", borderRadius: "12px", cursor: "pointer",
            fontFamily: "inherit", fontSize: "14px", fontWeight: "bold",
          }}>{showAdd ? "✕ إغلاق" : "➕ إضافة مستخدم"}</button>
        </div>
      </div>

      {message && (
        <div style={{
          marginBottom: "18px", padding: "12px 16px", borderRadius: "10px",
          background: message.startsWith("✅") || message.startsWith("🗑️") ? "#ecfdf5" : "#fef2f2",
          color: message.startsWith("✅") || message.startsWith("🗑️") ? "#065f46" : "#991b1b",
          border: `1px solid ${message.startsWith("✅") || message.startsWith("🗑️") ? "#a7f3d0" : "#fecaca"}`,
          fontSize: "14px",
        }}>{message}</div>
      )}

      {/* نموذج إضافة مستخدم */}
      {showAdd && (
        <div style={{
          background: "white", borderRadius: "16px", padding: "24px", marginBottom: "22px",
          boxShadow: "0 10px 30px -14px rgba(15,23,42,.2)", border: "1px solid #eef2f7",
        }}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>➕ إضافة مستخدم جديد</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>اسم المستخدم</label>
              <input style={field} value={aUsername} onChange={(e) => setAUsername(e.target.value)} placeholder="username" />
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>البريد الإلكتروني</label>
              <input style={{ ...field, direction: "ltr" }} value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>كلمة المرور</label>
              <input type="password" style={{ ...field, direction: "ltr" }} value={aPassword} onChange={(e) => setAPassword(e.target.value)} placeholder="6 أحرف على الأقل" />
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#64748b", display: "block", marginBottom: "6px" }}>الدور</label>
              <select style={field} value={aRole} onChange={(e) => setARole(e.target.value)}>
                <option value="admin">مدير</option>
                <option value="analyst">محلل أمني</option>
                <option value="viewer">مشاهد</option>
              </select>
            </div>
          </div>
          <button className="us-new" onClick={createUser} style={{
            marginTop: "18px", padding: "12px 34px", background: "linear-gradient(135deg,#4338ca,#6d28d9)",
            color: "white", border: "none", borderRadius: "10px", cursor: "pointer",
            fontFamily: "inherit", fontSize: "15px", fontWeight: "bold", boxShadow: "0 8px 20px -8px #6d28d9aa",
          }}>✅ إنشاء المستخدم</button>
        </div>
      )}

      {users.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", color: "#94a3b8",
          background: "white", borderRadius: "16px", border: "2px dashed #e2e8f0",
        }}>
          <div style={{ fontSize: "50px", marginBottom: "10px" }}>👤</div>
          لا يوجد مستخدمون
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "18px" }}>
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            const rm = roleMeta[u.role] || roleMeta.viewer;
            const initial = (u.username || "?").charAt(0).toUpperCase();
            return (
              <div key={u.id} className="us-card" style={{
                background: "white", borderRadius: "16px", padding: "20px",
                boxShadow: "0 4px 16px -8px rgba(15,23,42,.15)", border: "1px solid #eef2f7", position: "relative",
              }}>
                {isSelf && (
                  <span style={{
                    position: "absolute", top: "14px", insetInlineStart: "14px",
                    fontSize: "11px", fontWeight: "bold", color: "#0891b2",
                    background: "#cffafe", padding: "2px 10px", borderRadius: "20px",
                  }}>أنت</span>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "50%", background: rm.grad,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "24px", fontWeight: "bold",
                    boxShadow: `0 6px 16px -6px ${rm.color}88`,
                  }}>{initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "bold", fontSize: "17px", color: "#1e293b" }}>{u.username}</div>
                    <div style={{
                      fontSize: "12.5px", color: "#64748b", direction: "ltr", textAlign: "right",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }} title={u.email}>{u.email}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <span style={{
                    background: rm.bg, color: rm.color, padding: "4px 14px",
                    borderRadius: "20px", fontSize: "13px", fontWeight: "bold",
                  }}>🛡️ {rm.label}</span>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select value={u.role} disabled={isSelf} onChange={(e) => changeRole(u.id, e.target.value)} style={{
                    flex: 1, padding: "9px 10px", border: "1px solid #e2e8f0", borderRadius: "8px",
                    fontFamily: "inherit", fontSize: "13px", background: isSelf ? "#f8fafc" : "#fff",
                    cursor: isSelf ? "not-allowed" : "pointer",
                  }}>
                    <option value="admin">مدير</option>
                    <option value="analyst">محلل أمني</option>
                    <option value="viewer">مشاهد</option>
                  </select>
                  <button className="us-del" onClick={() => deleteUser(u.id, u.username)} disabled={isSelf} style={{
                    padding: "9px 14px", background: isSelf ? "#f1f5f9" : "#fee2e2",
                    color: isSelf ? "#cbd5e1" : "#dc2626", border: "none", borderRadius: "8px",
                    cursor: isSelf ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 600,
                  }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Users;