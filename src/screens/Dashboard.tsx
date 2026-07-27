import { useMemo } from "react";
import { Link } from "react-router";
import { limit, orderBy, query, where } from "firebase/firestore";
import { useBusiness } from "../context/BusinessContext";
import { customersCol, expensesCol, invoicesCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { startOfMonth, startOfToday, startOfWeek, tsFrom, waLink, fmtDateTime } from "../lib/format";
import { reminderText } from "../domain/invoice";
import type { Customer, Expense, Invoice } from "../domain/types";
import { Amount, Button, Empty, SectionLabel, StatusChip } from "../components/ui";

export function Dashboard() {
  const { business, fmt } = useBusiness();
  const bizId = business.id;

  const weekStart = useMemo(() => tsFrom(startOfWeek()), []);
  const monthStart = useMemo(() => tsFrom(startOfMonth()), []);
  const todayMs = useMemo(() => startOfToday().getTime(), []);

  const { data: weekInvoices, loading } = useLiveQuery<Invoice>(
    () => query(invoicesCol(bizId), where("issuedAt", ">=", weekStart), orderBy("issuedAt", "desc")),
    [bizId],
  );
  const { data: openInvoices } = useLiveQuery<Invoice>(
    () =>
      query(
        invoicesCol(bizId),
        where("status", "in", ["unpaid", "partial"]),
        orderBy("issuedAt", "desc"),
        limit(200),
      ),
    [bizId],
  );
  const { data: monthExpenses } = useLiveQuery<Expense>(
    () => query(expensesCol(bizId), where("at", ">=", monthStart)),
    [bizId],
  );
  const { data: customers } = useLiveQuery<Customer>(
    () => query(customersCol(bizId), limit(500)),
    [bizId],
  );

  const sold = weekInvoices.filter((i) => i.status !== "void");
  const today = sold.filter((i) => i.issuedAt.toMillis() >= todayMs);
  const todayTotal = today.reduce((s, i) => s + i.total, 0);
  const todayCredit = today.reduce((s, i) => s + i.balance, 0);
  const weekTotal = sold.reduce((s, i) => s + i.total, 0);
  const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const outstanding = openInvoices.reduce((s, i) => s + i.balance, 0);

  const phoneById = new Map(customers.map((c) => [c.id, c.phone]));
  const debtors = useMemo(() => {
    const byKey = new Map<string, { name: string; customerId: string | null; owed: number }>();
    for (const inv of openInvoices) {
      const key = inv.customerId ?? `walk-in:${inv.customerName || inv.id}`;
      const entry = byKey.get(key) ?? {
        name: inv.customerName || "Walk-in customer",
        customerId: inv.customerId,
        owed: 0,
      };
      entry.owed += inv.balance;
      byKey.set(key, entry);
    }
    return [...byKey.values()].sort((a, b) => b.owed - a.owed).slice(0, 5);
  }, [openInvoices]);

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="anim-fade">
      <header className="mb-6 lg:hidden">
        <p className="small-caps-label">{dateLine}</p>
        <h1 className="font-display text-[24px] font-bold leading-tight">{business.name}</h1>
      </header>
      <p className="small-caps-label hidden lg:block">{dateLine}</p>

      {/* Today, the number that matters */}
      <section className="mt-2">
        <p className="small-caps-label">Sales today</p>
        <p className="mt-1 font-display text-[46px] font-bold leading-none tracking-tight">
          {fmt(todayTotal)}
        </p>
        <p className="mt-2 text-[14px] text-ink-soft">
          {today.length === 0
            ? "Nothing recorded yet today"
            : `${today.length} ${today.length === 1 ? "sale" : "sales"}`}
          {todayCredit > 0 ? ` · ${fmt(todayCredit)} of it on credit` : ""}
        </p>
      </section>

      <section className="mt-6 flex gap-10 border-t border-line pt-4">
        <div>
          <p className="small-caps-label">This week</p>
          <p className="money mt-1 text-lg font-semibold">{fmt(weekTotal)}</p>
        </div>
        <div>
          <p className="small-caps-label">Expenses this month</p>
          <p className="money mt-1 text-lg font-semibold">{fmt(expensesTotal)}</p>
        </div>
      </section>

      {/* Who owes you */}
      {outstanding > 0 && (
        <section className="mt-9">
          <div className="flex items-baseline justify-between">
            <SectionLabel>Owing you</SectionLabel>
            <Amount className="text-[15px] font-semibold text-amber">{fmt(outstanding)}</Amount>
          </div>
          <ul>
            {debtors.map((d) => {
              const phone = d.customerId ? (phoneById.get(d.customerId) ?? "") : "";
              return (
                <li key={d.customerId ?? d.name} className="ledger-row">
                  <div className="min-w-0 flex-1">
                    {d.customerId ? (
                      <Link to={`/customers/${d.customerId}`} className="font-medium hover:underline">
                        {d.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{d.name}</span>
                    )}
                  </div>
                  <Amount className="font-semibold text-amber">{fmt(d.owed)}</Amount>
                  <a
                    href={waLink(phone, reminderText(business, d.name, d.owed))}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm border border-line bg-card px-2.5 py-1.5 text-[13px] font-semibold text-ink-soft hover:border-ink-faint"
                  >
                    Remind
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Recent sales */}
      <section className="mt-9">
        <SectionLabel>Recent sales</SectionLabel>
        {!loading && sold.length === 0 ? (
          <Empty
            title="Your ledger is open."
            body="Record your first sale — it takes about ten seconds, and the receipt is ready to share on WhatsApp."
            action={
              <Link to="/invoices/new">
                <Button variant="primary">Record first sale</Button>
              </Link>
            }
          />
        ) : (
          <ul>
            {sold.slice(0, 8).map((inv) => (
              <li key={inv.id}>
                <Link to={`/invoices/${inv.id}`} className="ledger-row hover:bg-card">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{inv.customerName || "Walk-in customer"}</p>
                    <p className="text-[13px] text-ink-faint">
                      {inv.number} · {fmtDateTime(inv.issuedAt)}
                    </p>
                  </div>
                  <Amount className="font-semibold">{fmt(inv.total)}</Amount>
                  <StatusChip status={inv.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
