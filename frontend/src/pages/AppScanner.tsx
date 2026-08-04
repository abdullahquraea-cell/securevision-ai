import { useRef, useState } from "react";
import api from "../api/axios";

const ALLOWED_EXTS = [
  ".apk", ".aab", ".xapk",
  ".ipa",
  ".exe", ".dll", ".msi",
  ".elf", ".deb", ".rpm", ".appimage",
  ".dmg", ".pkg", ".app",
  ".jar",
];

const AR_LABELS: Record<string, string> = {
  app_name: "اسم التطبيق",
  package: "الحزمة (Package)",
  version_name: "النسخة",
  version_code: "رقم النسخة",
  min_sdk: "أدنى إصدار أندرويد",
  target_sdk: "الإصدار المستهدف",
  type: "النوع",
  architecture: "المعمارية",
  compile_time: "زمن الترجمة",
  product_name: "اسم المنتج",
  company: "الشركة المطوّرة",
  file_version: "نسخة الملفّ",
  file_description: "وصف الملفّ",
  copyright: "حقوق النشر",
  original_filename: "اسم الملفّ الأصلي",
};

function labelFor(k: string): string {
  return AR_LABELS[k] || k;
}

function AppScanner() {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pickFile = (f: File | null) => {
    setError("");
    setData(null);
    if (!f) {
      setFile(null);
      return;
    }
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setError("⚠️ نوع الملفّ غير مدعوم. الأنواع المدعومة: APK / IPA / EXE / DLL / MSI / ELF / DEB / DMG / PKG / APP / JAR");
      setFile(null);
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      setError("⚠️ حجم الملفّ يتجاوز 200 MB");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const runUpload = async () => {
    if (!file) {
      setError("⚠️ اختر ملفّ التطبيق أولاً");
      return;
    }
    if (!consent) {
      setError("⚠️ يجب تأكيد ملكيّة التطبيق أو الإذن بفحصه");
      return;
    }
    setError("");
    setData(null);
    setLoading(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/appscan/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      setData(res.data);
    } catch (e: any) {
      setError("⚠️ " + (e.response?.data?.detail || "فشل الفحص"));
    } finally {
      setLoading(false);
    }
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px",
    background: active ? "#3b82f6" : "#f1f5f9",
    color: active ? "#fff" : "#334155",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: 600,
  });

  return (
    <div>
      <h2 className="page-title">📱 فحص التطبيقات</h2>

      <div className="panel" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
        ⚠️ افحص فقط التطبيقات التي تملكها أو لديك إذن صريح بفحصها.
      </div>

      {/* تبديل الوضع: رفع / رابط */}
      <div className="panel">
        <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
          <button style={btnStyle(mode === "upload")} onClick={() => setMode("upload")}>
            📤 رفع ملفّ
          </button>
          <button style={btnStyle(mode === "url")} onClick={() => setMode("url")}>
            🔗 رابط (Play Store / App Store)
          </button>
        </div>

        {/* ===== وضع رفع ملف ===== */}
        {mode === "upload" && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0] || null);
              }}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#3b82f6" : "#cbd5e1"}`,
                background: dragOver ? "#eff6ff" : "#f8fafc",
                borderRadius: "12px",
                padding: "40px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all .2s",
              }}
            >
              <div style={{ fontSize: "48px" }}>📦</div>
              <div style={{ fontWeight: 600, fontSize: "16px", marginTop: "8px" }}>
                اسحب ملفّ التطبيق هنا أو اضغط للاختيار
              </div>
              <div style={{ color: "#64748b", fontSize: "13px", marginTop: "6px" }}>
                الحدّ الأقصى: 200 MB — المدعوم: APK / IPA / EXE / DLL / MSI / ELF / DEB / DMG / PKG / JAR
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_EXTS.join(",")}
                style={{ display: "none" }}
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
            </div>

            {file && (
              <div style={{
                marginTop: "14px", padding: "12px",
                background: "#f0fdfa", border: "1px solid #99f6e4",
                borderRadius: "8px", display: "flex",
                justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>📄 {file.name}</div>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                  style={{ background: "#fee2e2", color: "#b91c1c", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}
                >
                  إزالة
                </button>
              </div>
            )}

            <label style={{
              display: "flex", alignItems: "flex-start", gap: "8px",
              marginTop: "14px", padding: "12px",
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: "8px", cursor: "pointer",
            }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: "3px" }} />
              <span style={{ fontSize: "13px", color: "#78350f" }}>
                أُقرّ بأنني أملك هذا التطبيق أو لديّ إذن صريح بفحصه، وأتحمّل المسؤولية القانونية الكاملة.
              </span>
            </label>

            <button
              onClick={runUpload}
              disabled={loading || !file}
              style={{
                marginTop: "15px", padding: "12px 30px",
                background: loading || !file ? "#94a3b8" : "#3b82f6",
                color: "white", border: "none", borderRadius: "8px",
                cursor: loading || !file ? "not-allowed" : "pointer",
                fontFamily: "inherit", fontSize: "15px", fontWeight: 600,
              }}
            >
              {loading ? `⏳ جارٍ الرفع والفحص... ${progress}%` : "🚀 ابدأ الفحص"}
            </button>
          </>
        )}

        {/* ===== وضع رابط (سيُبنى في المرحلة 4) ===== */}
        {mode === "url" && (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "40px" }}>🔗</div>
            <div style={{ fontWeight: 600, marginTop: "10px" }}>الفحص عبر الرابط قيد التطوير</div>
            <div style={{ fontSize: "13px", marginTop: "6px" }}>
              سيدعم Google Play / App Store / الروابط المباشرة في مرحلة قادمة.
            </div>
          </div>
        )}

        {error && <p style={{ color: "#dc2626", marginTop: "10px" }}>{error}</p>}
      </div>

      {/* ========== النتائج ========== */}
      {data && (
        <>
          <div className="panel">
            <h3>🪪 بطاقة تعريف التطبيق</h3>
            <div style={{ display: "flex", gap: "20px", alignItems: "center", padding: "10px 0" }}>
              <div style={{ fontSize: "56px" }}>{data.type_info.icon}</div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700 }}>{data.type_info.description}</div>
                <div style={{ color: "#64748b" }}>المنصّة: {data.type_info.platform}</div>
              </div>
            </div>

            {infoRow("اسم الملفّ", data.file_name)}
            {infoRow("الحجم", data.size_readable)}
            {infoRow("النوع (Type)", data.type_info.type)}
            {infoRow("مدعوم للتحليل العميق", data.type_info.supported ? "✅ نعم" : "❌ لا")}
          </div>

          <div className="panel">
            <h3>🔐 البصمات (Hashes)</h3>
            {infoRow("MD5", data.hashes.md5)}
            {infoRow("SHA1", data.hashes.sha1)}
            {infoRow("SHA256", data.hashes.sha256)}
          </div>

          <div className="panel">
            <h3>📊 تحليل العشوائيّة (Entropy)</h3>
            {infoRow("القيمة (0-8)", data.entropy.value)}
            {infoRow("التقييم", data.entropy.note)}
            <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
              كلّما اقتربت من 8 دلّ ذلك على أنّ الملفّ مضغوط أو مشفَّر (قد يخفي محتوى).
            </div>
          </div>

          <div className="panel" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            ℹ️ {data.message}
          </div>

          {/* ========== التحليل العميق ========== */}
          {data.deep && !data.deep.error && (
            <>
              {/* درجة المخاطرة */}
              {data.deep.risk_score && (
                <div className="panel" style={{
                  background: data.deep.risk_score.score >= 70 ? "#fef2f2" :
                              data.deep.risk_score.score >= 40 ? "#fffbeb" :
                              data.deep.risk_score.score >= 20 ? "#f0f9ff" : "#f0fdf4",
                  border: `2px solid ${
                    data.deep.risk_score.score >= 70 ? "#fca5a5" :
                    data.deep.risk_score.score >= 40 ? "#fcd34d" :
                    data.deep.risk_score.score >= 20 ? "#93c5fd" : "#86efac"
                  }`,
                }}>
                  <h3>🎯 درجة المخاطرة</h3>
                  <div style={{ fontSize: "56px", fontWeight: 700, textAlign: "center", margin: "10px 0" }}>
                    {data.deep.risk_score.score} / 100
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 600, textAlign: "center", marginBottom: "15px" }}>
                    المستوى: {data.deep.risk_score.level}
                  </div>
                  {data.deep.risk_score.reasons?.length > 0 && (
                    <ul style={{ margin: 0, paddingInlineStart: "20px" }}>
                      {data.deep.risk_score.reasons.map((r: string, i: number) => (
                        <li key={i} style={{ padding: "4px 0" }}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* معلومات التطبيق */}
              {data.deep.info && (
                <div className="panel">
                  <h3>📋 معلومات التطبيق</h3>
                  {Object.entries(data.deep.info).map(([k, v]) =>
                    v ? <div key={k}>{infoRow(labelFor(k), v as any)}</div> : null
                  )}
                </div>
              )}

              {/* التوقيع الرقمي (PE) */}
              {data.deep.signed && (
                <div className="panel">
                  <h3>✍️ التوقيع الرقمي</h3>
                  {infoRow("موقّع رقمياً", data.deep.signed.signed ? "✅ نعم" : "❌ لا")}
                  {data.deep.signed.size_bytes && infoRow("حجم التوقيع", data.deep.signed.size_bytes + " byte")}
                </div>
              )}

              {/* الشهادات (APK) */}
              {data.deep.certificates && data.deep.certificates.length > 0 && (
                <div className="panel">
                  <h3>🪪 الشهادة الرقمية</h3>
                  {data.deep.certificates.map((c: any, i: number) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      {infoRow("المُصدر (Issuer)", c.issuer)}
                      {infoRow("الموضوع (Subject)", c.subject)}
                      {infoRow("SHA256", c.sha256)}
                    </div>
                  ))}
                </div>
              )}

              {/* الرايات الخطرة (APK) */}
              {data.deep.flags && (
                <div className="panel">
                  <h3>🚩 الرايات الأمنية</h3>
                  {infoRow("وضع Debug", data.deep.flags.debuggable ? "⚠️ مُفعَّل (خطر)" : "✅ معطَّل")}
                  {infoRow("النسخ الاحتياطي", data.deep.flags.allow_backup ? "⚠️ مسموح" : "✅ ممنوع")}
                </div>
              )}

              {/* الصلاحيات (APK) */}
              {data.deep.permissions && (
                <div className="panel">
                  <h3>🔓 الصلاحيات ({data.deep.permissions.total})</h3>
                  <div style={{ marginBottom: "12px", color: "#64748b" }}>
                    عاديّة: {data.deep.permissions.normal_count} · خطرة: {data.deep.permissions.dangerous.length}
                  </div>
                  {data.deep.permissions.dangerous.length === 0 ? (
                    <p style={{ color: "#16a34a" }}>✅ لا صلاحيات خطرة</p>
                  ) : (
                    data.deep.permissions.dangerous.map((p: any, i: number) => (
                      <div key={i} style={{ padding: "10px", background: "#fef2f2", borderRadius: "6px", marginBottom: "6px", border: "1px solid #fecaca" }}>
                        <div style={{ fontWeight: 600, color: "#991b1b" }}>⚠️ {p.description}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", direction: "ltr" }}>{p.name}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* المكوّنات (APK) */}
              {data.deep.components && (
                <div className="panel">
                  <h3>🧱 مكوّنات التطبيق</h3>
                  {infoRow("الأنشطة (Activities)", data.deep.components.activities)}
                  {infoRow("الخدمات (Services)", data.deep.components.services)}
                  {infoRow("المستقبِلات (Receivers)", data.deep.components.receivers)}
                  {infoRow("المزوّدات (Providers)", data.deep.components.providers)}
                </div>
              )}

              {/* APIs مشبوهة (PE) */}
              {data.deep.suspicious_apis && data.deep.suspicious_apis.length > 0 && (
                <div className="panel">
                  <h3>⚠️ واجهات APIs مشبوهة ({data.deep.suspicious_apis.length})</h3>
                  {data.deep.suspicious_apis.map((a: any, i: number) => (
                    <div key={i} style={{ padding: "10px", background: "#fef2f2", borderRadius: "6px", marginBottom: "6px", border: "1px solid #fecaca" }}>
                      <div style={{ fontWeight: 600, color: "#991b1b", direction: "ltr", textAlign: "right" }}>{a.api}</div>
                      <div style={{ fontSize: "13px" }}>{a.description}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", direction: "ltr", textAlign: "right" }}>{a.dll}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* المكتبات (PE) */}
              {data.deep.imports && data.deep.imports.dlls?.length > 0 && (
                <div className="panel">
                  <h3>📚 المكتبات المستوردة ({data.deep.imports.total_dlls})</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {data.deep.imports.dlls.map((d: string, i: number) => (
                      <span key={i} style={{
                        padding: "4px 10px", background: "#f1f5f9", borderRadius: "6px",
                        fontSize: "12px", fontFamily: "monospace", direction: "ltr",
                      }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* المقاطع (PE) */}
              {data.deep.sections && data.deep.sections.length > 0 && (
                <div className="panel">
                  <h3>📦 المقاطع (Sections)</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", direction: "ltr" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9" }}>
                          <th style={{ padding: "8px", textAlign: "left" }}>Name</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Size</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Entropy</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.deep.sections.map((s: any, i: number) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px", fontFamily: "monospace" }}>{s.name}</td>
                            <td style={{ padding: "8px" }}>{s.size}</td>
                            <td style={{ padding: "8px", color: s.suspicious ? "#dc2626" : "inherit" }}>{s.entropy}</td>
                            <td style={{ padding: "8px" }}>{s.suspicious ? "⚠️ مشبوه" : "✅ عادي"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* المفاتيح المسرّبة (APK) */}
              {data.deep.secrets && data.deep.secrets.length > 0 && (
                <div className="panel" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <h3>🔑 مفاتيح/رموز مسرّبة ({data.deep.secrets.length})</h3>
                  {data.deep.secrets.map((s: any, i: number) => (
                    <div key={i} style={{ padding: "8px", borderBottom: "1px solid #fecaca" }}>
                      <div style={{ fontWeight: 600, color: "#991b1b" }}>🔑 {s.type}</div>
                      <div style={{ fontSize: "12px", direction: "ltr", textAlign: "right", fontFamily: "monospace" }}>{s.value}</div>
                      {s.file && <div style={{ fontSize: "11px", color: "#64748b", direction: "ltr", textAlign: "right" }}>{s.file}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* روابط و IPs ومفاتيح (PE) */}
              {data.deep.strings && (
                <>
                  {data.deep.strings.secrets?.length > 0 && (
                    <div className="panel" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                      <h3>🔑 مفاتيح مسرّبة ({data.deep.strings.secrets.length})</h3>
                      {data.deep.strings.secrets.map((s: any, i: number) => (
                        <div key={i} style={{ padding: "8px", borderBottom: "1px solid #fecaca" }}>
                          <div style={{ fontWeight: 600, color: "#991b1b" }}>🔑 {s.type}</div>
                          <div style={{ fontSize: "12px", direction: "ltr", textAlign: "right", fontFamily: "monospace" }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {data.deep.strings.urls?.length > 0 && (
                    <div className="panel">
                      <h3>🌐 روابط مضمّنة ({data.deep.strings.urls.length})</h3>
                      {data.deep.strings.urls.map((u: string, i: number) => (
                        <div key={i} style={{ padding: "4px 0", direction: "ltr", fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>{u}</div>
                      ))}
                    </div>
                  )}
                  {data.deep.strings.ips?.length > 0 && (
                    <div className="panel">
                      <h3>📡 عناوين IP مضمّنة ({data.deep.strings.ips.length})</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {data.deep.strings.ips.map((ip: string, i: number) => (
                          <span key={i} style={{ padding: "4px 10px", background: "#f1f5f9", borderRadius: "6px", fontFamily: "monospace", fontSize: "12px", direction: "ltr" }}>{ip}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {data.deep && data.deep.error && (
            <div className="panel" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              ⚠️ {data.deep.error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function infoRow(label: string, value: any) {
  return (
    <div style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "220px", color: "#64748b", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, direction: "ltr", textAlign: "right", wordBreak: "break-all" }}>
        {value === undefined || value === null || value === "" ? "—" : String(value)}
      </span>
    </div>
  );
}

export default AppScanner;