const xlsx = require("xlsx");

function readRowsFromXLSX(filepath) {
  try {
    // Read the Excel file
    const workbook = xlsx.readFile(filepath);
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); // Convert to array of arrays

    // Check if data exists
    if (!data || data.length === 0) {
      throw new Error("The XLSX file is empty.");
    }

    // Log each row (excluding header row if present)
    const headerRow = data[0];
    let firstRowIndex = 0;
    if (headerRow) {
      firstRowIndex = 1; // start from the second row
    }

    return data.slice(firstRowIndex); // Return all rows of data (excluding header if present)
  } catch (error) {
    console.error("Error processing XLSX:", error);
    return null;
  }
}

function createTable(rows) {}

// Example usage (replace '../assets/data/datalist.xlsx' with your actual file path if different):
const filepath = "../assets/data/senator.xlsx";
const rows = readRowsFromXLSX(filepath);
const tableRows = 17; //change value depending on number of rows on ballot
let rowNumber = 0;

if (rows) {
  console.log("<tbody>");
  for (let i = 0; i < tableRows; i++) {
    rowNumber = i;
    console.log("<tr>");
    for (let j = 0; j < 4; j++) {
      if (rows[rowNumber] !== undefined) {
        console.log("<td>");
        console.log('<div class="form-check">');
        console.log('<input class="form-check-input senator"');
        console.log('type="checkbox"');
        console.log('id="formCheck-' + rows[rowNumber][0] + '"');
        console.log('name="senator"');
        console.log(
          'value="' + rows[rowNumber][0] + ". " + rows[rowNumber][1] + '">'
        );
        console.log('<label class="form-check-label">');
        console.log('<a href="' + rows[rowNumber][2] + '"');
        console.log(
          'target="_blank">' +
            rows[rowNumber][0] +
            ". " +
            rows[rowNumber][1] +
            "</a>"
        );
        console.log("</label>");
        console.log("</div>");
        console.log("</td>");
      }
      rowNumber = rowNumber + 17;
    }
    console.log("</tr>");
  }
  console.log("</tbody>");
}

module.exports = { readRowsFromXLSX }; //exporting for testing
