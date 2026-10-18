import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";
import { categories, productVariants, products, roles, stockMovements, users } from "./schema";
import { hashPassword } from "../lib/auth/password";
import { ROLE_LABELS, ROLE_PERMISSIONS, SYSTEM_ROLE_KEYS } from "../lib/rbac";

// Seed runs under tsx (plain Node), so it opens its own connection rather than
// importing ./index — that module is `server-only` and would throw here.
const pgClient = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(pgClient, { schema, casing: "snake_case" });

/**
 * Idempotent seed: built-in roles, a first admin (from env), and a little demo
 * catalogue so the app isn't empty on first run. Safe to run repeatedly.
 */
async function seed() {
  console.log("Seeding roles…");
  for (const key of SYSTEM_ROLE_KEYS) {
    await db
      .insert(roles)
      .values({ key, label: ROLE_LABELS[key], permissions: ROLE_PERMISSIONS[key], isSystem: true })
      .onConflictDoUpdate({
        target: roles.key,
        // Keep ADMIN and MANAGER perms in sync with code; leave others as-is on conflict.
        set: { permissions: ROLE_PERMISSIONS[key], label: ROLE_LABELS[key], isSystem: true },
      });
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now-123";
  console.log(`Seeding admin ${adminEmail}…`);
  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!existingAdmin) {
    await db.insert(users).values({
      email: adminEmail,
      fullName: "Administrator",
      role: "ADMIN",
      passwordHash: await hashPassword(adminPassword),
    });
  }

  // Demo staff (only if SEED_DEMO_PASSWORD is set and no staff besides admin exist).
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  const staffCount = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  if (demoPassword && (staffCount[0]?.n ?? 0) <= 1) {
    const pw = await hashPassword(demoPassword);
    await db
      .insert(users)
      .values([
        { email: "ana@example.com", fullName: "Ana Cruz", role: "CASHIER", passwordHash: pw },
        { email: "boy@example.com", fullName: "Boy Santos", role: "STOCK_CLERK", passwordHash: pw },
      ])
      .onConflictDoNothing();
  }

  // Demo catalogue (only when empty).
  const productCount = await db.select({ n: sql<number>`count(*)::int` }).from(products);
  if ((productCount[0]?.n ?? 0) === 0) {
    console.log("Seeding demo products…");
    const [apparel, drinks, supplies] = await db
      .insert(categories)
      .values([{ name: "Apparel" }, { name: "Drinks" }, { name: "Supplies" }])
      .returning();

    const demo: { name: string; brand: string; categoryId: string; variants: { sku: string; variantName: string; price: string; cost: string; qty: number; reorder: number }[] }[] = [
      {
        name: "Cotton T-Shirt",
        brand: "BasicWear",
        categoryId: apparel.id,
        variants: [
          { sku: "TS-BLK-S", variantName: "Black / S", price: "299.00", cost: "150.00", qty: 40, reorder: 10 },
          { sku: "TS-BLK-M", variantName: "Black / M", price: "299.00", cost: "150.00", qty: 8, reorder: 10 },
          { sku: "TS-WHT-L", variantName: "White / L", price: "299.00", cost: "150.00", qty: 25, reorder: 10 },
        ],
      },
      {
        name: "Bottled Water 500ml",
        brand: "AquaPure",
        categoryId: drinks.id,
        variants: [{ sku: "WTR-500", variantName: "Default", price: "20.00", cost: "9.00", qty: 200, reorder: 50 }],
      },
      {
        name: "Ballpoint Pen",
        brand: "WriteRight",
        categoryId: supplies.id,
        variants: [
          { sku: "PEN-BLU", variantName: "Blue", price: "15.00", cost: "6.00", qty: 3, reorder: 20 },
          { sku: "PEN-RED", variantName: "Red", price: "15.00", cost: "6.00", qty: 60, reorder: 20 },
        ],
      },
    ];

    for (const p of demo) {
      const [product] = await db
        .insert(products)
        .values({ name: p.name, brand: p.brand, categoryId: p.categoryId })
        .returning();
      for (const v of p.variants) {
        const [variant] = await db
          .insert(productVariants)
          .values({
            productId: product.id,
            sku: v.sku,
            variantName: v.variantName,
            price: v.price,
            cost: v.cost,
            reorderPoint: v.reorder,
            stockQty: v.qty,
          })
          .returning();
        await db.insert(stockMovements).values({
          variantId: variant.id,
          delta: v.qty,
          balanceAfter: v.qty,
          reason: "INITIAL",
          note: "Seed opening stock",
        });
      }
    }
  }

  console.log("Seed complete.");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgClient.end();
  });
