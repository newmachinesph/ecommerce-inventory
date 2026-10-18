# StockDesk — Inventory & Sales

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Next.js 16](https://img.shields.io/badge/Next.js-16-black) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-336791) ![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38bdf8)

A tool for general-merchandise inventory, counter sales, and staff
monitoring. Products carry variants (each with its own SKU, price, and stock in
pieces); staff ring up sales at a point-of-sale screen; managers watch sales
performance, an immutable activity log, and attendance.

**Next.js 16** (App Router, React 19) · **Drizzle ORM** on **PostgreSQL** ·
**Tailwind v4** · **Cloudflare R2** for product images/files · role-based access
control with an append-only stock ledger and audit log.

---

## What it does

- **Catalogue** — products with one or more variants. A plain product still has
  one variant ("Default"). Each variant has a SKU, price, cost, barcode, on-hand
  quantity (pieces), and a reorder point.
- **Stock ledger** — every change in stock is an append-only movement
  (`INITIAL`, `RESTOCK`, `SALE`, `SALE_VOID`, `ADJUSTMENT`, `RETURN`). The
  variant's `stock_qty` is the running total; the ledger never lies.
- **Point of sale** — search by name / SKU / barcode, build a cart, apply a
  discount, and charge. Stock is deducted atomically (no overselling), and the
  sale is tied to the logged-in employee.
- **Sales & voids** — every sale is recorded with line snapshots; a void returns
  the stock and is itself audited.
- **Employee monitoring**
  - *Sales performance* — per-employee counts and revenue over any date range.
  - *Activity log* — immutable record of who did what (login, sale, void, stock
    adjust, user/role change).
  - *Attendance* — clock in / clock out, shift hours, manager view of all staff.
- **Admin** — users, roles (compose any subset of the permission catalogue),
  store settings.

## Roles (seeded)

| Role | Can |
|---|---|
| **Administrator** | Everything (locked to full access). |
| **Manager** | Catalogue, stock, sales, void, reports, audit, attendance, read users/settings. |
| **Cashier** | Read catalogue/stock, create sales. Clock own shifts. |
| **Stock clerk** | Manage catalogue and stock. No sales. |

Roles are data — an admin can retune any role (except ADMIN) from the Roles page.

---

## Stack

- Next.js 16 App Router, React 19, Server Components + Route Handlers
- Drizzle ORM + `postgres` (postgres-js); money is `numeric(12,2)` kept as a
  string end-to-end — never a float
- Tailwind v4 (CSS-first), strictly monochrome UI with one alert accent
- Auth: opaque session cookie (random token, only its SHA-256 stored), bcrypt
  password hashing, per-account lockout, RBAC resolved live per request
- Cloudflare R2 (S3-compatible) for images/files, streamed through an
  auth-gated route so the bucket stays private

## Local setup

Prerequisites: Node 20+. Postgres is either a cloud instance (Neon) or local
Docker — set `DATABASE_URL` accordingly.

```bash
cp .env.example .env          # set DATABASE_URL (Neon URL or the local Docker one)
npm install
# Local Postgres only (skip if using Neon): docker compose up -d   # :5433
npm run db:generate           # generate the SQL migration from the schema (already committed)
npm run db:migrate            # apply it to DATABASE_URL
npm run db:seed               # roles + admin + demo catalogue (set SEED_DEMO_PASSWORD for demo staff)
npm run dev                   # http://localhost:3000
```

A Neon `DATABASE_URL` needs `?sslmode=require` (postgres-js reads it from the URL).

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`.
**Change the admin password after first login.**

`npm run db:reset` tears down and rebuilds the database from scratch (migrate + seed).

## Environment

See `.env.example`. `DATABASE_URL` is required. The `R2_*` keys enable
image/file upload; without them, upload features degrade gracefully (disabled).
Never prefix any secret with `NEXT_PUBLIC_`.

## Project layout

```
src/
  app/
    (app)/           # authenticated console (dashboard, pos, products, …)
    api/             # JSON route handlers (mutations + POS search + attachments)
    login/ forbidden/
  components/ui/     # design-system primitives (Button, Table, Field, …)
  components/shell/  # sidebar, topbar, nav
  db/                # schema.ts, index.ts (drizzle), seed.ts
  lib/
    auth/            # session, password, DAL (requirePermission…)
    services/        # business logic — the only place that touches the DB
    rbac.ts          # permission catalogue + built-in roles
    api.ts errors.ts validation.ts r2.ts attachments.ts format.ts
```

Business rules live in `lib/services/*`; route handlers are thin (auth →
validate → call service → envelope). The stock ledger and sale creation are
transactional — a mid-sale failure rolls back every deduction.

## Notes

- Single-store stock model (one quantity per variant). Multi-warehouse and a
  purchasing / goods-receipt flow are deliberately out of scope for v1.

## License

MIT © 2026 StockDesk — see [LICENSE](LICENSE).
