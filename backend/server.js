require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { parse } = require("csv-parse/sync");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- HELPERS ---------------- */

// Map numeric Likert values (1-5) to Low/Medium/High
function mapLikert(value) {
  const num = parseInt(value);
  if (isNaN(num)) return "Medium";
  if (num <= 2) return "Low";
  if (num >= 4) return "High";
  return "Medium";
}

// Cache for column name lookups
let _columnMap = null;

function buildColumnMap(headers) {
  const map = {};
  headers.forEach((h) => {
    const prefix = h.match(/^(SAL|CD|JA|LS|OE|JS)\d+/)?.[0];
    if (prefix) map[prefix] = h;
  });
  return map;
}

function col(d, prefix, columnMap) {
  const key = columnMap[prefix];
  if (!key) {
    console.warn(`Column prefix not found: ${prefix}`);
    return undefined;
  }
  return d[key];
}

/* ---------------- GET DATA ---------------- */

async function getData() {
  try {
    const response = await axios.get(process.env.SHEET_CSV_URL);

    const parsed = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
    });

    if (!_columnMap && parsed.length > 0) {
      _columnMap = buildColumnMap(Object.keys(parsed[0]));
      console.log("📋 Column map:", _columnMap);
    }

    console.log("✅ Data rows:", parsed.length);

    return parsed;
  } catch (err) {
    console.error("❌ Data loading error:", err.message);
    throw err;
  }
}

/* ================== APRIORI ================== */

function getSupport(transactions, itemset) {
  let count = 0;
  for (let t of transactions) {
    if (itemset.every((i) => t.includes(i))) count++;
  }
  return count / transactions.length;
}

function generateCandidates(prev, k) {
  const candidates = [];

  for (let i = 0; i < prev.length; i++) {
    for (let j = i + 1; j < prev.length; j++) {
      const a = prev[i];
      const b = prev[j];

      if (a.slice(0, k - 2).join() === b.slice(0, k - 2).join()) {
        const union = [...new Set([...a, ...b])];
        if (union.length === k) candidates.push(union);
      }
    }
  }

  return candidates;
}

// ---- FIXED: Cap max itemset size to prevent exponential explosion ----
function runApriori(transactions, minSupport = 0.2, maxK = 3) {
  console.log(
    `📊 Apriori: ${transactions.length} transactions, minSupport=${minSupport}, maxK=${maxK}`
  );
  let results = [];
  let k = 1;

  let counts = {};
  transactions.forEach((t) =>
    t.forEach((i) => (counts[i] = (counts[i] || 0) + 1))
  );

  let L = Object.keys(counts)
    .filter((i) => counts[i] / transactions.length >= minSupport)
    .map((i) => [i]);

  console.log(`  k=1: ${L.length} frequent items`);

  L.forEach((i) =>
    results.push({ items: i, support: getSupport(transactions, i) })
  );

  while (L.length && k < maxK) {
    k++;
    const t0 = Date.now();

    let candidates = generateCandidates(L, k);
    console.log(
      `  k=${k}: ${candidates.length} candidates (${Date.now() - t0}ms)`
    );

    let newL = [];

    candidates.forEach((c) => {
      const sup = getSupport(transactions, c);
      if (sup >= minSupport) {
        newL.push(c);
        results.push({ items: c, support: sup });
      }
    });

    console.log(
      `  k=${k}: ${newL.length} frequent (${Date.now() - t0}ms)`
    );
    L = newL;
  }

  console.log(`✅ Apriori done. Total frequent itemsets: ${results.length}`);
  return results;
}

/* ================== RULES ================== */

function generateRules(frequent, minConfidence = 0.4) {
  const rules = [];

  frequent.forEach((f) => {
    if (f.items.length < 2) return;

    for (let i = 0; i < f.items.length; i++) {
      const antecedent = f.items.filter((_, idx) => idx !== i);
      const consequent = [f.items[i]];

      const baseA = frequent.find(
        (x) =>
          JSON.stringify(x.items.sort()) ===
          JSON.stringify(antecedent.sort())
      );

      const baseB = frequent.find(
        (x) =>
          JSON.stringify(x.items.sort()) ===
          JSON.stringify(consequent.sort())
      );

      if (!baseA || !baseB) continue;

      const confidence = f.support / baseA.support;
      const lift = confidence / baseB.support;

      if (confidence >= minConfidence) {
        rules.push({
          antecedent,
          consequent,
          support: f.support,
          confidence,
          lift,
        });
      }
    }
  });

  return rules;
}

/* ================== INSIGHTS ================== */

async function generateInsights(topN, month, minConf, factor) {
  let data = await getData();

  if (month) {
    data = data.filter(
      (d) => new Date(d["Timestamp"]).getMonth() + 1 == month
    );
  }

  const columnMap = _columnMap;

  const transactions = data.map((d) => [
    ...Array.from({ length: 4 }, (_, i) =>
      "SAL" + (i + 1) + "_" + mapLikert(col(d, `SAL${i + 1}`, columnMap))
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      "CD" + (i + 1) + "_" + mapLikert(col(d, `CD${i + 1}`, columnMap))
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      "JA" + (i + 1) + "_" + mapLikert(col(d, `JA${i + 1}`, columnMap))
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      "LS" + (i + 1) + "_" + mapLikert(col(d, `LS${i + 1}`, columnMap))
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      "OE" + (i + 1) + "_" + mapLikert(col(d, `OE${i + 1}`, columnMap))
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      "JS" + (i + 1) + "_" + mapLikert(col(d, `JS${i + 1}`, columnMap))
    ),
  ]);

  console.log("Sample transaction:", transactions[0]);
  console.log("Unique items:", new Set(transactions.flat()).size);

  const frequent = runApriori(transactions, 0.2, 3);
  let rules = generateRules(frequent, minConf);

  rules = rules.filter((r) =>
    r.consequent.some((c) => c.startsWith("JS"))
  );

  if (factor !== "ALL") {
    rules = rules.filter((r) =>
      r.antecedent.some((a) => a.startsWith(factor))
    );
  }

  rules.sort(
    (a, b) =>
      b.lift * b.confidence * b.support -
      a.lift * a.confidence * a.support
  );

  return rules.slice(0, topN);
}

/* ---------------- API ---------------- */

app.get("/insights", async (req, res) => {
  try {
    const topN = parseInt(req.query.top) || 5;
    const month = req.query.month;
    const minConf = parseFloat(req.query.confidence) || 0.4;
    const factor = req.query.factor || "ALL";

    const rules = await generateInsights(topN, month, minConf, factor);

    const explained = rules.map((r) => {
      const level = r.consequent[0].split("_")[1];

      return {
        rule: `${r.antecedent.join(", ")} → ${r.consequent.join(", ")}`,
        explanation: `Employees with ${r.antecedent.join(", ")} conditions are associated with ${level.toLowerCase()} job satisfaction.`,
        confidence: (r.confidence * 100).toFixed(1) + "%",
        support: (r.support * 100).toFixed(1) + "%",
        lift: r.lift.toFixed(2),
      };
    });

    res.json({ insights: explained });
  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/stats", async (req, res) => {
  try {
    const data = await getData();
    const columnMap = _columnMap;

    const counts = { SAL: 0, CD: 0, JA: 0, LS: 0, OE: 0 };
    let total = 0;

    data.forEach((d) => {
      ["SAL", "CD", "JA", "LS", "OE"].forEach((key) => {
        for (let i = 1; i <= 4; i++) {
          if (mapLikert(col(d, `${key}${i}`, columnMap)) === "Low") {
            counts[key]++;
          }
          total++;
        }
      });
    });

    const result = {};
    Object.keys(counts).forEach((k) => {
      result[k] = ((counts[k] / total) * 100).toFixed(1);
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/trends", async (req, res) => {
  try {
    const data = await getData();
    const columnMap = _columnMap;

    const monthly = {};

    data.forEach((d) => {
      const month = new Date(d["Timestamp"]).getMonth() + 1;

      if (!monthly[month]) {
        monthly[month] = { total: 0, low: 0 };
      }

      for (let i = 1; i <= 4; i++) {
        if (mapLikert(col(d, `JS${i}`, columnMap)) === "Low") {
          monthly[month].low++;
        }
        monthly[month].total++;
      }
    });

    const result = Object.keys(monthly).map((m) => ({
      month: m,
      dissatisfaction: (monthly[m].low / monthly[m].total) * 100,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/report", (req, res) => {
  res.send("Report endpoint working");
});

/* ---------------- START ---------------- */

const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", (err) => {
  if (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
