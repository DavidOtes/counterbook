import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { doc, query, where } from "firebase/firestore";
import { useBusiness } from "../context/BusinessContext";
import { invoicesCol, paymentsCol } from "../data/db";
import { useLiveDoc, useLiveQuery } from "../data/hooks";
import { recordPayment, setJobStage, voidInvoice } from "../data/ops";
import { textReceipt } from "../domain/invoice";
import { JOB_STAGES, PAYMENT_METHODS } from "../domain/presets";
import { fmtDateTime, parseMoney, toMajor, waLink } from "../lib/format";
import type { Invoice, Payment, PaymentMethod } from "../domain/types";
import { Amount, Button, Field, Input, Sheet, StatusChip } from "../components/ui";
import { BackIcon, CheckIcon, PrinterIcon, ShareIcon } from "../components/icons";
import { Splash } from "../components/Splash";

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { business, fmt } = useBusiness();
  const navigate = useNavigate();

  const { data: inv, loading } = useLiveDoc<Invoice>(
    () => (id ? doc(invoicesCol(business.id), id) : null),
    [business.id, id],
  );
  const { data: payments } = useLiveQuery<Payment>(
    () => (id ? query(paymentsCol(business.id), where("invoiceId", "==", id)) : null),
    [business.id, id],
  );
  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => a.at.toMillis() - b.at.toMillis()),
    [payments],
  );

  const [payOpen, setPayOpen] = useState(false);
  const [payStr, setPayStr] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");

  if (loading) return <Splash />;
  if (!inv) {
    return (
      <div className="py-16 text-center text-ink-soft">
        Receipt not found. <Link className="font-semibold text-brand-deep" to="/invoices">Back to sales</Link>
      </div>
    );
  }

  async function share() {
    const text = textReceipt(business, inv!);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* fall through to WhatsApp */
      }
    }
    window.open(waLink("", text), "_blank");
  }

  function savePayment() {
    const amount = parseMoney(payStr, business.currency);
    if (amount > 0) recordPayment(business.id, inv!, amount, method);
    setPayOpen(false);
  }

  function doVoid() {
    if (
      window.confirm(
        "Void this receipt? It stays in your book marked as void. Stock is not restored automatically.",
      )
    ) {
      voidInvoice(business.id, inv!.id);
    }
  }

  const jobIdx = inv.job ? JOB_STAGES.findIndex((s) => s.value === inv.job!.stage) : -1;
  const nextStage = jobIdx >= 0 && jobIdx < JOB_STAGES.length - 1 ? JOB_STAGES[jobIdx + 1] : null;

  return (
    <div className="anim-fade">
      <header className="no-print mb-5 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="-ml-2 rounded-md p-2 text-ink-soft hover:text-ink">
          <BackIcon />
        </button>
        <h1 className="font-display text-[22px] font-bold">{inv.number}</h1>
        <div className="ml-auto">
          <StatusChip status={inv.status} />
        </div>
      </header>

      {/* Job progress */}
      {inv.job && (
        <section className="no-print mb-6 rounded-lg border border-line bg-card p-4">
          <p className="small-caps-label">Job</p>
          {inv.job.assetLabel && <p className="mt-1 font-medium">{inv.job.assetLabel}</p>}
          <ol className="mt-3 flex items-center gap-1.5">
            {JOB_STAGES.map((s, i) => (
              <li key={s.value} className="flex flex-1 flex-col items-start gap-1.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                    i < jobIdx
                      ? "bg-brand text-white"
                      : i === jobIdx
                        ? "bg-brand-tint text-brand-deep ring-2 ring-brand"
                        : "border border-line bg-paper text-ink-faint"
                  }`}
                >
                  {i < jobIdx ? <CheckIcon width={14} height={14} /> : i + 1}
                </span>
                <span className={`text-[11px] font-semibold ${i <= jobIdx ? "text-ink" : "text-ink-faint"}`}>
                  {s.label}
                </span>
              </li>
            ))}
          </ol>
          {nextStage && (
            <Button
              size="sm"
              variant="primary"
              className="mt-3"
              onClick={() => setJobStage(business.id, inv.id, nextStage.value)}
            >
              Mark as {nextStage.label.toLowerCase()}
            </Button>
          )}
        </section>
      )}

      {/* The receipt itself */}
      <section className="print-area receipt relative mx-auto max-w-[420px] rounded-lg border border-line bg-card px-6 py-7 text-[13.5px] leading-relaxed">
        {inv.status === "paid" && <span className="stamp right-4 top-6">Paid</span>}
        {inv.status === "void" && (
          <span className="stamp right-4 top-6 border-clay text-clay">Void</span>
        )}

        <p className="text-center font-display text-[17px] font-bold">{business.name}</p>
        <p className="mt-1 text-center text-ink-soft">
          {inv.number}
          <br />
          {fmtDateTime(inv.issuedAt)}
        </p>
        {inv.customerName && (
          <p className="mt-2 text-center">
            For: {inv.customerName}
          </p>
        )}

        <div className="receipt-rule my-4" />

        {inv.lines.map((l, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between gap-3">
              <span className="min-w-0 flex-1">{l.description}</span>
              <span className="shrink-0">{fmt(l.total)}</span>
            </div>
            <p className="text-[12px] text-ink-faint">
              {l.qty} × {fmt(l.unitPrice)}
            </p>
          </div>
        ))}

        <div className="receipt-rule my-4" />

        {inv.discount > 0 && (
          <>
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span>{fmt(inv.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>Discount</span>
              <span>-{fmt(inv.discount)}</span>
            </div>
          </>
        )}
        <div className="mt-1 flex justify-between text-[16px] font-bold">
          <span>TOTAL</span>
          <span>{fmt(inv.total)}</span>
        </div>

        {sortedPayments.map((p) => (
          <div key={p.id} className="mt-1 flex justify-between text-ink-soft">
            <span>
              Paid · {PAYMENT_METHODS.find((m) => m.value === p.method)?.label.toLowerCase()} ·{" "}
              {fmtDateTime(p.at)}
            </span>
            <span>{fmt(p.amount)}</span>
          </div>
        ))}
        {inv.balance > 0 && inv.status !== "void" && (
          <div className="mt-1 flex justify-between font-bold text-amber">
            <span>BALANCE DUE</span>
            <span>{fmt(inv.balance)}</span>
          </div>
        )}
        {inv.dueAt && inv.balance > 0 && (
          <p className="mt-1 text-[12px] text-ink-soft">Due by {fmtDateTime(inv.dueAt)}</p>
        )}

        {business.receiptFooter && (
          <p className="mt-5 text-center text-[12px] text-ink-soft">{business.receiptFooter}</p>
        )}
        <p className="mt-4 border-t border-line pt-3 text-center text-[11px] text-ink-faint">
          Made by{" "}
          <a
            href="https://fuseonlabs.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            Fuseon Labs
          </a>
        </p>
      </section>

      {/* Actions */}
      <section className="no-print mx-auto mt-5 max-w-[420px]">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={share}>
            <ShareIcon width={18} height={18} /> Share
          </Button>
          <Button onClick={() => window.print()}>
            <PrinterIcon width={18} height={18} /> Print
          </Button>
        </div>
        {inv.balance > 0 && inv.status !== "void" && (
          <Button
            variant="primary"
            size="lg"
            full
            className="mt-2"
            onClick={() => {
              setPayStr(toMajor(inv.balance, business.currency));
              setPayOpen(true);
            }}
          >
            Record payment · {fmt(inv.balance)} due
          </Button>
        )}
        {inv.customerId && (
          <Link
            to={`/customers/${inv.customerId}`}
            className="mt-4 block text-center text-[14px] font-semibold text-brand-deep"
          >
            View customer
          </Link>
        )}
        {inv.status !== "void" && (
          <button
            onClick={doVoid}
            className="mx-auto mt-6 block text-[13px] font-semibold text-ink-faint hover:text-clay"
          >
            Void this receipt
          </button>
        )}
      </section>

      <Sheet open={payOpen} onClose={() => setPayOpen(false)} title="Record payment">
        <Field label={`Amount (${fmt(inv.balance)} outstanding)`}>
          <Input
            inputMode="decimal"
            value={payStr}
            onChange={(e) => setPayStr(e.target.value)}
            className="money"
            autoFocus
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
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
        <Button variant="primary" size="lg" full className="mt-5" onClick={savePayment}>
          Save payment
        </Button>
      </Sheet>
    </div>
  );
}
