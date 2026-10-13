# PRISMA Volume Trace

Export **My Managed Volume** from [prisma by RSPO](https://platform.prismabyrspo.org/stock-management/overview) into an Excel workbook — one sheet per PKS matched from `meta_sertifikat_pks.xlsx`.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill credentials:

```env
PRISMA_BASE_URL=https://platform.prismabyrspo.org
PRISMA_API_BASE_URL=https://api-platform.trade-and-traceability.prismabyrspo.org
PRISMA_EMAIL=your@email.com
PRISMA_PASSWORD=your-password
```

Optional overrides (defaults are already set in code):

- `PRISMA_AUTH_URL`
- `PRISMA_API_KEY`
- `PRISMA_TENANT_ID`

## Run

```bash
node .
```

Output: `output/prisma_managed_volume.xlsx`

- `_summary` — match status per PKS
- one sheet per matched `kode_pks` — meta columns + volume columns (product, scm, supply_base, mill, cv_allocated, inflow, pending_inflow, outflow, pending_outflow, available_volume)

## Matching

Exact match after `trim()` between Excel `management_unit_name` and Trading Account name from the API. Blank / `\N` names are skipped (listed in `_summary` only).
