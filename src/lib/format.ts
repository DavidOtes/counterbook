import { Timestamp } from "firebase/firestore";

/** Currencies whose minor unit is the unit itself (no decimals). */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "RWF", "UGX", "VND", "XOF", "XAF"]);

export function minorFactor(currency: string): number {
  return ZERO_DECIMAL.has(currency) ? 1 : 100;
}

/** minor units -> "₦1,250.00" */
export function fmtMoney(minor: number, currency: string): string {
  const factor = minorFactor(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: factor === 1 ? 0 : 2,
    }).format(minor / factor);
  } catch {
    return `${currency} ${(minor / factor).toFixed(factor === 1 ? 0 : 2)}`;
  }
}

/** "1250.5" typed by a user -> minor units (125050). Empty/invalid -> 0. */
export function parseMoney(input: string, currency: string): number {
  const n = parseFloat(input.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * minorFactor(currency));
}

/** minor units -> "1250.50" for prefilling inputs */
export function toMajor(minor: number, currency: string): string {
  const factor = minorFactor(currency);
  if (factor === 1) return String(minor);
  return (minor / factor).toFixed(2).replace(/\.00$/, "");
}

export function fmtDate(ts: Timestamp | Date | null): string {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : ts.toDate();
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(ts: Timestamp | Date | null): string {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : ts.toDate();
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Week starts Monday. */
export function startOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

export function tsFrom(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/** WhatsApp deep link. Phone may be empty -> share-to-anyone link. */
export function waLink(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
