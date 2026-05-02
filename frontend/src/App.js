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
  Cell,
} from "recharts";

const API = "http://localhost:3001";

const FACTOR_LABELS = {
  SAL: "Salary",
  CD: "Career",
  JA: "Autonomy",
  LS: "Leadership",
  OE: "Environment",
};

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

function ConfidenceBadge({ value }) {
  const num = parseFloat(value);
  const color = num >= 80 ? "#10b981" : num >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <span style={{ ...badge, background: color + "22", color }}>
      🎯 {value}
    </span>
  );
}

function LiftBadge({ value }) {
  const num = parseFloat(value);
  const color = num >= 1.5 ? "#6366f1" : "#94a3b8";
  return (
    <span style={{ ...badge, background: color + "22", color }}>
      🚀 Lift {value}
    </span>
  );
}

function SupportBadge({ value }) {
  return (
    <span style={{ ...badge, background: "#0ea5e922", color: "#0ea5e9" }}>
      📊 {value}
    </span>
  );
}

export default function App() {
  const [topN, setTopN] = useState(5);
  const [month, setMonth] = useState("");
  const [factor, setFactor] = useState("ALL");
  const [confidence, setConfidence] = useState(0.4);

  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const fetchAll = async () => {
    if (!topN || topN <= 0) return alert("Enter a valid number of insights");

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Insights
      const res = await axios.get(
        `${API}/insights?top=${topN}&month=${month}&confidence=${confidence}&factor=${factor}`,
      );
      setInsights(res.data.insights || []);
      if (res.data.message) setMessage(res.data.message);

      // Stats
      const statsRes = await axios.get(`${API}/stats`);
      const statsArr = Object.entries(statsRes.data).map(([k, v], i) => ({
        name: FACTOR_LABELS[k] || k,
        value: parseFloat(v),
        color: BAR_COLORS[i % BAR_COLORS.length],
      }));
      setStats(statsArr);

      // Trends
      const trendRes = await axios.get(`${API}/trends`);
      const cleanTrend = (trendRes.data || []).map((t) => ({
        month: `M${t.month}`,
        dissatisfaction: Number(t.dissatisfaction || 0),
      }));
      setTrends(cleanTrend);
      setAnalyzed(true);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Failed to connect to server. Is it running on port 3001?";
      setError(msg);
      console.error("Fetch error:", err);
    }

    setLoading(false);
  };

  const openReport = () => {
    window.open(`${API}/report?top=${topN}&month=${month}`, "_blank");
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipBox}>
          <p style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>
            {label}
          </p>
          <p style={{ margin: "4px 0 0", color: "#6366f1" }}>
            {payload[0].value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={container}>
      {/* Header */}
      <div style={header}>
        <div style={headerInner}>
          <div style={headerIcon}>📈</div>
          <div>
            <h1 style={headerTitle}>Manager Analytics</h1>
            <p style={headerSub}>Association Rule Mining Dashboard</p>
          </div>
        </div>
      </div>

      <div style={content}>
        {/* Controls Card */}
        <div style={card}>
          <h2 style={sectionTitle}>⚙️ Analysis Controls</h2>

          <div style={grid2}>
            <div style={fieldGroup}>
              <label style={label}>Top N Insights</label>
              <input
                type="number"
                value={topN}
                min={1}
                max={20}
                onChange={(e) => setTopN(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={label}>Filter by Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={inputStyle}
              >
                <option value="">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={label}>Factor Filter</label>
              <select
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                style={inputStyle}
              >
                <option value="ALL">All Factors</option>
                <option value="SAL">Salary</option>
                <option value="CD">Career Development</option>
                <option value="JA">Job Autonomy</option>
                <option value="LS">Leadership Style</option>
                <option value="OE">Office Environment</option>
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={label}>
                Confidence Threshold:{" "}
                <strong style={{ color: "#6366f1" }}>
                  {(confidence * 100).toFixed(0)}%
                </strong>
              </label>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <div style={sliderLabels}>
                <span>30%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div style={btnRow}>
            <button onClick={fetchAll} style={btnPrimary} disabled={loading}>
              {loading ? (
                <span>⏳ Analyzing…</span>
              ) : (
                <span>🔍 Run Analysis</span>
              )}
            </button>
            <button
              onClick={openReport}
              style={btnSecondary}
              disabled={!analyzed}
            >
              📄 Open Report
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={errorBox}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {/* Info message */}
        {message && !error && (
          <div style={infoBox}>
            <strong>ℹ️</strong> {message}
          </div>
        )}

        {/* Insights */}
        {analyzed && (
          <div style={card}>
            <h2 style={sectionTitle}>💡 Key Insights</h2>

            {insights.length === 0 ? (
              <div style={emptyState}>
                <p style={{ fontSize: 40, margin: 0 }}>🔍</p>
                <p style={{ color: "#94a3b8", marginTop: 8 }}>
                  No insights found. Try lowering the confidence threshold.
                </p>
              </div>
            ) : (
              <div style={insightsList}>
                {insights.map((ins, idx) => (
                  <div key={idx} style={insightCard}>
                    <div style={insightHeader}>
                      <span style={insightNum}>#{idx + 1}</span>
                      <div style={badgeRow}>
                        <ConfidenceBadge value={ins.confidence} />
                        <SupportBadge value={ins.support} />
                        <LiftBadge value={ins.lift} />
                      </div>
                    </div>

                    <p style={ruleText}>{ins.rule}</p>
                    <p style={explanationText}>{ins.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        {analyzed && stats.length > 0 && (
          <div style={chartGrid}>
            {/* Bar chart */}
            <div style={card}>
              <h2 style={sectionTitle}>📊 Problem Factors (%)</h2>
              <p style={chartDesc}>Percentage of "Low" responses per factor</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {stats.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line chart */}
            <div style={card}>
              <h2 style={sectionTitle}>📉 Dissatisfaction Trend</h2>
              <p style={chartDesc}>Monthly job dissatisfaction rate (%)</p>
              {trends.length === 0 ? (
                <div style={emptyState}>
                  <p style={{ color: "#94a3b8" }}>
                    No trend data (timestamps may be missing or unparseable)
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={trends}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="dissatisfaction"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: "#6366f1", r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- STYLES -------------------- */

const container = {
  minHeight: "100vh",
  background: "#f8fafc",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const header = {
  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  padding: "24px 32px",
  color: "white",
};

const headerInner = {
  maxWidth: 1100,
  margin: "auto",
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const headerIcon = {
  fontSize: 40,
  background: "rgba(255,255,255,0.15)",
  padding: "10px 14px",
  borderRadius: 14,
};

const headerTitle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: "-0.5px",
};

const headerSub = {
  margin: "4px 0 0",
  opacity: 0.8,
  fontSize: 14,
};

const content = {
  maxWidth: 1100,
  margin: "32px auto",
  padding: "0 24px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const card = {
  background: "white",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)",
  border: "1px solid #f1f5f9",
};

const sectionTitle = {
  margin: "0 0 16px",
  fontSize: 18,
  fontWeight: 700,
  color: "#1e293b",
};

const chartDesc = {
  margin: "-12px 0 16px",
  fontSize: 13,
  color: "#94a3b8",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const fieldGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const label = {
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  color: "#1e293b",
  background: "#f8fafc",
  outline: "none",
  transition: "border-color 0.2s",
};

const sliderStyle = {
  width: "100%",
  accentColor: "#6366f1",
  cursor: "pointer",
};

const sliderLabels = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 2,
};

const btnRow = {
  display: "flex",
  gap: 12,
  marginTop: 20,
  flexWrap: "wrap",
};

const btnPrimary = {
  flex: 1,
  minWidth: 140,
  padding: "12px 20px",
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  color: "white",
  border: "none",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const btnSecondary = {
  flex: 1,
  minWidth: 140,
  padding: "12px 20px",
  background: "white",
  color: "#4f46e5",
  border: "2px solid #4f46e5",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.2s",
};

const errorBox = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#dc2626",
  padding: "14px 18px",
  borderRadius: 10,
  fontSize: 14,
};

const infoBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  padding: "14px 18px",
  borderRadius: 10,
  fontSize: 14,
};

const insightsList = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const insightCard = {
  background: "#fafafa",
  border: "1px solid #e2e8f0",
  borderLeft: "4px solid #6366f1",
  borderRadius: 10,
  padding: 16,
};

const insightHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
  flexWrap: "wrap",
  gap: 8,
};

const insightNum = {
  fontSize: 13,
  fontWeight: 700,
  color: "#6366f1",
  background: "#ede9fe",
  padding: "3px 10px",
  borderRadius: 20,
};

const badgeRow = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const badge = {
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 20,
};

const ruleText = {
  margin: "0 0 6px",
  fontSize: 14,
  fontWeight: 600,
  color: "#1e293b",
  fontFamily: "monospace",
  background: "#f8fafc",
  padding: "8px 12px",
  borderRadius: 6,
  wordBreak: "break-word",
};

const explanationText = {
  margin: 0,
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.5,
};

const emptyState = {
  textAlign: "center",
  padding: "32px 0",
};

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: 24,
};

const tooltipBox = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "8px 14px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};
