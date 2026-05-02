import { useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [topN, setTopN] = useState(5);
  const [month, setMonth] = useState("");
  const [factor, setFactor] = useState("ALL");
  const [confidence, setConfidence] = useState(0.6);

  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    if (!topN || topN <= 0) return alert("Enter number of insights");

    setLoading(true);

    try {
      const res = await axios.get(
        `http://localhost:5000/insights?top=${topN}&month=${month}&confidence=${confidence}&factor=${factor}`,
      );

      setInsights(res.data.insights || []);

      // STATS
      const statsRes = await axios.get("http://localhost:5000/stats");

      const labelMap = {
        SAL: "Salary",
        CD: "Career",
        JA: "Autonomy",
        LS: "Leadership",
        OE: "Environment",
      };

      const statsArr = Object.entries(statsRes.data).map(([k, v]) => ({
        name: labelMap[k],
        value: v,
      }));

      setStats(statsArr);

      // TRENDS
      const trendRes = await axios.get("http://localhost:5000/trends");

      const cleanTrend = (trendRes.data || []).map((t) => ({
        month: `M${t.month}`,
        dissatisfaction: Number(t.dissatisfaction || 0),
      }));

      setTrends(cleanTrend);
    } catch (err) {
      console.error(err);
      alert("Error loading data");
    }

    setLoading(false);
  };

  const downloadPDF = async () => {
    const res = await axios.get(
      `http://localhost:5000/report?top=${topN}&month=${month}`,
      { responseType: "blob" },
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Manager_Report.pdf";
    link.click();
  };

  return (
    <div style={container}>
      <h1 style={title}>Manager Analytics Dashboard</h1>

      {/* CONTROLS */}
      <div style={card}>
        <h3>Analysis Controls</h3>

        <div style={row}>
          <input
            type="number"
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            style={input}
            placeholder="Top insights"
          />

          <select onChange={(e) => setMonth(e.target.value)} style={input}>
            <option value="">All Months</option>
            <option value="1">Jan</option>
            <option value="2">Feb</option>
            <option value="3">Mar</option>
            <option value="4">Apr</option>
          </select>
        </div>

        <div style={row}>
          <select onChange={(e) => setFactor(e.target.value)} style={input}>
            <option value="ALL">All Factors</option>
            <option value="SAL">Salary</option>
            <option value="CD">Career</option>
            <option value="JA">Autonomy</option>
            <option value="LS">Leadership</option>
            <option value="OE">Environment</option>
          </select>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Confidence Threshold: {confidence}</label>
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.05"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div style={row}>
          <button onClick={fetchAll} style={btnPrimary} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>

          <button onClick={downloadPDF} style={btnSecondary}>
            Download Report
          </button>
        </div>
      </div>

      {/* INSIGHTS */}
      <div style={card}>
        <h3>Key Insights</h3>

        {insights.length === 0 ? (
          <p style={empty}>No insights yet</p>
        ) : (
          insights.map((i, idx) => (
            <div key={idx} style={insightCard}>
              <h4>Insight {idx + 1}</h4>

              <p style={{ fontWeight: "bold" }}>{i.rule}</p>
              <p>{i.explanation}</p>

              <div style={metrics}>
                <span>📊 {i.support}</span>
                <span>🎯 {i.confidence}</span>
                <span>🚀 Lift: {i.lift}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CHARTS */}
      <div style={chartRow}>
        <div style={chartCard}>
          <h3>Problem Factors (%)</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" fill="#4CAF50" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={chartCard}>
          <h3>Dissatisfaction Trend</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="dissatisfaction"
                stroke="#2196F3"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const container = {
  padding: 30,
  background: "#f4f6f9",
  minHeight: "100vh",
  maxWidth: 1100,
  margin: "auto",
  fontFamily: "Segoe UI",
};

const title = { textAlign: "center", marginBottom: 20 };

const card = {
  background: "white",
  padding: 20,
  marginBottom: 20,
  borderRadius: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const insightCard = {
  background: "#fff",
  padding: 15,
  borderRadius: 10,
  marginBottom: 10,
  borderLeft: "5px solid #2196F3",
};

const metrics = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 10,
  fontSize: 14,
};

const chartCard = { ...card, flex: 1 };
const chartRow = { display: "flex", gap: 20, flexWrap: "wrap" };
const row = { display: "flex", gap: 10, marginTop: 10 };

const input = {
  flex: 1,
  padding: 10,
  borderRadius: 6,
  border: "1px solid #ccc",
};

const btnPrimary = {
  flex: 1,
  padding: 12,
  background: "#2196F3",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const btnSecondary = {
  flex: 1,
  padding: 12,
  background: "#4CAF50",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const empty = {
  color: "#888",
  fontStyle: "italic",
};

export default App;
