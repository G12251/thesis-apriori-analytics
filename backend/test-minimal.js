/*
  MINIMAL TEST SCRIPT
  Run with: cd backend && node test-minimal.js
*/

// ---- TINY SYNTHETIC DATASET (5 employees) ----
const tinyData = [
  { SAL1: "Low", SAL2: "Low", SAL3: "Low", SAL4: "Low", CD1: "Low", CD2: "Low", CD3: "Low", CD4: "Low", JA1: "Low", JA2: "Low", JA3: "Low", JA4: "Low", LS1: "Low", LS2: "Low", LS3: "Low", LS4: "Low", OE1: "Low", OE2: "Low", OE3: "Low", OE4: "Low", JS1: "Low", JS2: "Low", JS3: "Low", JS4: "Low" },
  { SAL1: "High", SAL2: "High", SAL3: "High", SAL4: "High", CD1: "High", CD2: "High", CD3: "High", CD4: "High", JA1: "High", JA2: "High", JA3: "High", JA4: "High", LS1: "High", LS2: "High", LS3: "High", LS4: "High", OE1: "High", OE2: "High", OE3: "High", OE4: "High", JS1: "High", JS2: "High", JS3: "High", JS4: "High" },
  { SAL1: "Low", SAL2: "Low", SAL3: "Low", SAL4: "Low", CD1: "Low", CD2: "Low", CD3: "Low", CD4: "Low", JA1: "Low", JA2: "Low", JA3: "Low", JA4: "Low", LS1: "Low", LS2: "Low", LS3: "Low", LS4: "Low", OE1: "Low", OE2: "Low", OE3: "Low", OE4: "Low", JS1: "Low", JS2: "Low", JS3: "Low", JS4: "Low" },
  { SAL1: "High", SAL2: "High", SAL3: "High", SAL4: "High", CD1: "High", CD2: "High", CD3: "High", CD4: "High", JA1: "High", JA2: "High", JA3: "High", JA4: "High", LS1: "High", LS2: "High", LS3: "High", LS4: "High", OE1: "High", OE2: "High", OE3: "High", OE4: "High", JS1: "High", JS2: "High", JS3: "High", JS4: "High" },
  { SAL1: "Medium", SAL2: "Medium", SAL3: "Medium", SAL4: "Medium", CD1: "Medium", CD2: "Medium", CD3: "Medium", CD4: "Medium", JA1: "Medium", JA2: "Medium", JA3: "Medium", JA4: "Medium", LS1: "Medium", LS2: "Medium", LS3: "Medium", LS4: "Medium", OE1: "Medium", OE2: "Medium", OE3: "Medium", OE4: "Medium", JS1: "Medium", JS2: "Medium", JS3: "Medium", JS4: "Medium" },
];

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

function getSupport(transactions, itemset) {
  let count = 0;
  for (let t of transactions) {
    if (itemset.every((i) => t.includes(i))) count++;
  }
  return count / transactions.length;
}

function hashItemset(itemset, size = 50) {
  return itemset
    .join("-")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0) % size;
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

function hashPrune(candidates, transactions, minSupport) {
  const buckets = {};
  transactions.forEach((t) => {
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 1; j < t.length; j++) {
        const h = hashItemset([t[i], t[j]]);
        buckets[h] = (buckets[h] || 0) + 1;
      }
    }
  });

  return candidates.filter((c) => {
    const h = hashItemset(c);
    return (buckets[h] || 0) / transactions.length >= minSupport;
  });
}

function reduceTransactions(transactions, frequentSets) {
  return transactions.filter((t) =>
    frequentSets.some((f) => f.every((i) => t.includes(i)))
  );
}

function runApriori(transactions, minSupport = 0.2) {
  console.log(`\n📊 Starting Apriori with ${transactions.length} transactions, minSupport=${minSupport}`);
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

  while (L.length) {
    k++;
    const t0 = Date.now();

    let candidates = generateCandidates(L, k);
    console.log(`  k=${k}: Generated ${candidates.length} candidates (${Date.now()-t0}ms)`);

    const t1 = Date.now();
    candidates = hashPrune(candidates, transactions, minSupport);
    console.log(`  k=${k}: After hashPrune ${candidates.length} candidates (${Date.now()-t1}ms)`);

    let newL = [];
    const t2 = Date.now();

    candidates.forEach((c) => {
      const sup = getSupport(transactions, c);
      if (sup >= minSupport) {
        newL.push(c);
        results.push({ items: c, support: sup });
      }
    });

    console.log(`  k=${k}: After support check ${newL.length} frequent (${Date.now()-t2}ms)`);

    transactions = reduceTransactions(transactions, newL);
    L = newL;
  }

  console.log(`✅ Apriori done. Total frequent itemsets: ${results.length}`);
  return results;
}

function generateRules(frequent, minConfidence = 0.4) {
  const rules = [];
  frequent.forEach((f) => {
    if (f.items.length < 2) return;
    for (let i = 0; i < f.items.length; i++) {
      const antecedent = f.items.filter((_, idx) => idx !== i);
      const consequent = [f.items[i]];
      const baseA = frequent.find(
        (x) => JSON.stringify(x.items.sort()) === JSON.stringify(antecedent.sort())
      );
      const baseB = frequent.find(
        (x) => JSON.stringify(x.items.sort()) === JSON.stringify(consequent.sort())
      );
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

// ---- BUILD TRANSACTIONS ----
const transactions = tinyData.map((d) => [
  ...Array.from({ length: 4 }, (_, i) => "SAL" + (i + 1) + "_" + mapLikert(d[`SAL${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "CD" + (i + 1) + "_" + mapLikert(d[`CD${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "JA" + (i + 1) + "_" + mapLikert(d[`JA${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "LS" + (i + 1) + "_" + mapLikert(d[`LS${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "OE" + (i + 1) + "_" + mapLikert(d[`OE${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "JS" + (i + 1) + "_" + mapLikert(d[`JS${i + 1}`])),
]);

console.log("Sample transaction:", transactions[0]);
console.log("Total transactions:", transactions.length);
console.log("Items per transaction:", transactions[0].length);

// ---- RUN ----
const start = Date.now();
const frequent = runApriori(transactions, 0.2);
console.log(`\n⏱️ Apriori took ${Date.now() - start}ms`);

const rules = generateRules(frequent, 0.4);
console.log(`Generated ${rules.length} rules`);

const jsRules = rules.filter((r) => r.consequent.some((c) => c.startsWith("JS")));
console.log(`Rules with JS consequent: ${jsRules.length}`);
jsRules.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i+1}. ${r.antecedent.join(", ")} → ${r.consequent.join(", ")} (conf=${(r.confidence*100).toFixed(1)}%, lift=${r.lift.toFixed(2)})`);
});
