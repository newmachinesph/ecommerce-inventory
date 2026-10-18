import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export interface StoreSettings {
  storeName: string;
  currency: string; // ISO-ish label, e.g. "PHP", "USD"
  currencySymbol: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "StockDesk",
  currency: "PHP",
  currencySymbol: "₱",
};

const KEY = "store";

/** The single store-settings row, merged over defaults. */
export async function getStoreSettings(): Promise<StoreSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY));
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<StoreSettings>) ?? {}) };
}

export async function updateStoreSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getStoreSettings();
  const next = { ...current, ...patch };
  await db
    .insert(settings)
    .values({ key: KEY, value: next })
    .onConflictDoUpdate({ target: settings.key, set: { value: next, updatedAt: new Date() } });
  return next;
}
