import type { ComponentType } from "react";
import {
  BarChart3,
  Boxes,
  Calculator,
  Clock,
  LayoutDashboard,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import { NAV_PERMISSIONS, type Permission } from "@/lib/rbac";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Omit to make the item visible to every authenticated user. */
  permission?: Permission;
}

/** Ordered nav. Each entry's permission gates its visibility per role. */
export const NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: NAV_PERMISSIONS.dashboard },
  { href: "/pos", label: "Point of sale", icon: Calculator, permission: NAV_PERMISSIONS.pos },
  { href: "/sales", label: "Sales", icon: Receipt, permission: NAV_PERMISSIONS.sales },
  { href: "/products", label: "Products", icon: Package, permission: NAV_PERMISSIONS.products },
  { href: "/categories", label: "Categories", icon: Tags, permission: NAV_PERMISSIONS.categories },
  { href: "/stock", label: "Stock", icon: Boxes, permission: NAV_PERMISSIONS.stock },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: NAV_PERMISSIONS.reports },
  { href: "/attendance", label: "Attendance", icon: Clock }, // everyone clocks in/out
  { href: "/audit", label: "Audit log", icon: ScrollText, permission: NAV_PERMISSIONS.audit },
  { href: "/users", label: "Employees", icon: Users, permission: NAV_PERMISSIONS.users },
  { href: "/roles", label: "Roles", icon: ShieldCheck, permission: NAV_PERMISSIONS.roles },
  { href: "/settings", label: "Settings", icon: Settings, permission: NAV_PERMISSIONS.settings },
];
