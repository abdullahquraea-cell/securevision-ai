import { useEffect, useState } from "react";
import api from "../api/axios";

interface Member {
  id: number;
  username: string;
  email: string;
  org_role: string;
  is_verified: boolean;
  is_owner: boolean;
}

interface OrgData {
  id: number;
  name: string;
  plan: string;
  owner_id: number;
  my_role: string;
  members_count: number;
  members: Member[];
}

const roleBadge: Record<string, { label: string; bg: string; color: string }> = {
  owner: { label: "المالك", bg: "#fef3c7", color: "#92400e" },
  admin: { label: "مدير", bg: "#dbeafe", color: "#1e40af" },
  member: { label: "عضو", bg: "#f1f5f9", color: "#475569" },
};

export default function Organization() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  // حقول الدعوة
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const load = () => {
    setLoading(true);
    api
      .get("/organizations/me")
      .then((res) => setOrg(res.data))
      .catch(() => setMsg("تعذّر تحميل بيانات المؤسسة"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const canManage = org && (org.my_role === "owner" || org.my_role === "admin");

  const invite = async () => {
    if (!username || !email || !password) {
      setMsg("الرجاء تعبئة جميع الحقول");
      return;
    }
    try {
      await api.post("/organizations/invite", {
        username,
        email,
        password,
        org_role: inviteRole,
      });
      setMsg("تمت إضافة العضو ✅");
      setUsername("");
      setEmail("");
      setPassword("");
      setInviteRole("member");
      setShowInvite(false);
      load();
    } catch (e: any) {
      setMsg(e.response?.data?.detail || "فشلت الإضافة");
    }
  };

  const changeRole = async (id: number, role: string) => {
    try {
      await api.put(`/organizations/members/${id}/role`, { org_role: role });
      load();
    } catch (e: any) {
      setMsg(e.response?.data?.detail || "تعذّر تغيير الدور");
    }
  };

  const removeMember = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من إزالة هذا العضو؟")) return;
    try {
      await api.delete(`/organizations/members/${id}`);
      load();
    } catch (e: any) {
      setMsg(e.response?.data?.detail || "تعذّر الإزالة");
    }
  };

  if (loading) return <div style={{ padding: 40 }}>جارٍ التحميل...</div>;
  if (!org) return <div style={{ padding: 40 }}>{msg || "لا توجد بيانات"}</div>;

  return (
    <div style={{ padding: "28px", direction: "rtl", fontFamily: "system-ui, sans-serif" }}>
      {/* ترويسة */}
      <div
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: 18,
          padding: "28px 32px",
          color: "#fff",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>🏢 مؤسستي</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{org.name}</h1>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
            الباقة: {org.plan} · الأعضاء: {org.members_count} · دوري: {roleBadge[org.my_role]?.label}
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(true)}
            style={{
              padding: "12px 22px",
              background: "#fff",
              color: "#6366f1",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            + دعوة عضو
          </button>
        )}
      </div>

      {msg && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {msg}
        </div>
      )}

      {/* قائمة الأعضاء */}
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {org.members.map((m) => {
          const badge = roleBadge[m.org_role] || roleBadge.member;
          return (
            <div
              key={m.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 18,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  {m.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#1e293b" }}>{m.username}</div>
                  <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.email}
                  </div>
                </div>
                <span
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge.label}
                </span>
              </div>

              {canManage && !m.is_owner && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={m.org_role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    style={{
                      flex: 1,
                      padding: "7px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                    }}
                  >
                    <option value="member">عضو</option>
                    <option value="admin">مدير</option>
                  </select>
                  <button
                    onClick={() => removeMember(m.id)}
                    style={{
                      padding: "7px 12px",
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    إزالة
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* نافذة الدعوة */}
      {showInvite && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowInvite(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 28,
              width: "90%",
              maxWidth: 420,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 20 }}>دعوة عضو جديد</h2>

            <input
              placeholder="اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="كلمة مرور مؤقتة (6 أحرف+)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={inputStyle}
            >
              <option value="member">عضو</option>
              <option value="admin">مدير</option>
            </select>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={invite}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                إضافة
              </button>
              <button
                onClick={() => setShowInvite(false)}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 9,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px",
  margin: "6px 0",
  borderRadius: 9,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  fontSize: 14,
};