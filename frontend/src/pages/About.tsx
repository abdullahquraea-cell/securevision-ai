import { useState } from "react";
import api from "../api/axios";

const features = [
  { icon: "🛡️", title: "فحص أمني حقيقي", desc: "فحص المواقع وواجهات API بأدوات صناعية (Nuclei · Nmap · SQLMap)." },
  { icon: "👨‍💻", title: "فحص الأكواد", desc: "تحليل الأكواد البرمجية لاكتشاف الأنماط الخطرة (SAST)." },
  { icon: "🔎", title: "بصمة الموقع", desc: "كشف التقنيات والخوادم والترويسات الأمنية." },
  { icon: "🔗", title: "فاحص الروابط", desc: "كشف روابط التصيّد والانتحال مع اتصال فعلي بالموقع." },
  { icon: "🤖", title: "ذكاء اصطناعي", desc: "شرح كل ثغرة واقتراح حلول عملية للمعالجة." },
  { icon: "📄", title: "تقارير احترافية", desc: "تقارير PDF مفصّلة بالعربية جاهزة للمشاركة." },
];

const steps = [
  { n: "1", t: "أنشئ مشروعاً", d: "أضف موقعك أو تطبيقك أو الكود." },
  { n: "2", t: "ابدأ الفحص", d: "المنصّة تشغّل أدوات الفحص الحقيقية." },
  { n: "3", t: "راجع النتائج", d: "اطّلع على الثغرات مع تحليل ذكي." },
  { n: "4", t: "عالج وصدّر التقرير", d: "طبّق التوصيات وحمّل تقرير PDF." },
];

export default function About() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      setStatus("⚠️ الرجاء إدخال الاسم والرسالة");
      return;
    }
    setSending(true);
    setStatus("");
    try {
      const res = await api.post("/contact/send", form);
      setStatus("✅ " + (res.data.message || "تم الإرسال"));
      setForm({ name: "", email: "", message: "" });
    } catch (e: any) {
      setStatus("⚠️ " + (e.response?.data?.detail || "تعذّر الإرسال"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ direction: "rtl", fontFamily: "system-ui, sans-serif" }}>
      {/* ترويسة */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)", color: "#fff", borderRadius: 18, padding: "40px 30px", textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 44 }}>🛡️</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "8px 0" }}>SecureVision AI</h1>
        <p style={{ fontSize: 16, color: "#cbd5e1", maxWidth: 640, margin: "0 auto", lineHeight: 1.9 }}>
          منصّة إدارة الثغرات الأمنية — تفحص مواقعك وتطبيقاتك وأكوادك آلياً بأدوات أمنية حقيقية،
          وتكشف الثغرات، وتشرحها بالذكاء الاصطناعي مع حلول عملية.
        </p>
      </div>

      {/* المميزات */}
      <h2 style={{ textAlign: "center", fontSize: 24, marginBottom: 18 }}>ماذا تقدّم المنصّة؟</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16, marginBottom: 40 }}>
        {features.map((f, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 34 }}>{f.icon}</div>
            <h3 style={{ margin: "10px 0 6px", color: "#1e293b" }}>{f.title}</h3>
            <p style={{ color: "#64748b", lineHeight: 1.8, margin: 0, fontSize: 14 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* كيف تعمل */}
      <h2 style={{ textAlign: "center", fontSize: 24, marginBottom: 18 }}>كيف تعمل؟</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 40 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ textAlign: "center", background: "#f8fafc", borderRadius: 14, padding: 22 }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, margin: "0 auto 12px" }}>{s.n}</div>
            <h3 style={{ margin: "0 0 6px", color: "#1e293b" }}>{s.t}</h3>
            <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>{s.d}</p>
          </div>
        ))}
      </div>

      {/* تواصل بنا */}
      <h2 style={{ textAlign: "center", fontSize: 24, marginBottom: 8 }}>تواصل بنا 📬</h2>
      <p style={{ textAlign: "center", color: "#64748b", marginBottom: 20 }}>هل لديك سؤال أو اقتراح؟ أرسل لنا رسالة.</p>
      <div style={{ maxWidth: 560, margin: "0 auto 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 26 }}>
        <input placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} />
        <input placeholder="بريدك الإلكتروني (اختياري)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} />
        <textarea placeholder="رسالتك..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} style={{ ...inp, resize: "vertical" }} />
        <button onClick={submit} disabled={sending} style={{ width: "100%", padding: 14, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {sending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
        </button>
        {status && <p style={{ marginTop: 14, textAlign: "center", color: status.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{status}</p>}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "12px", margin: "8px 0", borderRadius: 10,
  border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: 14, fontFamily: "inherit",
};