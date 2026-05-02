require("dotenv").config();
const axios = require("axios");
const { parse } = require("csv-parse/sync");

function mapLikert(value) {
  if (!value) return "Medium";
  value = value.toLowerCase().trim();
  if (value.includes("strongly disagree")) return "Low";
  if (value.includes("disagree")) return "Low";
  if (value.includes("strongly agree")) return "High";
  if (value.includes("agree")) return "High";
  if (value.includes("neutral")) return "Medium";
  return "Medium";
}

async function test() {
  console.log("Fetching data from Google Sheets...");
  const response = await axios.get(process.env.SHEET_CSV_URL, { timeout: 10000 });
  const data = parse(response.data, { columns: true, skip_empty_lines: true });
  console.log(`✅ Loaded ${data.length} rows`);

  // Use only first N rows for minimal test
  const limit = 20;
  const subset = data.slice(0, limit);
  console.log(`Testing with first ${subset.length} rows...`);

  const transactions = subset.map((d) => [
    ...Array.from({ length: 4 }, (_, i) => "SAL" + (i + 1) + "_" + mapLikert(d[`SAL${i + 1}`])),
    ...Array.from({ length: 4 }, (_, i) => "CD" + (i + 1) + "_" + mapLikert(d[`CD${i + 1}`])),
    ...Array.from({ length: 4 }, (_, i) => "JA" + (i + 1) + "_" + mapLikert(d[`JA${i + 1}`])),
    ...Array.from({ length: 4 }, (_, i) => "LS" + (i + 1) + "_" + mapLikert(d[`LS${i + 1}`])),
    ...Array.from({ length: 4 }, (_, i) => "OE" + (i + 1) + "_" + mapLikert(d[`OE${i + 1}`])),
    ...Array.from({ length: 4 }, (_, i) => "JS" + (i + 1) + "_" + mapLikert(d[`JS${i + 1}`])),
  ]);

  console.log("Items per transaction:", transactions[0].length);
  console.log("Unique items:", new Set(transactions.flat()).size);

  // Simple 1-itemset count
  const counts = {};
  transactions.forEach((t) => t.forEach((i) => (counts[i] = (counts[i] || 0) + 1)));
  const frequent1 = Object.keys(counts).filter((i) => counts[i] / transactions.length >= 0.2);
  console.log(`Frequent 1-itemsets (minSupport=0.2): ${frequent1.length}`);

  // Check if we'd explode
  const pairs = (frequent1.length * (frequent1.length - 1)) / 2;
  console.log(`Potential k=2 candidates: ${pairs}`);
  console.log("\n💡 If frequent1 > 30, k=2 will generate 400+ candidates and likely hang for k>=3");
}

test().catch((err) => console.error("❌ Error:", err.message));
