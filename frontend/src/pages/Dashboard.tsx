import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import api from "../api/axios";

const sevMeta: Record<string, { color: string; label: string }> = {
  critical: { color: "#f43f5e", label: "حرجة" },
  high: { color: "#fb923c", label: "عالية" },
  medium: { color: "#fbbf24", label: "متوسطة" },
  low: { color: "#34d399", label: "منخفضة" },
  info: { color: "#38bdf8", label: "معلومة" },
};
const sevOrder = ["critical", "high", "medium", "low", "info"];

const engineMeta = [
  { key: "Nmap", label: "🔍 Nmap", color: "#22d3ee" },
  { key: "Nuclei", label: "🚀 Nuclei", color: "#a78bfa" },
  { key: "SQLMap", label: "💉 SQLMap", color: "#f43f5e" },
  { key: "SecureVision", label: "🛡️ SecureVision", color: "#34d399" },
];

const sevFeedClass: Record<string, string> = {
  critical: "alert", high: "alert", medium: "warn", low: "ok", info: "info",
};

function Dashboard() {
  const user = useOutletContext<any>();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/stats/overview").then((res) => setStats(res.data)).catch(() => {});
  }, []);

  if (!stats) {
    return <p style={{ color: "#64748b" }}>جارٍ تحميل مركز العمليات...</p>;
  }

  const score = stats.security_score;
  const scoreColor = score >= 80 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f43f5e";

  // المخطط الدائري
  const totalSev = sevOrder.reduce((a, s) => a + (stats.severity[s] || 0), 0);
  let acc = 0;
  const R = 50;
  const C = 2 * Math.PI * R;
  const segments = sevOrder
    .filter((s) => (stats.severity[s] || 0) > 0)
    .map((s) => {
      const frac = stats.severity[s] / totalSev;
      const seg = { s, offset: acc, frac, color: sevMeta[s].color };
      acc += frac;
      return seg;
    });

  // المخطط الخطي الحقيقي (اتجاه 7 أيام)
  const trend = stats.trend || [];
  const n = Math.max(1, trend.length - 1);
  const maxT = Math.max(1, ...trend.map((t: any) => Math.max(t.findings, t.scans)));
  const pts = (key: string) =>
    trend.map((t: any, i: number) => `${(i * 320) / n},${140 - (t[key] / maxT) * 120}`).join(" ");

  // توزيع الأدوات
  const engines = stats.engines || {};
  const maxEng = Math.max(1, ...engineMeta.map((e) => engines[e.key] || 0));

  // حالة الفحوصات
  const st = stats.scan_status || { completed: 0, running: 0, failed: 0 };

  // تدفق الأحداث الحقيقي
  const feed: { c: string; x: string }[] = [];
  (stats.recent_findings || []).forEach((f: any) =>
    feed.push({ c: sevFeedClass[f.severity] || "info", x: `[${f.engine}] ${f.title}` })
  );
  (stats.recent_scans || []).forEach((s: any) =>
    feed.push({ c: "info", x: `[SCAN] ${s.project_name} — ${s.findings_count} نتيجة (${s.status})` })
  );

  return (
    <div className="soc">
      <div className="soc-hero">
        <span className="live">● ONLINE</span>
        <h1>لوحة التحكم — مركز العمليات الأمنية</h1>
        <p>مرحباً {user.username} — {stats.is_admin ? "عرض شامل (مدير)" : "مشاريعك الخاصة"}</p>
      </div>

      <div className="soc-kpis">
        <div className="soc-kpi k1"><div className="ic">🛡️</div><div className="lb">إجمالي الفحوصات</div><div className="vl">{stats.total_scans}</div><div className="sub" style={{ color: "#22d3ee" }}>SCANS</div></div>
        <div className="soc-kpi k2"><div className="ic">📁</div><div className="lb">الأصول (المشاريع)</div><div className="vl">{stats.total_projects}</div><div className="sub" style={{ color: "#34d399" }}>ASSETS</div></div>
        <div className="soc-kpi k3"><div className="ic">🐞</div><div className="lb">إجمالي الثغرات</div><div className="vl">{stats.total_findings}</div><div className="sub" style={{ color: "#fb923c" }}>FINDINGS</div></div>
        <div className="soc-kpi k4"><div className="ic">🚨</div><div className="lb">ثغرات حرجة</div><div className="vl">{stats.critical_count}</div><div className="sub" style={{ color: "#f43f5e" }}>CRITICAL</div></div>
      </div>

      <div className="soc-row r-4">
        {/* المخطط الخطي الحقيقي */}
        <div className="soc-card">
          <h3>اتجاه آخر 7 أيام <span className="tag">7-DAY</span></h3>
          <div className="line-legend">
            <span><i style={{ background: "#f43f5e" }} /> ثغرات</span>
            <span><i style={{ background: "#22d3ee" }} /> فحوصات</span>
          </div>
          <svg width="100%" height="150" viewBox="0 0 320 150" preserveAspectRatio="none">
            {[30, 60, 90, 120].map((y) => (
              <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#141d29" />
            ))}
            <polyline fill="none" stroke="#f43f5e" strokeWidth="2" points={pts("findings")} />
            <polyline fill="none" stroke="#22d3ee" strokeWidth="2" points={pts("scans")} />
          </svg>
        </div>

        {/* توزيع الخطورة */}
        <div className="soc-card">
          <h3>توزيع الخطورة <span className="tag">SEVERITY</span></h3>
          {totalSev === 0 ? (
            <p className="soc-empty">لا توجد ثغرات بعد</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="65" cy="65" r={R} fill="none" stroke="#1a2431" strokeWidth="15" />
                {segments.map((seg) => (
                  <circle key={seg.s} cx="65" cy="65" r={R} fill="none" stroke={seg.color}
                    strokeWidth="15" strokeDasharray={`${seg.frac * C} ${C}`}
                    strokeDashoffset={`${-seg.offset * C}`} />
                ))}
              </svg>
              <div className="legend" style={{ flex: 1 }}>
                {sevOrder.map((s) => (
                  <div className="legend-item" key={s}>
                    <span className="sw" style={{ background: sevMeta[s].color }} />
                    <span>{sevMeta[s].label}</span>
                    <span className="ct">{stats.severity[s] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* حلقة الحماية */}
        <div className="soc-card">
          <h3>حالة الحماية <span className="tag">SCORE</span></h3>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "6px" }}>
            <div style={{
              width: "120px", height: "120px", borderRadius: "50%",
              background: `conic-gradient(${scoreColor} ${score * 3.6}deg, #1a2431 0deg)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 24px ${scoreColor}44`,
            }}>
              <div style={{
                width: "92px", height: "92px", borderRadius: "50%", background: "#111823",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "30px", fontWeight: "bold", color: scoreColor, fontFamily: "monospace" }}>{score}</span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>من 100</span>
              </div>
            </div>
          </div>
          <p style={{ textAlign: "center", color: scoreColor, fontSize: "12.5px", marginTop: "12px" }}>
            {score >= 80 ? "✅ محمي" : score >= 50 ? "⚠️ يحتاج تحسين" : "🚨 خطر"}
          </p>
        </div>
      </div>

      <div className="soc-row r-3">
        {/* أحدث التنبيهات */}
        <div className="soc-card">
          <h3>أحدث التنبيهات <span className="tag">ALERTS</span></h3>
          {(stats.recent_findings || []).length === 0 ? (
            <p className="soc-empty">لا توجد تنبيهات</p>
          ) : (
            stats.recent_findings.map((f: any) => {
              const m = sevMeta[f.severity] || sevMeta.info;
              return (
                <div className="alert-row" key={f.id}>
                  <span className="ico" style={{ color: m.color }}>●</span>
                  <span className="txt">{f.title}</span>
                  <span className="ago">{m.label}</span>
                </div>
              );
            })
          )}
          <Link to="/vulnerabilities" className="soc-link">عرض الكل ←</Link>
        </div>

        {/* أحدث الفحوصات */}
        <div className="soc-card">
          <h3>أحدث الفحوصات <span className="tag">SCANS</span></h3>
          {(stats.recent_scans || []).length === 0 ? (
            <p className="soc-empty">لا توجد فحوصات</p>
          ) : (
            stats.recent_scans.map((s: any) => (
              <div className="alert-row" key={s.id}>
                <span className="ico" style={{ color: "#22d3ee" }}>🛡️</span>
                <span className="txt">{s.project_name}</span>
                <span className="ago">{s.findings_count} نتيجة</span>
              </div>
            ))
          )}
          <Link to="/scans" className="soc-link">صفحة الفحص ←</Link>
        </div>

        {/* تدفق الأحداث الحقيقي */}
        <div className="soc-card">
          <h3>تدفق الأحداث <span className="tag">● LIVE</span></h3>
          <div className="feed">
            {feed.length === 0 ? (
              <p className="soc-empty">لا أحداث بعد</p>
            ) : (
              feed.slice(0, 10).map((l, i) => (
                <div className="fl" key={i}>
                  <span className={l.c}>{l.x}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="soc-row r-3">
        {/* توزيع الثغرات حسب الأداة (حقيقي) */}
        <div className="soc-card">
          <h3>الثغرات حسب الأداة <span className="tag">ENGINES</span></h3>
          {engineMeta.map((e) => (
            <div className="res" key={e.key}>
              <div className="res-lb"><span>{e.label}</span><span>{engines[e.key] || 0}</span></div>
              <div className="res-track">
                <div className="res-fill" style={{ width: `${((engines[e.key] || 0) / maxEng) * 100}%`, background: e.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* حالة الفحوصات (حقيقي) */}
        <div className="soc-card">
          <h3>حالة الفحوصات <span className="tag">STATUS</span></h3>
          <div className="svc"><span>✅ مكتملة</span><span className="st" style={{ color: "#34d399" }}>{st.completed}</span></div>
          <div className="svc"><span>🔄 قيد التشغيل</span><span className="st" style={{ color: "#22d3ee" }}>{st.running}</span></div>
          <div className="svc"><span>❌ فاشلة</span><span className="st" style={{ color: "#f43f5e" }}>{st.failed}</span></div>
          <div className="svc"><span>📊 الإجمالي</span><span className="st">{stats.total_scans}</span></div>
        </div>

        {/* ملخص سريع (حقيقي) */}
        <div className="soc-card">
          <h3>ملخص سريع <span className="tag">SUMMARY</span></h3>
          <div className="svc"><span>معدّل الثغرات لكل فحص</span><span className="st" style={{ color: "#22d3ee" }}>
            {stats.total_scans > 0 ? (stats.total_findings / stats.total_scans).toFixed(1) : "0"}
          </span></div>
          <div className="svc"><span>الثغرات الحرجة</span><span className="st" style={{ color: "#f43f5e" }}>{stats.critical_count}</span></div>
          <div className="svc"><span>درجة الأمان</span><span className="st" style={{ color: scoreColor }}>{score}/100</span></div>
          <div className="svc"><span>محرك التحليل</span><span className="st">Claude AI</span></div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;