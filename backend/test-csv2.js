require("dotenv").config();
const axios = require("axios");
const { parse } = require("csv-parse/sync");

async function test() {
  const response = await axios.get(process.env.SHEET_CSV_URL, { timeout: 10000 });
  const data = parse(response.data, { columns: true, skip_empty_lines: true });
  
  // Find actual column names matching the patterns
  const cols = Object.keys(data[0]);
  const sal1 = cols.find(c => c.startsWith("SAL1"));
  const sal2 = cols.find(c => c.startsWith("SAL2"));
  const cd1 = cols.find(c => c.startsWith("CD1"));
  const js1 = cols.find(c => c.startsWith("JS1"));
  const js4 = cols.find(c => c.startsWith("JS4"));
  
  console.log("Matched columns:");
  console.log("  SAL1:", sal1);
  console.log("  SAL2:", sal2);
  console.log("  CD1:", cd1);
  console.log("  JS1:", js1);
  console.log("  JS4:", js4);
  
  console.log("\n--- First 5 rows (actual values) ---");
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    console.log(`\nRow ${i+1}:`);
    console.log(`  ${sal1}: "${row[sal1]}"`);
    console.log(`  ${sal2}: "${row[sal2]}"`);
    console.log(`  ${cd1}: "${row[cd1]}"`);
    console.log(`  ${js1}: "${row[js1]}"`);
    console.log(`  ${js4}: "${row[js4]}"`);
  }
  
  // Check unique values for a few questions
  const uniqueSAL1 = [...new Set(data.map(r => r[sal1]))];
  const uniqueJS1 = [...new Set(data.map(r => r[js1]))];
  console.log("\nUnique SAL1 values:", uniqueSAL1);
  console.log("Unique JS1 values:", uniqueJS1);
}

test().catch(err => console.error("Error:", err.message));
