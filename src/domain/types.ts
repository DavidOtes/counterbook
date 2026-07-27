import type { Timestamp } from "firebase/firestore";

/**
 * All money is stored in MINOR units (kobo, cents, pesewas) as integers.
 * Never store floats. `lib/format.ts` converts for display and input.
 */

export type BusinessType = "retail" | "services" | "mixed";

export interface Modules {
  /** Track stock counts; invoice lines can decrement inventory. */
  inventory: boolean;
  /** Job tracking: an invoice can carry a job (device intake -> delivered). */
  jobs: boolean;
}

export type Role = "owner" | "staff";

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  /** ISO 4217, e.g. "NGN" */
  currency: string;
  invoicePrefix: string;
  receiptFooter: string;
  modules: Modules;
  memberUids: string[];
  members: Record<string, Role>;
  createdAt: Timestamp | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  createdAt: Timestamp | null;
}

export type ItemKind = "product" | "service";

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  /** minor units */
  price: number;
  unit: string;
  /** free text; a USB scanner types this into search */
  barcode: string;
  trackStock: boolean;
  stockQty: number;
  archived: boolean;
  createdAt: Timestamp | null;
}

export interface InvoiceLine {
  itemId: string | null;
  description: string;
  qty: number;
  /** minor units */
  unitPrice: number;
  /** minor units, qty * unitPrice */
  total: number;
}

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "void";

export type JobStage = "intake" | "in_progress" | "ready" | "delivered";

export interface JobInfo {
  stage: JobStage;
  /** what was received, e.g. "HP EliteBook 840 G5, cracked hinge" */
  assetLabel: string;
}

export interface Invoice {
  id: string;
  /** e.g. INV-260727-K4TQ — offline-safe, unique without coordination */
  number: string;
  customerId: string | null;
  /** denormalized snapshot so receipts survive customer edits/deletes */
  customerName: string;
  lines: InvoiceLine[];
  /** minor units */
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  issuedAt: Timestamp;
  dueAt: Timestamp | null;
  note: string;
  job: JobInfo | null;
  createdBy: string;
  createdAt: Timestamp | null;
}

export type PaymentMethod = "cash" | "transfer" | "pos" | "other";

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  /** minor units */
  amount: number;
  method: PaymentMethod;
  at: Timestamp;
  note: string;
}

export interface Expense {
  id: string;
  /** minor units */
  amount: number;
  category: string;
  vendor: string;
  note: string;
  at: Timestamp;
  /** storage path of an attached receipt photo, if any */
  receiptPath: string | null;
  createdAt: Timestamp | null;
}

export type MovementReason = "sale" | "restock" | "adjustment" | "void";

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  /** signed change to stockQty */
  delta: number;
  reason: MovementReason;
  /** e.g. the invoice id that caused it */
  refId: string | null;
  at: Timestamp;
}
