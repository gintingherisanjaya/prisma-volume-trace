/**
 * Exact match after trim only.
 * @param {string|null|undefined} value
 */
function normalizeName(value) {
  if (value == null) return "";
  return String(value).trim();
}

function isBlankName(value) {
  const n = normalizeName(value);
  return !n || n === "\\N" || n.toUpperCase() === "N/A";
}

/**
 * Build a Map from exact trading account name -> account.
 * If duplicate names exist, first wins and extras are tracked.
 */
function indexAccountsByName(accounts) {
  const byName = new Map();
  const duplicates = [];
  for (const account of accounts) {
    const key = normalizeName(account.name);
    if (!key) continue;
    if (byName.has(key)) {
      duplicates.push(key);
      continue;
    }
    byName.set(key, account);
  }
  return { byName, duplicates };
}

/**
 * Match excel rows to trading accounts (exact).
 * @returns {{ matched: Array, unmatched: Array }}
 */
function matchRows(excelRows, accounts) {
  const { byName } = indexAccountsByName(accounts);
  const matched = [];
  const unmatched = [];

  for (const row of excelRows) {
    if (isBlankName(row.management_unit_name)) {
      unmatched.push({
        ...row,
        match_status: "skipped_blank",
        trading_account_id: "",
        trading_account_name: "",
      });
      continue;
    }

    const key = normalizeName(row.management_unit_name);
    const account = byName.get(key);
    if (!account) {
      unmatched.push({
        ...row,
        match_status: "unmatched",
        trading_account_id: "",
        trading_account_name: "",
      });
      continue;
    }

    matched.push({
      ...row,
      match_status: "matched",
      trading_account_id: account.id,
      trading_account_name: account.name,
    });
  }

  return { matched, unmatched };
}

module.exports = {
  normalizeName,
  isBlankName,
  matchRows,
};
