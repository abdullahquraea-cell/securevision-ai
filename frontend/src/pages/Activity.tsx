import { useEffect, useState } from "react";
import api from "../api/axios";

// أيقونات ونصوص أنواع الأحداث
const actionInfo: Record<string, { icon: string; label: string }> = {
  login: { icon: "🔑", label: "تسجيل دخول" },
  create_project: { icon: "📁", label: "إنشاء مشروع" },
  run_scan: { icon: "🛡️", label: "تشغيل فحص" },
  delete: { icon: "🗑️", label: "حذف" },
};

function Activity() {
  const [activities, setActivities] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/activity")
      .then((res) => setActivities(res.data))
      .catch((error: any) => {
        setMessage(error.response?.data?.detail || "فشل تحميل السجل");
      });
  }, []);

  return (
    <div>
      <h2 className="page-title">📜 سجل النشاط</h2>

      <div className="panel">
        <h3>آخر الأحداث ({activities.length})</h3>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          سجل بكل الأنشطة المهمة في النظام (أحدث 200 حدث).
        </p>

        {message && <p style={{ color: "#dc2626" }}>{message}</p>}

        {activities.length === 0 && !message ? (
          <p style={{ color: "#64748b" }}>لا توجد أنشطة مسجّلة بعد</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الحدث</th>
                <th>المستخدم</th>
                <th>التفاصيل</th>
                <th>التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => {
                const info = actionInfo[a.action] || {
                  icon: "•",
                  label: a.action,
                };
                return (
                  <tr key={a.id}>
                    <td>
                      <span>{info.icon} </span>
                      {info.label}
                    </td>
                    <td>{a.username}</td>
                    <td>{a.details}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>
                      {new Date(a.created_at).toLocaleString("ar")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Activity;