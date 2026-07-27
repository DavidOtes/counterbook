import { useState } from "react";
import { Link } from "react-router";
import { limit, orderBy, query } from "firebase/firestore";
import { useBusiness } from "../context/BusinessContext";
import { invoicesCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { fmtDateTime } from "../lib/format";
import type { Invoice } from "../domain/types";
import { Amount, Button, Empty, Input, PageTitle, StatusChip } from "../components/ui";

type Filter = "all" | "open" | "paid";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

export function Invoices() {
  const { business, fmt } = useBusiness();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const { data: invoices, loading } = useLiveQuery<Invoice>(
    () => query(invoicesCol(business.id), orderBy("issuedAt", "desc"), limit(100)),
    [business.id],
  );

  const needle = q.trim().toLowerCase();
  const shown = invoices.filter((inv) => {
    if (filter === "open" && !(inv.status === "unpaid" || inv.status === "partial")) return false;
    if (filter === "paid" && inv.status !== "paid") return false;
    if (
      needle &&
      !inv.number.toLowerCase().includes(needle) &&
      !inv.customerName.toLowerCase().includes(needle)
    )
      return false;
    return true;
  });

  return (
    <div className="anim-fade">
      <PageTitle sub="Every sale, invoice and receipt — newest first.">Sales</PageTitle>

      <div className="mb-2 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              filter === f.value
                ? "bg-brand-tint text-brand-deep"
                : "border border-line bg-card text-ink-soft hover:border-ink-faint"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by customer or receipt number"
        className="mb-1"
      />

      {!loading && shown.length === 0 ? (
        invoices.length === 0 ? (
          <Empty
            title="No sales recorded yet."
            body="Your first receipt is ten seconds away. Everything you record works even with no connection."
            action={
              <Link to="/invoices/new">
                <Button variant="primary">New sale</Button>
              </Link>
            }
          />
        ) : (
          <Empty title="Nothing matches." body="Try a different filter or search." />
        )
      ) : (
        <ul>
          {shown.map((inv) => (
            <li key={inv.id}>
              <Link to={`/invoices/${inv.id}`} className="ledger-row hover:bg-card">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{inv.customerName || "Walk-in customer"}</p>
                  <p className="text-[13px] text-ink-faint">
                    {inv.number} · {fmtDateTime(inv.issuedAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Amount className="font-semibold">{fmt(inv.total)}</Amount>
                  <StatusChip status={inv.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
