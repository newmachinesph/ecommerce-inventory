# Agent notes

- Business logic lives in `src/lib/services/*` — the only layer that touches the
  DB. Route handlers stay thin: auth → validate (zod) → call service → envelope.
- Money is a `numeric(12,2)` string end-to-end. Never parse it to a float except
  for display (`formatMoney`). POS/sale math is done in integer cents.
- Stock only changes through `applyMovement` (inside a transaction). It locks the
  variant row `FOR UPDATE` and refuses to go negative — do not update
  `stock_qty` directly anywhere else.
- Auth: never trust a client-supplied role. Gate every mutation with
  `requirePermission(...)`; pages use `requirePermissionPage(...)`.
- Secrets: env only, server-only. `.env` is gitignored. R2 keys never ship to the
  client; files stream through `/api/attachments/[id]/raw`.
- Verify against current docs (Context7) for Next 16 / Drizzle / Tailwind v4
  before non-trivial changes.
