require("dotenv").config();
const axios = require("axios");
const { parse } = require("csv-parse/sync");

function mapLikert(value) {
  const num = parseInt(value);
  if (isNaN(num)) return "Medium";
  if (num <= 2) return "Low";
  if (num >= 4) return "High";
  return "Medium";
}

function buildColumnMap(headers) {
  const map = {};
  headers.forEach((h) => {
    const prefix = h.match(/^(SAL|CD|JA|LS|OE|JS)\d+/)?.[0];
    if (prefix) map[prefix] = h;
  });
  return map;
}

function col(d, prefix, columnMap) {
  return d[columnMap[prefix]];
}

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

function runApriori(transactions, minSupport = 0.2, maxK = 3) {
  console.log(`📊 Apriori: ${transactions.length} transactions, maxK=${maxK}`);
  let results = [];
  let k = 1;

  let counts = {};
  transactions.forEach((t) => t.forEach((i) => (counts[i] = (counts[i] || 0) + 1)));

  let L = Object.keys(counts)
    .filter((i) => counts[i] / transactions.length >= minSupport)
    .map((i) => [i]);

  console.log(`  k=1: ${L.length} frequent items`);
  L.forEach((i) => results.push({ items: i, support: getSupport(transactions, i) }));

  while (L.length && k < maxK) {
    k++;
    const t0 = Date.now();
    let candidates = generateCandidates(L, k);
    console.log(`  k=${k}: ${candidates.length} candidates (${Date.now()-t0}ms)`);

    let newL = [];
    candidates.forEach((c) => {
      const sup = getSupport(transactions, c);
      if (sup >= minSupport) {
        newL.push(c);
        results.push({ items: c, support: sup });
      }
    });
    console.log(`  k=${k}: ${newL.length} frequent (${Date.now()-t0}ms)`);
    L = newL;
  }
  console.log(`✅ Done. Total frequent itemsets: ${results.length}`);
  return results;
}

function generateRules(frequent, minConfidence = 0.4) {
  const rules = [];
  frequent.forEach((f) => {
    if (f.items.length < 2) return;
    for (let i = 0; i < f.items.length; i++) {
      const antecedent = f.items.filter((_, idx) => idx !== i);
      const consequent = [f.items[i]];
      const baseA = frequent.find((x) => JSON.stringify(x.items.sort()) === JSON.stringify(antecedent.sort()));
      const baseB = frequent.find((x) => JSON.stringify(x.items.sort()) === JSON.stringify(consequent.sort()));
      if (!baseA || !baseB) continue;
      const confidence = f.support / baseA.support;
      const lift = confidence / baseB.support;
      if (confidence >= minConfidence) {
        rules.push({ antecedent, consequent, support: f.support, confidence, lift });
      }
    }
  });
  return rules;
}

async function test() {
  console.log("Fetching data...");
  const response = await axios.get(process.env.SHEET_CSV_URL, { timeout: 10000 });
  const data = parse(response.data, { columns: true, skip_empty_lines: true });
  console.log(`Loaded ${data.length} rows\n`);

  const columnMap = buildColumnMap(Object.keys(data[0]));
  console.log("Column map sample:", {
    SAL1: columnMap.SAL1?.slice(0, 40) + "...",
    JS4: columnMap.JS4?.slice(0, 40) + "...",
  });

  const transactions = data.map((d) => [
    ...Array.from({ length: 4 }, (_, i) => "SAL" + (i + 1) + "_" + mapLikert(col(d, `SAL${i + 1}`, columnMap))),
    ...Array.from({ length: 4 }, (_, i) => "CD" + (i + 1) + "_" + mapLikert(col(d, `CD${i + 1}`, columnMap))),
    ...Array.from({ length: 4 }, (_, i) => "JA" + (i + 1) + "_" + mapLikert(col(d, `JA${i + 1}`, columnMap))),
    ...Array.from({ length: 4 }, (_, i) => "LS" + (i + 1) + "_" + mapLikert(col(d, `LS${i + 1}`, columnMap))),
    ...Array.from({ length: 4 }, (_, i) => "OE" + (i + 1) + "_" + mapLikert(col(d, `OE${i + 1}`, columnMap))),
    ...Array.from({ length: 4 }, (_, i) => "JS" + (i + 1) + "_" + mapLikert(col(d, `JS${i + 1}`, columnMap))),
  ]);

  console.log("\nSample transaction:", transactions[0]);
  console.log("Unique items:", new Set(transactions.flat()).size);

  const start = Date.now();
  const frequent = runApriori(transactions, 0.2, 3);
  const rules = generateRules(frequent, 0.4);
  const jsRules = rules.filter((r) => r.consequent.some((c) => c.startsWith("JS")));

  console.log(`\n⏱️ Total time: ${Date.now() - start}ms`);
  console.log(`Total rules: ${rules.length}`);
  console.log(`JS-related rules: ${jsRules.length}`);

  jsRules.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.antecedent.join(", ")} → ${r.consequent.join(", ")} (conf=${(r.confidence*100).toFixed(1)}%, lift=${r.lift.toFixed(2)})`);
  });
}

test().catch((err) => console.error("❌ Error:", err.message));
