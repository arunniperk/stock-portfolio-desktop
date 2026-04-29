const XLSX = require('xlsx');
const fs = require('fs');

async function convert() {
  const file = "C:\\Users\\Arun\\Downloads\\portfolio_holding_report_27042026205515_protected.xlsx";
  try {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log("Found " + data.length + " rows");
    console.log("Columns: " + Object.keys(data[0] || {}).join(", "));
    
    // Map to Tool CSV format: Symbol, Name, Qty, Buy Price
    // I will guess the column names or look at the first row
    const mapped = data.map(r => {
      // Trying common names
      const symbol = r['Symbol'] || r['Ticker'] || r['Stock Code'] || '';
      const name = r['Name'] || r['Company Name'] || r['Stock Name'] || '';
      const qty = r['Quantity'] || r['Qty'] || r['Shares'] || 0;
      const buyPrice = r['Buy Price'] || r['Avg Price'] || r['Purchase Price'] || 0;
      return { Symbol: symbol, Name: name, Qty: qty, "Buy Price": buyPrice };
    });
    
    const outSheet = XLSX.utils.json_to_sheet(mapped);
    const csv = XLSX.utils.sheet_to_csv(outSheet);
    
    fs.writeFileSync("portfolio_import.csv", csv);
    console.log("Created portfolio_import.csv");
  } catch (e) {
    console.error("Error reading file:", e.message);
  }
}

convert();
