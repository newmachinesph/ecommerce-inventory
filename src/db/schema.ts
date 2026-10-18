import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * E-commerce inventory schema — single store, general merchandise.
 *
 * Money is numeric(12,2), returned from postgres-js as a string; never a float.
 * Stock is whole pieces (integer). A product owns one or more variants; the
 * variant is the sellable, stock-bearing unit (its own SKU, price, qty).
 */

/* ------------------------------- enums -------------------------------- */

/** Why the stock ledger moved. Append-only; every delta cites a reason. */
export const stockReason = pgEnum("stock_reason", [
  "INITIAL", // opening balance when a variant is created
  "RESTOCK", // received new stock
  "SALE", // sold at the counter (negative)
  "SALE_VOID", // a voided sale returned stock (positive)
  "ADJUSTMENT", // manual correction (count, damage, loss)
  "RETURN", // customer return (positive)
]);

export const saleStatus = pgEnum("sale_status", ["COMPLETED", "VOID"]);

/* ------------------------------ auth ---------------------------------- */

/**
 * Roles are DATA (rows), permissions are CODE (a fixed catalogue in rbac.ts).
 * An admin composes a role from any subset of that catalogue.
 */
export const roles = pgTable("roles", {
  key: text("key").primaryKey(), // e.g. ADMIN, CASHIER
  label: text("label").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    role: text("role")
      .notNull()
      .references(() => roles.key),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* --------------------------- catalogue -------------------------------- */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    brand: text("brand"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
);

/**
 * The sellable unit. A plain product still gets one variant (name "Default").
 * `attributes` holds the variant axes, e.g. { "Color": "Red", "Size": "L" }.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    variantName: text("variant_name").notNull().default("Default"),
    attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    barcode: text("barcode"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
    stockQty: integer("stock_qty").notNull().default(0),
    reorderPoint: integer("reorder_point").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

/* ---------------------------- stock ledger ---------------------------- */

/** Append-only. The variant's stock_qty is the running total of these deltas. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(), // + in, - out
    balanceAfter: integer("balance_after").notNull(),
    reason: stockReason("reason").notNull(),
    refType: text("ref_type"), // e.g. "sale"
    refId: uuid("ref_id"),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("movements_variant_idx").on(t.variantId), index("movements_created_idx").on(t.createdAt)],
);

/* ------------------------------ sales --------------------------------- */

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleNumber: serial("sale_number").notNull(), // human-friendly running number
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id),
    customerName: text("customer_name"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    status: saleStatus("status").notNull().default("COMPLETED"),
    voidReason: text("void_reason"),
    voidedBy: uuid("voided_by").references(() => users.id),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sales_employee_idx").on(t.employeeId),
    index("sales_created_idx").on(t.createdAt),
    index("sales_status_idx").on(t.status),
  ],
);

/** Line items snapshot sku/name/price so history is stable if a variant changes. */
export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    qty: integer("qty").notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [index("sale_items_sale_idx").on(t.saleId), index("sale_items_variant_idx").on(t.variantId)],
);

/* --------------------------- attendance ------------------------------- */

/** One row per shift. clock_out null = currently clocked in. */
export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clockIn: timestamp("clock_in", { withTimezone: true }).notNull().defaultNow(),
    clockOut: timestamp("clock_out", { withTimezone: true }),
    note: text("note"),
  },
  (t) => [index("attendance_user_idx").on(t.userId), index("attendance_in_idx").on(t.clockIn)],
);

/* ---------------------------- audit log ------------------------------- */

/** Immutable record of who did what. Never updated or deleted. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(), // e.g. LOGIN, SALE_CREATE, STOCK_ADJUST
    entity: text("entity"), // e.g. sale, product, user
    entityId: uuid("entity_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId)],
);

/* --------------------------- attachments ------------------------------ */

/** Product images and files, stored in R2 (r2_key), served via auth-gated route. */
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entity: text("entity").notNull(), // e.g. "product"
    entityId: uuid("entity_id").notNull(),
    r2Key: text("r2_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attachments_entity_idx").on(t.entity, t.entityId)],
);

/* ---------------------------- settings -------------------------------- */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
