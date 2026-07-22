import { useEffect, useState } from "react";
import api from "../api/axios";

const severityLabel: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
  info: "معلومة",
};

function AI() {
  const [findings, setFindings] = useState<any[]>([]);

  // تحليل ثغرة
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // المساعد الأمني
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    api.get("/findings").then((res) => setFindings(res.data)).catch(() => {});
  }, []);

  const analyzeFinding = async (id: number) => {
    setSelectedId(id);
    setAnalyzing(true);
    setAnalysis("");
    try {
    const res = await api.post(`/ai/analyze/${id}`);
    const prefix = res.data.cached ? "💾 (تحليل محفوظ)\n\n" : "";
      setAnalysis(prefix + res.data.analysis);
    } catch (error: any) {
      setAnalysis("⚠️ " + (error.response?.data?.detail || "فشل التحليل"));
    } finally {
      setAnalyzing(false);
    }
  };

    const askAssistant = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    try {
      const res = await api.post("/ai/ask", { question: question });
      setAnswer(res.data.answer);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      let msg = "فشل المساعد";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg).join(" | ");
      } else if (!error.response) {
        msg = "لا يوجد اتصال بالسيرفر";
      }
      setAnswer("⚠️ " + msg);
    } finally {
      setAsking(false);
    }
  };
  
  const boxStyle = {
    marginTop: "15px",
    padding: "15px",
    background: "#faf5ff",
    borderRadius: "8px",
    borderRight: "4px solid #7c3aed",
    whiteSpace: "pre-wrap" as const,
    lineHeight: "1.8",
    fontSize: "14px",
  };

  return (
    <div>
      <h2 className="page-title">🤖 الذكاء الاصطناعي</h2>

      {/* المساعد الأمني */}
      <div className="panel">
        <h3>💬 المساعد الأمني الذكي</h3>
        <p style={{ color: "#64748b", marginTop: 0 }}>
          اسأل أي سؤال في الأمن السيبراني واحصل على إجابة فورية من Claude AI
        </p>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="مثال: ما هي ثغرة SQL Injection وكيف أحمي موقعي منها؟"
          rows={3}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontFamily: "inherit",
            fontSize: "14px",
            resize: "vertical",
          }}
        />

        <button
          onClick={askAssistant}
          disabled={asking}
          style={{
            marginTop: "10px",
            padding: "10px 25px",
            background: asking ? "#94a3b8" : "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: asking ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {asking ? "⏳ جارٍ التفكير..." : "اسأل المساعد"}
        </button>

        {answer && <div style={boxStyle}>{answer}</div>}
      </div>

      {/* تحليل الثغرات */}
      <div className="panel">
        <h3>🔍 تحليل الثغرات بالذكاء الاصطناعي</h3>

        {findings.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            لا توجد ثغرات — شغّل فحصاً أولاً من صفحة الفحص الأمني
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>الخطورة</th>
                <th>المشروع</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id}>
                  <td>{f.title}</td>
                  <td>{severityLabel[f.severity] || f.severity}</td>
                  <td>{f.project_name}</td>
                  <td>
                    <button
                      onClick={() => analyzeFinding(f.id)}
                      disabled={analyzing}
                      style={{
                        padding: "5px 14px",
                        background: "#ede9fe",
                        color: "#7c3aed",
                        border: "none",
                        borderRadius: "6px",
                        cursor: analyzing ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      🤖 حلّل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* نتيجة التحليل */}
        {selectedId !== null && (
          <div style={{ marginTop: "20px" }}>
            <h4>
              نتيجة تحليل الثغرة #{selectedId}
              {analyzing && " — ⏳ جارٍ التحليل..."}
            </h4>
            {analysis && <div style={boxStyle}>{analysis}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default AI;