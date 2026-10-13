const ExcelJS = require("exceljs");
const path = require("path");

/**
 * Read meta_sertifikat_pks.xlsx into row objects.
 */
async function readMetaExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`No sheet found in ${filePath}`);
  }

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value || "")
      .trim()
      .toLowerCase();
  });

  const required = [
    "kode_pks",
    "no_certificate",
    "nama_pks",
    "management_unit_name",
  ];
  for (const h of required) {
    if (!headers.includes(h)) {
      throw new Error(
        `Missing column "${h}" in ${path.basename(filePath)}. Found: ${headers.filter(Boolean).join(", ")}`
      );
    }
  }

  const colIndex = Object.fromEntries(
    headers.map((h, i) => [h, i]).filter(([h]) => h)
  );

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (name) => {
      const cell = row.getCell(colIndex[name]);
      const v = cell.value;
      if (v == null) return "";
      if (typeof v === "object" && v.text) return String(v.text);
      if (typeof v === "object" && v.result != null) return String(v.result);
      return String(v);
    };

    rows.push({
      kode_pks: get("kode_pks"),
      no_certificate: get("no_certificate"),
      nama_pks: get("nama_pks"),
      management_unit_name: get("management_unit_name"),
    });
  });

  return rows;
}

module.exports = { readMetaExcel };
