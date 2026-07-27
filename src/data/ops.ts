import {
  Timestamp,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type UpdateData,
  type WithFieldValue,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import {
  businessDoc,
  businessesCol,
  customersCol,
  expensesCol,
  invoicesCol,
  itemsCol,
  movementsCol,
  paymentsCol,
} from "./db";
import { computeTotals, makeInvoiceNumber, statusFor } from "../domain/invoice";
import { BUSINESS_TYPES } from "../domain/presets";
import type {
  Business,
  BusinessType,
  Customer,
  Expense,
  Invoice,
  InvoiceLine,
  Item,
  JobInfo,
  JobStage,
  PaymentMethod,
} from "../domain/types";

/**
 * OFFLINE RULE: everything here writes through setDoc / updateDoc /
 * writeBatch — never runTransaction, which requires a live connection.
 * Batches hit the local cache instantly and sync when the network returns,
 * so a sale can be recorded with zero bars. We do not await commits before
 * returning: snapshots see local writes immediately, and awaiting would
 * hang the UI until the device is back online.
 */
const logSync = (what: string) => (err: unknown) =>
  console.error(`[sync] ${what} failed`, err);

// ---------------------------------------------------------------- business

export function createBusiness(
  uid: string,
  input: { name: string; type: BusinessType; currency: string },
): string {
  const preset = BUSINESS_TYPES.find((t) => t.value === input.type)!;
  const ref = doc(businessesCol());
  const data: WithFieldValue<Business> = {
    id: ref.id,
    name: input.name.trim(),
    type: input.type,
    currency: input.currency,
    invoicePrefix: "INV",
    receiptFooter: "Thank you for your business!",
    modules: preset.modules,
    memberUids: [uid],
    members: { [uid]: "owner" },
    createdAt: serverTimestamp(),
  };
  setDoc(ref, data).catch(logSync("create business"));
  return ref.id;
}

export function updateBusiness(bizId: string, fields: UpdateData<Business>): void {
  updateDoc(businessDoc(bizId), fields).catch(logSync("update business"));
}

// ---------------------------------------------------------------- customers

export function addCustomer(
  bizId: string,
  input: { name: string; phone?: string; email?: string; note?: string },
): string {
  const ref = doc(customersCol(bizId));
  const data: WithFieldValue<Customer> = {
    id: ref.id,
    name: input.name.trim(),
    phone: input.phone?.trim() ?? "",
    email: input.email?.trim() ?? "",
    note: input.note?.trim() ?? "",
    createdAt: serverTimestamp(),
  };
  setDoc(ref, data).catch(logSync("add customer"));
  return ref.id;
}

// ---------------------------------------------------------------- items

export function addItem(
  bizId: string,
  input: Omit<Item, "id" | "createdAt" | "archived">,
): string {
  const batch = writeBatch(db);
  const ref = doc(itemsCol(bizId));
  batch.set(ref, {
    ...input,
    id: ref.id,
    name: input.name.trim(),
    archived: false,
    createdAt: serverTimestamp(),
  } as WithFieldValue<Item>);
  if (input.trackStock && input.stockQty !== 0) {
    const mref = doc(movementsCol(bizId));
    batch.set(mref, {
      id: mref.id,
      itemId: ref.id,
      itemName: input.name.trim(),
      delta: input.stockQty,
      reason: "adjustment",
      refId: null,
      at: Timestamp.now(),
    });
  }
  batch.commit().catch(logSync("add item"));
  return ref.id;
}

/** Edits item fields. Stock changes go through adjustStock, not here. */
export function updateItem(
  bizId: string,
  itemId: string,
  fields: Partial<Omit<Item, "id" | "stockQty" | "createdAt">>,
): void {
  updateDoc(doc(itemsCol(bizId), itemId), fields as UpdateData<Item>).catch(
    logSync("update item"),
  );
}

/**
 * Sets a new counted quantity. Written as an increment of the difference so
 * a sale syncing from another device at the same time is not clobbered.
 */
export function adjustStock(bizId: string, item: Item, newQty: number): void {
  const delta = newQty - item.stockQty;
  if (delta === 0) return;
  const batch = writeBatch(db);
  batch.update(doc(itemsCol(bizId), item.id), { stockQty: increment(delta) });
  const mref = doc(movementsCol(bizId));
  batch.set(mref, {
    id: mref.id,
    itemId: item.id,
    itemName: item.name,
    delta,
    reason: delta > 0 ? "restock" : "adjustment",
    refId: null,
    at: Timestamp.now(),
  });
  batch.commit().catch(logSync("adjust stock"));
}

// ---------------------------------------------------------------- invoices

export interface NewInvoiceInput {
  customerId: string | null;
  customerName: string;
  /** when set, also create a customer record with this phone */
  saveCustomerPhone: string | null;
  lines: InvoiceLine[];
  discount: number;
  note: string;
  job: JobInfo | null;
  dueAt: Date | null;
  /** null = on credit */
  payNow: { amount: number; method: PaymentMethod } | null;
  /** lines that should decrement tracked stock */
  stockDecrements: { item: Item; qty: number }[];
}

export function createInvoice(
  bizId: string,
  uid: string,
  biz: Business,
  input: NewInvoiceInput,
): string {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  let customerId = input.customerId;
  const customerName = input.customerName.trim();
  if (!customerId && input.saveCustomerPhone !== null && customerName) {
    const cref = doc(customersCol(bizId));
    batch.set(cref, {
      id: cref.id,
      name: customerName,
      phone: input.saveCustomerPhone.trim(),
      email: "",
      note: "",
      createdAt: serverTimestamp(),
    } as WithFieldValue<Customer>);
    customerId = cref.id;
  }

  const { subtotal, total } = computeTotals(input.lines, input.discount);
  const paid = Math.max(0, Math.min(input.payNow?.amount ?? 0, total));
  const status = statusFor(total, paid);
  const number = makeInvoiceNumber(biz.invoicePrefix);

  const ref = doc(invoicesCol(bizId));
  batch.set(ref, {
    id: ref.id,
    number,
    customerId: customerId ?? null,
    customerName,
    lines: input.lines,
    subtotal,
    discount: input.discount,
    total,
    amountPaid: paid,
    balance: total - paid,
    status,
    issuedAt: now,
    dueAt: input.dueAt ? Timestamp.fromDate(input.dueAt) : null,
    note: input.note,
    job: input.job,
    createdBy: uid,
    createdAt: serverTimestamp(),
  } as WithFieldValue<Invoice>);

  if (paid > 0 && input.payNow) {
    const pref = doc(paymentsCol(bizId));
    batch.set(pref, {
      id: pref.id,
      invoiceId: ref.id,
      invoiceNumber: number,
      customerId: customerId ?? null,
      customerName,
      amount: paid,
      method: input.payNow.method,
      at: now,
      note: "",
    });
  }

  for (const { item, qty } of input.stockDecrements) {
    // Never block a sale over a stock count — negative stock is a signal
    // to recount, not a reason to lose the sale.
    batch.update(doc(itemsCol(bizId), item.id), { stockQty: increment(-qty) });
    const mref = doc(movementsCol(bizId));
    batch.set(mref, {
      id: mref.id,
      itemId: item.id,
      itemName: item.name,
      delta: -qty,
      reason: "sale",
      refId: ref.id,
      at: now,
    });
  }

  batch.commit().catch(logSync("save sale"));
  return ref.id;
}

export function recordPayment(
  bizId: string,
  inv: Invoice,
  amount: number,
  method: PaymentMethod,
): void {
  const applied = Math.max(0, Math.min(amount, inv.balance));
  if (applied === 0) return;
  const batch = writeBatch(db);
  const now = Timestamp.now();
  const newPaid = inv.amountPaid + applied;

  const pref = doc(paymentsCol(bizId));
  batch.set(pref, {
    id: pref.id,
    invoiceId: inv.id,
    invoiceNumber: inv.number,
    customerId: inv.customerId,
    customerName: inv.customerName,
    amount: applied,
    method,
    at: now,
    note: "",
  });
  batch.update(doc(invoicesCol(bizId), inv.id), {
    amountPaid: newPaid,
    balance: inv.total - newPaid,
    status: statusFor(inv.total, newPaid),
  });
  batch.commit().catch(logSync("record payment"));
}

export function setJobStage(bizId: string, invoiceId: string, stage: JobStage): void {
  updateDoc(
    doc(invoicesCol(bizId), invoiceId),
    { "job.stage": stage } as UpdateData<Invoice>,
  ).catch(logSync("update job stage"));
}

/** Cancels an invoice. Does not auto-restore stock (see docs/SCHEMA.md). */
export function voidInvoice(bizId: string, invoiceId: string): void {
  updateDoc(doc(invoicesCol(bizId), invoiceId), {
    status: "void",
  } as UpdateData<Invoice>).catch(logSync("void invoice"));
}

// ---------------------------------------------------------------- expenses

export function addExpense(
  bizId: string,
  uid: string,
  input: {
    amount: number;
    category: string;
    vendor: string;
    note: string;
    at: Date;
    file: File | null;
  },
): string {
  const ref = doc(expensesCol(bizId));
  let receiptPath: string | null = null;

  if (input.file) {
    receiptPath = `receipts/${uid}/${bizId}/${Date.now()}-${input.file.name}`;
    // Best effort: an upload needs a connection; the expense itself doesn't.
    uploadBytes(storageRef(storage, receiptPath), input.file).catch(
      logSync("upload receipt photo"),
    );
  }

  const data: WithFieldValue<Expense> = {
    id: ref.id,
    amount: input.amount,
    category: input.category,
    vendor: input.vendor.trim(),
    note: input.note.trim(),
    at: Timestamp.fromDate(input.at),
    receiptPath,
    createdAt: serverTimestamp(),
  };
  setDoc(ref, data).catch(logSync("add expense"));
  return ref.id;
}
