require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Apriori } = require("node-apriori");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});


app.post("/submit", async (req, res) => {
  try {
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXrdO0Qbqxv6_jhs3fwp6EGM--4_rhTIb7n5ywts9p2T-1SlyvM-sFb5o2IdzurKLc/exec";

    await axios.post(GOOGLE_SCRIPT_URL, null, {
      params: req.body
    });

    console.log("Saved to Google Sheets:", req.body);

    res.send("Saved to Google Sheets");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving to Google Sheets");
  }
});

async function getData() {
  const url = process.env.SHEET_CSV_URL;
  const response = await axios.get(url);

  const rows = response.data.split("\n").slice(1);

  return rows.map(row => {
    const [time, SAL, CD, JA, LS, OE] = row.split(",");
    return { SAL, CD, JA, LS, OE };
  });
}

async function generateInsights(topN) {
  const data = await getData();

  const transactions = data.map(d =>
    [d.SAL, d.CD, d.JA, d.LS, d.OE]
  );

  const apriori = new Apriori(0.3);
  const result = await apriori.exec(transactions);

  let rules = result.itemsets.map(item => ({
    items: item.items,
    support: item.support,
    score: item.support * item.items.length
  }));

  rules.sort((a, b) => b.score - a.score);

  return rules.slice(0, topN);
}

const PDFDocument = require("pdfkit");

app.get("/report", async (req, res) => {
  const topN = parseInt(req.query.top) || 5;

  const insights = await generateInsights(topN);

  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=report.pdf");

  doc.pipe(res);

  doc.fontSize(18).text("Report", { align: "center" });
  doc.moveDown();

insights.forEach((item, i) => {
  let text = "";

  if (item.items.includes("Low")) {
    text = "Improve factors: " + item.items.join(", ");
  } else if (item.items.includes("High")) {
    text = "Maintain strengths: " + item.items.join(", ");
  } else {
    text = "Monitor: " + item.items.join(", ");
  }

  doc.text(`${i + 1}. ${text}`);
});

  doc.end();
});