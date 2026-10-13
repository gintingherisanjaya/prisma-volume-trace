const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const VOLUME_HEADERS = [
  "kode_pks",
  "no_certificate",
  "nama_pks",
  "management_unit_name",
  "product",
  "scm",
  "supply_base",
  "mill",
  "cv_allocated",
  "inflow",
  "pending_inflow",
  "outflow",
  "pending_outflow",
  "available_volume",
];

const SUMMARY_HEADERS = [
  "kode_pks",
  "nama_pks",
  "management_unit_name",
  "match_status",
  "trading_account_id",
  "trading_account_name",
  "row_count",
  "error",
];

function safeSheetName(kodePks, used) {
  let base = String(kodePks || "PKS")
    .replace(/[\\/?*[\]:]/g, "_")
    .slice(0, 31);
  if (!base) base = "PKS";
  let name = base;
  let i = 2;
  while (used.has(name)) {
    const suffix = `_${i}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  used.add(name);
  return name;
}

function addHeaderRow(sheet, headers) {
  sheet.addRow(headers);
  const header = sheet.getRow(1);
  header.font = { bold: true };
}

/**
 * Write workbook: _summary + one sheet per matched PKS.
 * @param {string} outputPath
 * @param {Array} summaryRows
 * @param {Array<{ meta: object, volumes: Array }>} pksSheets
 */
async function writeWorkbook(outputPath, summaryRows, pksSheets) {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "prisma-volume-trace";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("_summary");
  addHeaderRow(summary, SUMMARY_HEADERS);
  for (const row of summaryRows) {
    summary.addRow(SUMMARY_HEADERS.map((h) => row[h] ?? ""));
  }
  summary.columns.forEach((col) => {
    col.width = Math.min(40, Math.max(12, String(col.header || "").length + 2));
  });

  const usedNames = new Set(["_summary"]);
  for (const sheetData of pksSheets) {
    const name = safeSheetName(sheetData.meta.kode_pks, usedNames);
    const sheet = workbook.addWorksheet(name);
    addHeaderRow(sheet, VOLUME_HEADERS);

    const volumes = sheetData.volumes.length
      ? sheetData.volumes
      : [
          {
            product: "",
            scm: "",
            supply_base: "",
            mill: "",
            cv_allocated: "",
            inflow: "",
            pending_inflow: "",
            outflow: "",
            pending_outflow: "",
            available_volume: "",
          },
        ];

    for (const vol of volumes) {
      sheet.addRow([
        sheetData.meta.kode_pks,
        sheetData.meta.no_certificate,
        sheetData.meta.nama_pks,
        sheetData.meta.management_unit_name,
        vol.product,
        vol.scm,
        vol.supply_base,
        vol.mill,
        vol.cv_allocated,
        vol.inflow,
        vol.pending_inflow,
        vol.outflow,
        vol.pending_outflow,
        vol.available_volume,
      ]);
    }

    sheet.columns.forEach((col) => {
      col.width = 16;
    });
  }

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

module.exports = { writeWorkbook, VOLUME_HEADERS, SUMMARY_HEADERS };
