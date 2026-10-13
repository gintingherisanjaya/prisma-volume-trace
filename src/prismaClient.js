const DEFAULT_AUTH_URL =
  "https://api-platform.gateway.prismabyrspo.org/auth/v1";
const DEFAULT_API_KEY = "AIzaSyCkvyv7-qTA0v5VfCnmPgaGsRe656ikEac";
const DEFAULT_TENANT_ID = "prisma-6z80d";
const DEFAULT_API_BASE =
  "https://api-platform.trade-and-traceability.prismabyrspo.org";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function authUrl() {
  return (process.env.PRISMA_AUTH_URL || DEFAULT_AUTH_URL).replace(/\/$/, "");
}

function apiBase() {
  return (process.env.PRISMA_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, "");
}

function apiKey() {
  return process.env.PRISMA_API_KEY || DEFAULT_API_KEY;
}

function tenantId() {
  return process.env.PRISMA_TENANT_ID || DEFAULT_TENANT_ID;
}

/**
 * Login via PRISMA auth gateway (Firebase Identity Toolkit compatible).
 * @returns {Promise<{ idToken: string, email: string, localId: string }>}
 */
async function login() {
  const email = requireEnv("PRISMA_EMAIL");
  const password = requireEnv("PRISMA_PASSWORD");
  const url = `${authUrl()}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey())}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      returnSecureToken: true,
      email,
      password,
      clientType: "CLIENT_TYPE_WEB",
      tenantId: tenantId(),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.idToken) {
    const msg =
      data?.error?.message || data?.message || `HTTP ${res.status}`;
    throw new Error(`Login failed: ${msg}`);
  }

  return {
    idToken: data.idToken,
    email: data.email || email,
    localId: data.localId,
  };
}

function authHeaders(idToken, tradingAccountId) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${idToken}`,
  };
  if (tradingAccountId) {
    headers["X-Trading-Account-ID"] = tradingAccountId;
  }
  return headers;
}

/**
 * List trading accounts accessible by the logged-in user.
 * @returns {Promise<Array<{ id: string, name: string, raw: object }>>}
 */
async function listTradingAccounts(idToken) {
  const url = `${apiBase()}/api/v1/trading-accounts/user-access`;
  const res = await fetch(url, { headers: authHeaders(idToken) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Failed to list trading accounts: ${data?.message || data?.detail || res.status}`
    );
  }

  const rows = Array.isArray(data)
    ? data
    : data.content || data.data || data.accounts || data.items || [];

  return rows.map((row) => {
    const id =
      row.tradingAccountId ||
      row.accountId ||
      row.id ||
      row.tradingAcctId ||
      "";
    const name =
      row.tradingAccountName ||
      row.accountName ||
      row.name ||
      row.legalEntityName ||
      "";
    return { id: String(id), name: String(name), raw: row };
  });
}

const SCM_SHORT = {
  IDENTITY_PRESERVED: "IP",
  MASS_BALANCE: "MB",
  SEGREGATED: "SG",
  BOOK_AND_CLAIM: "BC",
};

function joinNames(value) {
  if (!value) return "-";
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "-";
  }
  return String(value);
}

function mapStockRow(item) {
  const scm = item.scm || item.supplyChainModel || "";
  return {
    product: item.productName || "",
    scm: SCM_SHORT[scm] || scm,
    supply_base: joinNames(item.supplyBaseAssetNames),
    mill: joinNames(item.millAssetNames),
    cv_allocated: item.cvAllocated ?? "",
    inflow: item.inflow ?? "",
    pending_inflow: item.pendingInflowVolume ?? "",
    outflow: item.outflow ?? "",
    pending_outflow: item.pendingVolume ?? "",
    available_volume: item.availableVolume ?? "",
  };
}

/**
 * Fetch all pages of My Managed Volume for a trading account.
 */
async function fetchManagedVolume(idToken, tradingAccountId, pageSize = 50) {
  const all = [];
  let page = 1;
  let last = false;

  while (!last) {
    const qs = new URLSearchParams({
      page: String(page),
      size: String(pageSize),
      origin: "MY_MANAGED_VOLUME",
    });
    const url = `${apiBase()}/api/v1/trade/stock/view?${qs}`;
    const res = await fetch(url, {
      headers: authHeaders(idToken, tradingAccountId),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Stock view failed for ${tradingAccountId}: ${data?.message || data?.detail || res.status}`
      );
    }

    const content = data.content || [];
    all.push(...content.map(mapStockRow));
    last = data.last === true || page >= (data.totalPages || 1);
    page += 1;
    if (page > 100) break;
  }

  return all;
}

module.exports = {
  login,
  listTradingAccounts,
  fetchManagedVolume,
};
