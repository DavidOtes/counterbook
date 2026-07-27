import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { limit, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { customersCol, itemsCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { createInvoice } from "../data/ops";
import { lineTotal } from "../domain/invoice";
import { PAYMENT_METHODS } from "../domain/presets";
import { fmtMoney, parseMoney, toMajor } from "../lib/format";
import type { Customer, InvoiceLine, Item, PaymentMethod } from "../domain/types";
import { Button, Field, Input } from "../components/ui";
import { BackIcon, PlusIcon, XIcon } from "../components/icons";

interface LineDraft {
  key: number;
  itemId: string | null;
  description: string;
  qty: number;
  priceStr: string;
}

let keySeq = 1;
const blankLine = (): LineDraft => ({
  key: keySeq++,
  itemId: null,
  description: "",
  qty: 1,
  priceStr: "",
});

type PayMode = "now" | "part" | "credit";

export function NewInvoice() {
  const { user } = useAuth();
  const { business, modules, fmt } = useBusiness();
  const navigate = useNavigate();
  const currency = business.currency;

  const { data: customers } = useLiveQuery<Customer>(
    () => query(customersCol(business.id), orderBy("name"), limit(500)),
    [business.id],
  );
  const { data: items } = useLiveQuery<Item>(
    () => query(itemsCol(business.id), where("archived", "==", false), limit(500)),
    [business.id],
  );

  const [customerName, setCustomerName] = useState("");
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [discountStr, setDiscountStr] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [isJob, setIsJob] = useState(false);
  const [assetLabel, setAssetLabel] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("now");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [partStr, setPartStr] = useState("");
  const [dueDate, setDueDate] = useState("");

  const matchedCustomer = useMemo(
    () =>
      customers.find((c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()) ??
      null,
    [customers, customerName],
  );

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function patchLine(key: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  /** Match typed text against item names AND barcodes (USB scanners just type). */
  function onDescription(l: LineDraft, text: string) {
    const t = text.trim().toLowerCase();
    const hit =
      items.find((i) => i.name.toLowerCase() === t) ??
      items.find((i) => i.barcode && i.barcode.toLowerCase() === t);
    if (hit) {
      patchLine(l.key, {
        itemId: hit.id,
        description: hit.name,
        priceStr: hit.price > 0 ? toMajor(hit.price, currency) : l.priceStr,
      });
    } else {
      patchLine(l.key, { itemId: null, description: text });
    }
  }

  const parsedLines: InvoiceLine[] = lines
    .filter((l) => l.description.trim() && l.qty > 0)
    .map((l) => {
      const unitPrice = parseMoney(l.priceStr, currency);
      return {
        itemId: l.itemId,
        description: l.description.trim(),
        qty: l.qty,
        unitPrice,
        total: lineTotal(l.qty, unitPrice),
      };
    });

  const discount = showDiscount ? parseMoney(discountStr, currency) : 0;
  const subtotal = parsedLines.reduce((s, l) => s + l.total, 0);
  const total = Math.max(0, subtotal - discount);
  const canSave = parsedLines.length > 0 && total >= 0 && Boolean(user);

  function submit() {
    if (!user || !canSave) return;
    const stockDecrements = parsedLines.flatMap((pl) => {
      const item = pl.itemId ? itemById.get(pl.itemId) : undefined;
      return item && item.trackStock ? [{ item, qty: pl.qty }] : [];
    });
    const payNow =
      payMode === "now"
        ? { amount: total, method }
        : payMode === "part"
          ? { amount: parseMoney(partStr, currency), method }
          : null;

    const id = createInvoice(business.id, user.uid, business, {
      customerId: matchedCustomer?.id ?? null,
      customerName,
      saveCustomerPhone: !matchedCustomer && saveCustomer ? customerPhone : null,
      lines: parsedLines,
      discount,
      note: "",
      job: isJob ? { stage: "intake", assetLabel: assetLabel.trim() } : null,
      dueAt: payMode === "credit" && dueDate ? new Date(`${dueDate}T17:00:00`) : null,
      payNow,
      stockDecrements,
    });
    navigate(`/invoices/${id}`, { replace: true });
  }

  return (
    <div className="anim-fade pb-24">
      <header className="mb-6 flex items-center gap-2">
        <Link to="/invoices" aria-label="Back" className="-ml-2 rounded-md p-2 text-ink-soft hover:text-ink">
          <BackIcon />
        </Link>
        <h1 className="font-display text-[22px] font-bold">New sale</h1>
      </header>

      {/* Customer — optional by design; a walk-in sale needs no setup */}
      <Field label="Customer" hint={matchedCustomer ? "Existing customer ✓" : undefined}>
        <Input
          list="customer-list"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Walk-in customer (optional)"
        />
      </Field>
      <datalist id="customer-list">
        {customers.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      {!matchedCustomer && customerName.trim() && (
        <div className="mt-2">
          <label className="flex items-center gap-2 text-[14px] text-ink-soft">
            <input
              type="checkbox"
              className="accent-(--color-brand)"
              checked={saveCustomer}
              onChange={(e) => setSaveCustomer(e.target.checked)}
            />
            Save to customers
          </label>
          {saveCustomer && (
            <Input
              className="mt-2"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              inputMode="tel"
              placeholder="Phone (for receipts & reminders)"
            />
          )}
        </div>
      )}

      {/* Job intake */}
      {modules.jobs && (
        <div className="mt-5">
          <label className="flex items-center gap-2 text-[15px] font-medium">
            <input
              type="checkbox"
              className="accent-(--color-brand)"
              checked={isJob}
              onChange={(e) => setIsJob(e.target.checked)}
            />
            This is a job (repair / order to fulfil)
          </label>
          {isJob && (
            <Input
              className="mt-2"
              value={assetLabel}
              onChange={(e) => setAssetLabel(e.target.value)}
              placeholder="What did you receive? e.g. HP EliteBook 840, cracked hinge"
            />
          )}
        </div>
      )}

      {/* Lines */}
      <div className="mt-7">
        <p className="small-caps-label mb-2">Items</p>
        <div className="space-y-4">
          {lines.map((l) => {
            const item = l.itemId ? itemById.get(l.itemId) : undefined;
            const unitPrice = parseMoney(l.priceStr, currency);
            return (
              <div key={l.key} className="border-b border-line pb-4">
                <div className="flex gap-2">
                  <Input
                    list="item-list"
                    value={l.description}
                    onChange={(e) => onDescription(l, e.target.value)}
                    placeholder="What was sold / done? (type or scan)"
                    className="flex-1"
                  />
                  {lines.length > 1 && (
                    <button
                      aria-label="Remove line"
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      className="shrink-0 rounded-md px-2 text-ink-faint hover:text-clay"
                    >
                      <XIcon width={18} height={18} />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => patchLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                    aria-label="Quantity"
                    className="w-20 text-center"
                  />
                  <span className="text-ink-faint">×</span>
                  <Input
                    inputMode="decimal"
                    value={l.priceStr}
                    onChange={(e) => patchLine(l.key, { priceStr: e.target.value })}
                    aria-label="Unit price"
                    placeholder="Price"
                    className="w-32 money"
                  />
                  <span className="money ml-auto font-semibold">
                    {fmtMoney(lineTotal(l.qty, unitPrice), currency)}
                  </span>
                </div>
                {item?.trackStock && (
                  <p className={`mt-1.5 text-[13px] ${l.qty > item.stockQty ? "text-amber" : "text-ink-faint"}`}>
                    {l.qty > item.stockQty
                      ? `Only ${item.stockQty} counted in stock — sale is still allowed`
                      : `${item.stockQty} in stock`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <datalist id="item-list">
          {items.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>

        <div className="mt-3 flex items-center justify-between">
          <Button size="sm" onClick={() => setLines((ls) => [...ls, blankLine()])}>
            <PlusIcon width={16} height={16} /> Add line
          </Button>
          {!showDiscount ? (
            <button
              className="text-[14px] font-semibold text-brand-deep"
              onClick={() => setShowDiscount(true)}
            >
              Add discount
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-ink-soft">Discount</span>
              <Input
                inputMode="decimal"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                className="w-28 money"
                placeholder="0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Payment */}
      <div className="mt-7">
        <p className="small-caps-label mb-2">Payment</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "now", label: "Paid now" },
              { v: "part", label: "Part payment" },
              { v: "credit", label: "On credit" },
            ] as { v: PayMode; label: string }[]
          ).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setPayMode(v)}
              className={`rounded-md border px-2 py-2.5 text-[14px] font-semibold transition-colors ${
                payMode === v
                  ? "border-brand bg-brand-tint text-brand-deep"
                  : "border-line bg-card text-ink-soft hover:border-ink-faint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {payMode !== "credit" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {payMode === "part" && (
              <Input
                inputMode="decimal"
                value={partStr}
                onChange={(e) => setPartStr(e.target.value)}
                className="w-32 money"
                placeholder="Amount paid"
              />
            )}
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${
                  method === m.value
                    ? "bg-brand-tint text-brand-deep"
                    : "border border-line bg-card text-ink-soft"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        {payMode === "credit" && (
          <div className="mt-3">
            <Field label="Due date (optional)">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="max-w-48" />
            </Field>
          </div>
        )}
      </div>

      {/* Total + save */}
      <div className="sticky bottom-20 mt-8 rounded-lg border border-line bg-card p-4 shadow-lg shadow-ink/5 lg:bottom-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="small-caps-label">Total</p>
            <p className="font-display text-[26px] font-bold leading-tight">{fmt(total)}</p>
            {payMode === "part" && parseMoney(partStr, currency) > 0 && (
              <p className="text-[13px] text-amber">
                Balance {fmt(Math.max(0, total - parseMoney(partStr, currency)))} on credit
              </p>
            )}
          </div>
          <Button variant="primary" size="lg" disabled={!canSave} onClick={submit}>
            {payMode === "now" ? "Save & receipt" : "Save sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
