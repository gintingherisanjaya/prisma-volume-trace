#!/usr/bin/env node
require("dotenv").config();

const path = require("path");
const { login, listTradingAccounts, fetchManagedVolume } = require("./src/prismaClient");
const { readMetaExcel } = require("./src/readMeta");
const { matchRows } = require("./src/match");
const { writeWorkbook } = require("./src/exportXlsx");

async function main() {
  const root = __dirname;
  const metaPath = path.join(root, "meta_sertifikat_pks.xlsx");
  const outputPath = path.join(root, "output", "prisma_managed_volume.xlsx");

  console.log("Reading meta Excel:", metaPath);
  const excelRows = await readMetaExcel(metaPath);
  console.log(`Loaded ${excelRows.length} PKS rows`);

  console.log("Logging in to PRISMA...");
  const { idToken, email } = await login();
  console.log(`Logged in as ${email}`);

  console.log("Fetching trading accounts...");
  const accounts = await listTradingAccounts(idToken);
  console.log(`Found ${accounts.length} trading accounts`);

  const { matched, unmatched } = matchRows(excelRows, accounts);
  console.log(`Matched: ${matched.length}, Unmatched/skipped: ${unmatched.length}`);

  const summaryRows = [];
  const pksSheets = [];

  for (const row of unmatched) {
    summaryRows.push({
      ...row,
      row_count: 0,
      error: "",
    });
  }

  for (const [i, row] of matched.entries()) {
    process.stdout.write(
      `[${i + 1}/${matched.length}] ${row.kode_pks} ${row.nama_pks}... `
    );
    try {
      const volumes = await fetchManagedVolume(idToken, row.trading_account_id);
      console.log(`${volumes.length} volume rows`);
      pksSheets.push({ meta: row, volumes });
      summaryRows.push({
        ...row,
        row_count: volumes.length,
        error: "",
      });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      pksSheets.push({ meta: row, volumes: [] });
      summaryRows.push({
        ...row,
        match_status: "error",
        row_count: 0,
        error: err.message,
      });
    }
  }

  // Keep summary ordered like Excel source
  const byKode = new Map(summaryRows.map((r) => [r.kode_pks, r]));
  const orderedSummary = excelRows.map(
    (r) =>
      byKode.get(r.kode_pks) || {
        ...r,
        match_status: "unmatched",
        trading_account_id: "",
        trading_account_name: "",
        row_count: 0,
        error: "",
      }
  );

  await writeWorkbook(outputPath, orderedSummary, pksSheets);
  console.log("Wrote:", outputPath);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
