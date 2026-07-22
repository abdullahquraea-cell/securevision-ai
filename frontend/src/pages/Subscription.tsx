import { useEffect, useState } from "react";
import api from "../api/axios";

const planMeta: Record<string, { grad: string; accent: string; icon: string; popular?: boolean }> = {
  free: { grad: "linear-gradient(135deg,#64748b,#475569)", accent: "#64748b", icon: "🆓" },
  pro: { grad: "linear-gradient(135deg,#7c3aed,#4f46e5)", accent: "#7c3aed", icon: "⭐", popular: true },
  enterprise: { grad: "linear-gradient(135deg,#0891b2,#1d4ed8)", accent: "#0891b2", icon: "🏢" },
};

function Subscription() {
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [me, setMe] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [upgrading, setUpgrading] = useState("");

  const load = async () => {
    const [p, m] = await Promise.all([
      api.get("/subscription/plans"),
      api.get("/subscription/me"),
    ]);
    setPlans(p.data);
    setMe(m.data);
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const subscribe = async (planKey: string) => {
    setUpgrading(planKey);
    setMessage("");
    try {
      if (planKey === "free") {
        // تخفيض للباقة المجانية: فوري بدون دفع
        await api.post("/subscription/upgrade", { plan: planKey });
        setMessage(`✅ تم تغيير باقتك إلى «${plans[planKey].name}»`);
        await load();
      } else {
        // باقة مدفوعة: تحويل لصفحة دفع Stripe
        const res = await api.post("/subscription/checkout", { plan: planKey });
        if (res.data.url) {
          window.location.href = res.data.url;   // انتقال لصفحة الدفع
        } else {
          setMessage("⚠️ تعذّر إنشاء جلسة الدفع");
        }
      }
    } catch (e: any) {
      setMessage("⚠️ " + (e.response?.data?.detail || "فشلت العملية"));
    } finally {
      setUpgrading("");
    }
  };

  if (!me) return <p style={{ color: "#64748b" }}>جارٍ تحميل الاشتراك...</p>;

  const fmt = (n: number) => (n === -1 ? "غير محدود" : n);
  const info = me.plan_info;
  const cm = planMeta[me.plan] || planMeta.free;

  const usageBar = (used: number, limit: number) => {
    if (limit === -1) return null;
    const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
    const danger = pct >= 90;
    return (
      <div style={{ height: "7px", background: "rgba(255,255,255,0.25)", borderRadius: "5px", overflow: "hidden", marginTop: "6px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: danger ? "#fca5a5" : "#fff", borderRadius: "5px" }} />
      </div>
    );
  };

  return (
    <div>
      <style>{`
        .pl-card { transition: transform .2s, box-shadow .2s; }
        .pl-card:hover { transform: translateY(-6px); box-shadow: 0 22px 46px -18px rgba(15,23,42,.35); }
        .pl-btn:hover:not(:disabled) { filter: brightness(1.08); }
      `}</style>

      {/* رأس: الباقة الحالية والاستخدام */}
      <div style={{
        background: cm.grad, borderRadius: "18px", padding: "26px 28px", color: "white",
        marginBottom: "24px", boxShadow: `0 16px 40px -18px ${cm.accent}aa`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ fontSize: "13px", opacity: 0.85 }}>باقتك الحالية</div>
            <h2 style={{ margin: "4px 0 0", fontSize: "28px" }}>{cm.icon} {info.name}</h2>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "30px", fontWeight: "bold", fontFamily: "monospace" }}>${info.price}</div>
            <div style={{ fontSize: "12px", opacity: 0.85 }}>/ شهرياً</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginTop: "20px" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>المشاريع</span>
              <span>{me.usage.projects} / {fmt(info.projects)}</span>
            </div>
            {usageBar(me.usage.projects, info.projects)}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span>فحوصات هذا الشهر</span>
              <span>{me.usage.scans_this_month} / {fmt(info.scans_per_month)}</span>
            </div>
            {usageBar(me.usage.scans_this_month, info.scans_per_month)}
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          marginBottom: "20px", padding: "12px 16px", borderRadius: "10px",
          background: message.startsWith("✅") ? "#ecfdf5" : "#fef2f2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          border: `1px solid ${message.startsWith("✅") ? "#a7f3d0" : "#fecaca"}`, fontSize: "14px",
        }}>{message}</div>
      )}

      <h3 style={{ color: "#1e293b", marginBottom: "16px" }}>💳 الباقات المتاحة</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        {Object.keys(plans).map((key) => {
          const p = plans[key];
          const pm = planMeta[key] || planMeta.free;
          const isCurrent = me.plan === key;
          return (
            <div key={key} className="pl-card" style={{
              background: "white", borderRadius: "18px", padding: "26px",
              border: `2px solid ${pm.popular ? pm.accent : "#eef2f7"}`,
              boxShadow: "0 6px 20px -10px rgba(15,23,42,.18)", position: "relative",
            }}>
              {pm.popular && (
                <span style={{
                  position: "absolute", top: "-12px", insetInlineStart: "50%", transform: "translateX(50%)",
                  background: pm.accent, color: "white", padding: "4px 16px", borderRadius: "20px",
                  fontSize: "12px", fontWeight: "bold",
                }}>الأكثر شيوعاً</span>
              )}

              <div style={{ fontSize: "34px" }}>{pm.icon}</div>
              <h3 style={{ margin: "8px 0 4px", color: "#1e293b" }}>{p.name}</h3>
              <div style={{ marginBottom: "18px" }}>
                <span style={{ fontSize: "34px", fontWeight: "bold", color: pm.accent }}>${p.price}</span>
                <span style={{ color: "#94a3b8", fontSize: "14px" }}> / شهرياً</span>
              </div>

              <div style={{ marginBottom: "20px" }}>
                {p.features.map((f: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", fontSize: "13.5px", color: "#475569" }}>
                    <span style={{ color: "#16a34a" }}>✓</span> {f}
                  </div>
                ))}
              </div>

              <button
                className="pl-btn"
                onClick={() => subscribe(key)}
                disabled={isCurrent || upgrading === key}
                style={{
                  width: "100%", padding: "12px", border: "none", borderRadius: "10px",
                  background: isCurrent ? "#f1f5f9" : pm.grad,
                  color: isCurrent ? "#94a3b8" : "white",
                  cursor: isCurrent ? "default" : "pointer",
                  fontFamily: "inherit", fontSize: "14px", fontWeight: "bold",
                }}
              >
                {isCurrent
                  ? "✓ باقتك الحالية"
                  : upgrading === key
                  ? "⏳ جارٍ..."
                  : key === "free"
                  ? "التبديل للمجاني"
                  : "🔒 اشترك الآن"}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ color: "#94a3b8", fontSize: "12.5px", marginTop: "20px", textAlign: "center" }}>
        🔒 الدفع آمن عبر Stripe. بطاقة الاختبار: 4242 4242 4242 4242 — أي تاريخ مستقبلي وأي CVC.
      </p>
    </div>
  );
}

export default Subscription;