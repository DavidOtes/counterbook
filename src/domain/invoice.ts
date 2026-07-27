import type { Business, Invoice, InvoiceLine, InvoiceStatus } from "./types";
import { fmtMoney, fmtDateTime } from "../lib/format";

export function lineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice);
}

export function computeTotals(lines: InvoiceLine[], discount: number) {
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const total = Math.max(0, subtotal - Math.max(0, discount));
  return { subtotal, total };
}

export function statusFor(total: number, amountPaid: number): InvoiceStatus {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid < total) return "partial";
  return "paid";
}

const NUMBER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

/**
 * Offline-safe invoice number: date + short random suffix, e.g. INV-260727-K4TQ.
 * No counter read means no network round-trip and no collision when two
 * phones record sales at the same moment. If a strictly sequential series
 * is ever required (some tax regimes), move numbering to a Cloud Function.
 */
export function makeInvoiceNumber(prefix: string, date = new Date()): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (const b of bytes) suffix += NUMBER_ALPHABET[b % 32];
  return `${prefix || "INV"}-${yy}${mm}${dd}-${suffix}`;
}

/** Plain-text receipt for WhatsApp / SMS / clipboard. Works everywhere, offline. */
export function textReceipt(biz: Business, inv: Invoice): string {
  const c = biz.currency;
  const out: string[] = [];
  out.push(`*${biz.name}*`);
  out.push(`Receipt ${inv.number}`);
  out.push(fmtDateTime(inv.issuedAt));
  if (inv.customerName) out.push(`Customer: ${inv.customerName}`);
  out.push("--------------------------");
  for (const l of inv.lines) {
    out.push(`${l.description}`);
    out.push(`  ${l.qty} x ${fmtMoney(l.unitPrice, c)} = ${fmtMoney(l.total, c)}`);
  }
  out.push("--------------------------");
  if (inv.discount > 0) {
    out.push(`Subtotal: ${fmtMoney(inv.subtotal, c)}`);
    out.push(`Discount: -${fmtMoney(inv.discount, c)}`);
  }
  out.push(`*Total: ${fmtMoney(inv.total, c)}*`);
  if (inv.amountPaid > 0 && inv.amountPaid < inv.total) {
    out.push(`Paid: ${fmtMoney(inv.amountPaid, c)}`);
    out.push(`Balance: ${fmtMoney(inv.balance, c)}`);
  } else if (inv.status === "paid") {
    out.push(`PAID — thank you!`);
  } else if (inv.status === "unpaid") {
    out.push(`Balance due: ${fmtMoney(inv.balance, c)}`);
  }
  if (biz.receiptFooter) out.push(biz.receiptFooter);
  out.push("");
  out.push("Made by Fuseon Labs · fuseonlabs.com");
  return out.join("\n");
}

export function reminderText(biz: Business, customerName: string, owed: number): string {
  return (
    `Hello ${customerName}, a gentle reminder from ${biz.name}: ` +
    `your outstanding balance is ${fmtMoney(owed, biz.currency)}. Thank you!`
  );
}
