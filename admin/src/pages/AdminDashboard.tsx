import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../api/axios";

interface Overview {
  total_users: number;
  total_organizations: number;
  total_projects: number;
  total_scans: number;
  total_findings: number;
  active_users_7d?: number;
  new_users_30d?: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/admin/stats/overview")
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.detail || "فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "إجمالي المستخدمين", value: data?.total_users ?? 0, icon: "👥", color: "#3b82f6" },
    { label: "المنظّمات", value: data?.total_organizations ?? 0, icon: "🏢", color: "#8b5cf6" },
    { label: "المشاريع", value: data?.total_projects ?? 0, icon: "📁", color: "#10b981" },
    { label: "الفحوصات الأمنيّة", value: data?.total_scans ?? 0, icon: "🔍", color: "#f59e0b" },
    { label: "الثغرات المكتشفة", value: data?.total_findings ?? 0, icon: "⚠️", color: "#ef4444" },
    { label: "مستخدمون نشطون (7 أيّام)", value: data?.active_users_7d ?? 0, icon: "✨", color: "#06b6d4" },
  ];

  return (
    <AdminLayout title="لوحة التحكّم" subtitle="نظرة عامّة علا منصّة SecureVision AI">
      {loading && <div style={styles.loading}>⏳ جاري التحميل...</div>}
      {error && <div style={styles.error}>⚠️ {error}</div>}

      {data && (
        <>
          <div style={styles.cardsGrid}>
            {cards.map((c) => (
              <div key={c.label} style={styles.card}>
                <div style={{ ...styles.cardIcon, background: c.color + "15", color: c.color }}>
                  {c.icon}
                </div>
                <div>
                  <div style={styles.cardValue}>{c.value.toLocaleString("ar-EG")}</div>
                  <div style={styles.cardLabel}>{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.infoBox}>
            <h3 style={styles.infoTitle}>💡 معلومات سريعة</h3>
            <p style={styles.infoText}>
              مرحبًا بك في لوحة إدارة <strong>SecureVision AI</strong>. يمكنك إدارة المستخدمين، المنظّمات، والاشتراكات
              من القائمة الجانبيّة علا اليمين.
            </p>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    padding: 40,
    textAlign: "center",
    fontSize: 18,
    color: "#64748b",
  },
  error: {
    padding: 20,
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: 12,
    border: "1px solid #fecaca",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
    marginBottom: 32,
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    flexShrink: 0,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.2,
  },
  cardLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  infoBox: {
    background: "linear-gradient(135deg, #eff6ff, #f5f3ff)",
    padding: 24,
    borderRadius: 16,
    border: "1px solid #e0e7ff",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1e293b",
    margin: "0 0 8px 0",
  },
  infoText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 1.7,
    margin: 0,
  },
};