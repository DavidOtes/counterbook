import { Link, useNavigate, useParams } from "react-router";
import { doc, limit, orderBy, query, where } from "firebase/firestore";
import { useBusiness } from "../context/BusinessContext";
import { customersCol, invoicesCol } from "../data/db";
import { useLiveDoc, useLiveQuery } from "../data/hooks";
import { reminderText } from "../domain/invoice";
import { fmtDateTime, waLink } from "../lib/format";
import type { Customer, Invoice } from "../domain/types";
import { Amount, Button, Empty, StatusChip } from "../components/ui";
import { BackIcon, PhoneIcon, SendIcon } from "../components/icons";
import { Splash } from "../components/Splash";

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { business, fmt } = useBusiness();
  const navigate = useNavigate();

  const { data: customer, loading } = useLiveDoc<Customer>(
    () => (id ? doc(customersCol(business.id), id) : null),
    [business.id, id],
  );
  const { data: invoices } = useLiveQuery<Invoice>(
    () =>
      id
        ? query(
            invoicesCol(business.id),
            where("customerId", "==", id),
            orderBy("issuedAt", "desc"),
            limit(100),
          )
        : null,
    [business.id, id],
  );

  if (loading) return <Splash />;
  if (!customer) {
    return (
      <div className="py-16 text-center text-ink-soft">
        Customer not found.{" "}
        <Link className="font-semibold text-brand-deep" to="/customers">
          Back to customers
        </Link>
      </div>
    );
  }

  const active = invoices.filter((i) => i.status !== "void");
  const owed = active.reduce((s, i) => s + i.balance, 0);
  const lifetime = active.reduce((s, i) => s + i.total, 0);

  return (
    <div className="anim-fade">
      <header className="mb-6 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="-ml-2 rounded-md p-2 text-ink-soft hover:text-ink"
        >
          <BackIcon />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[22px] font-bold">{customer.name}</h1>
          {customer.phone && <p className="text-[14px] text-ink-soft">{customer.phone}</p>}
        </div>
      </header>

      <section className="flex gap-10 border-b border-line pb-5">
        <div>
          <p className="small-caps-label">Owing</p>
          <p className={`money mt-1 text-xl font-semibold ${owed > 0 ? "text-amber" : ""}`}>
            {fmt(owed)}
          </p>
        </div>
        <div>
          <p className="small-caps-label">All-time sales</p>
          <p className="money mt-1 text-xl font-semibold">{fmt(lifetime)}</p>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {customer.phone && (
          <a href={`tel:${customer.phone}`}>
            <Button size="sm">
              <PhoneIcon width={16} height={16} /> Call
            </Button>
          </a>
        )}
        {owed > 0 && (
          <a
            href={waLink(customer.phone, reminderText(business, customer.name, owed))}
            target="_blank"
            rel="noreferrer"
          >
            <Button size="sm" variant="primary">
              <SendIcon width={16} height={16} /> Send reminder
            </Button>
          </a>
        )}
      </div>

      <section className="mt-8">
        <p className="small-caps-label mb-1">History</p>
        {invoices.length === 0 ? (
          <Empty title="Nothing yet." body="Sales for this customer will appear here." />
        ) : (
          <ul>
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link to={`/invoices/${inv.id}`} className="ledger-row hover:bg-card">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{inv.number}</p>
                    <p className="text-[13px] text-ink-faint">{fmtDateTime(inv.issuedAt)}</p>
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
