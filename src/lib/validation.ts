import { z } from "zod";

/** Whole pieces of stock — a positive integer. */
export const qtySchema = z.coerce.number().int().positive();

/** Non-negative integer (e.g. reorder point, an adjustment target). */
export const nonNegIntSchema = z.coerce.number().int().min(0);

/** A non-negative money amount (2 dp), kept as string so it never touches a float. */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0, {
    message: "Must be a non-negative amount with up to 2 decimal places.",
  });

/** A strictly positive money amount (2 dp). Use where zero is a bug. */
export const positiveMoneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, {
    message: "Must be greater than zero.",
  });

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().trim().toLowerCase().email();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
