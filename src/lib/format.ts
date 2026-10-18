/** Display helpers. Money arrives as a decimal string; never parse it to a float
 *  for storage — only for formatting. */

export function formatMoney(amount: string | number, symbol = "₱"): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatQty(n: number): string {
  return n.toLocaleString();
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Hours between two timestamps, one decimal (for shift length). */
export function hoursBetween(start: Date | string, end: Date | string | null): string {
  if (!end) return "—";
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return ((b - a) / 3_600_000).toFixed(1);
}
