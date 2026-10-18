/**
 * Permission model: flat `resource:action` strings.
 *
 * Permissions are a FIXED catalogue — every key below guards a real endpoint,
 * so it is code-bound and cannot be invented at runtime. Roles, by contrast,
 * are DATA (rows in `roles`): an admin composes a role from any subset of this
 * catalogue. The built-in roles are seeded from `ROLE_PERMISSIONS`, but once
 * seeded the database is the source of truth (except ADMIN, always full access).
 */

export const PERMISSIONS = [
  // catalogue
  "product:read", "product:write",
  "category:read", "category:write",

  // stock
  "stock:read", "stock:adjust",

  // counter sales
  "sale:read", "sale:create", "sale:void",

  // monitoring
  "report:read", // sales performance
  "attendance:read", // view everyone's shifts (own clock in/out needs no permission)
  "audit:read",

  // administration
  "user:read", "user:write",
  "role:read", "role:write",
  "settings:read", "settings:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

/** Keep only the strings that are real permissions, de-duplicated. */
export function sanitizePermissions(values: readonly string[]): Permission[] {
  const seen = new Set<Permission>();
  for (const v of values) if (isPermission(v)) seen.add(v);
  return [...seen];
}

export function hasPermission(granted: readonly Permission[], needed: Permission): boolean {
  return granted.includes(needed);
}

/* -------------------------- built-in roles -------------------------- */

export const SYSTEM_ROLE_KEYS = ["ADMIN", "MANAGER", "CASHIER", "STOCK_CLERK"] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export const ROLE_LABELS: Record<SystemRoleKey, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  STOCK_CLERK: "Stock clerk",
};

const MANAGER_PERMS: Permission[] = [
  "product:read", "product:write",
  "category:read", "category:write",
  "stock:read", "stock:adjust",
  "sale:read", "sale:create", "sale:void",
  "report:read", "attendance:read", "audit:read",
  "user:read", "settings:read",
];

const CASHIER_PERMS: Permission[] = [
  "product:read", "category:read", "stock:read",
  "sale:read", "sale:create",
];

const STOCK_CLERK_PERMS: Permission[] = [
  "product:read", "product:write",
  "category:read", "category:write",
  "stock:read", "stock:adjust",
];

/** Seed permissions per built-in role. ADMIN always gets the full catalogue. */
export const ROLE_PERMISSIONS: Record<SystemRoleKey, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  MANAGER: MANAGER_PERMS,
  CASHIER: CASHIER_PERMS,
  STOCK_CLERK: STOCK_CLERK_PERMS,
};

/* --------------------------- nav gating ----------------------------- */

/** Which permission makes each nav section visible. */
export const NAV_PERMISSIONS = {
  dashboard: "product:read",
  pos: "sale:create",
  sales: "sale:read",
  products: "product:read",
  categories: "category:read",
  stock: "stock:read",
  reports: "report:read",
  attendance: "attendance:read",
  audit: "audit:read",
  users: "user:read",
  roles: "role:read",
  settings: "settings:read",
} satisfies Record<string, Permission>;
