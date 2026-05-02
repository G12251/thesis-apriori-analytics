/*
  FIXED MINIMAL TEST - caps itemset size at k=3
  Run: cd backend && node test-fixed.js
*/

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

// ---- FIXED: Cap max itemset size ----
function runApriori(transactions, minSupport = 0.2, maxK = 3) {
  console.log(`\n📊 Apriori: ${transactions.length} transactions, minSupport=${minSupport}, maxK=${maxK}`);
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
    console.log(`  k=${k}: ${candidates.length} candidates generated (${Date.now()-t0}ms)`);

    let newL = [];
    candidates.forEach((c) => {
      const sup = getSupport(transactions, c);
      if (sup >= minSupport) {
        newL.push(c);
        results.push({ items: c, support: sup });
      }
    });
    console.log(`  k=${k}: ${newL.length} frequent itemsets (${Date.now()-t0}ms)`);

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

// ---- SYNTHETIC UNIFORM DATA (worst case) ----
const uniformData = Array.from({ length: 60 }, () => ({
  SAL1:"Low",SAL2:"Low",SAL3:"Low",SAL4:"Low",
  CD1:"Low",CD2:"Low",CD3:"Low",CD4:"Low",
  JA1:"Low",JA2:"Low",JA3:"Low",JA4:"Low",
  LS1:"Low",LS2:"Low",LS3:"Low",LS4:"Low",
  OE1:"Low",OE2:"Low",OE3:"Low",OE4:"Low",
  JS1:"Low",JS2:"Low",JS3:"Low",JS4:"Low"
}));

const transactions = uniformData.map((d) => [
  ...Array.from({ length: 4 }, (_, i) => "SAL" + (i + 1) + "_" + mapLikert(d[`SAL${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "CD" + (i + 1) + "_" + mapLikert(d[`CD${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "JA" + (i + 1) + "_" + mapLikert(d[`JA${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "LS" + (i + 1) + "_" + mapLikert(d[`LS${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "OE" + (i + 1) + "_" + mapLikert(d[`OE${i + 1}`])),
  ...Array.from({ length: 4 }, (_, i) => "JS" + (i + 1) + "_" + mapLikert(d[`JS${i + 1}`])),
]);

console.log("=== TESTING WITH UNIFORM DATA (60 identical responses) ===");
console.log("This is the WORST case for Apriori.");

const start = Date.now();
const frequent = runApriori(transactions, 0.2, 3); // maxK=3
console.log(`\n⏱️ Total Apriori time: ${Date.now() - start}ms`);

const rules = generateRules(frequent, 0.4);
console.log(`Generated ${rules.length} rules`);

const jsRules = rules.filter((r) => r.consequent.some((c) => c.startsWith("JS")));
console.log(`Rules with JS consequent: ${jsRules.length}`);
jsRules.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i+1}. ${r.antecedent.join(", ")} → ${r.consequent.join(", ")}`);
});
