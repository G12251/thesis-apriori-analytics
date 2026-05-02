import { useState } from "react";
import axios from "axios";

export default function Survey() {
  const [form, setForm] = useState({
    SAL: "Medium",
    CD: "Medium",
    JA: "Medium",
    LS: "Medium",
    OE: "Medium"
    
  });

  const [topN, setTopN] = useState(5);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await axios.post("http://localhost:5000/submit", form);

    alert("Submitted!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Employee Survey</h2>

      <form onSubmit={handleSubmit}>
        {Object.keys(form).map((key) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <label>{key}</label><br />

            <select
              onChange={(e) =>
                setForm({ ...form, [key]: e.target.value })
              }
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        ))}

        <button type="submit">Submit</button>
      </form>

      <hr />

<h3>Manager Report</h3>

<label>Number of insights:</label>
<input
  type="number"
  value={topN}
  onChange={(e) => setTopN(e.target.value)}
  style={{ marginLeft: 10 }}
/>

<br /><br />

<button
  onClick={() =>
    window.open(`http://localhost:5000/report?top=${topN}`)
  }
>
  Download Report
</button>

    </div>
  );
}