require("dotenv").config();
const axios = require("axios");
const { parse } = require("csv-parse/sync");

async function test() {
  console.log("Fetching first few rows of raw CSV data...\n");
  const response = await axios.get(process.env.SHEET_CSV_URL, { timeout: 10000 });
  const data = parse(response.data, { columns: true, skip_empty_lines: true });
  
  console.log("Total rows:", data.length);
  console.log("\nColumn names:", Object.keys(data[0]).join(", "));
  console.log("\n--- First 3 rows (raw values) ---");
  
  for (let i = 0; i < Math.min(3, data.length); i++) {
    const row = data[i];
    console.log(`\nRow ${i+1}:`);
    ['SAL1', 'SAL2', 'CD1', 'JA1', 'LS1', 'OE1', 'JS1'].forEach(col => {
      console.log(`  ${col}: "${row[col]}"`);
    });
  }
}

test().catch(err => console.error("Error:", err.message));
