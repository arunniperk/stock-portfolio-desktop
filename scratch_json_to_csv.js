const fs = require('fs');

function convert() {
  const file = "C:\\Users\\Arun\\Portfolio\\pm_portfolios.json";
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const portfolios = JSON.parse(raw);
    
    // Use the first portfolio's holdings
    const holdings = portfolios[0].holdings;
    console.log("Found " + holdings.length + " holdings");
    
    const csvLines = ["Symbol,Name,Qty,Buy Price"];
    holdings.forEach(h => {
      // Escape commas in names
      const name = h.name.includes(',') ? `"${h.name}"` : h.name;
      csvLines.push(`${h.symbol},${name},${h.qty},${h.buyPrice}`);
    });
    
    fs.writeFileSync("C:\\Users\\Arun\\Documents\\portfolio_recovered.csv", csvLines.join("\n"));
    console.log("Created C:\\Users\\Arun\\Documents\\portfolio_recovered.csv");
  } catch (e) {
    console.error("Error:", e.message);
  }
}

convert();
