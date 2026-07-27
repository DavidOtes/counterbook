import { useMemo, useState } from "react";
import { Link } from "react-router";
import { limit, orderBy, query, where } from "firebase/firestore";
import { useBusiness } from "../context/BusinessContext";
import { customersCol, invoicesCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { addCustomer } from "../data/ops";
import type { Customer, Invoice } from "../domain/types";
import { Amount, Button, Empty, Field, Input, PageTitle, Sheet } from "../components/ui";
import { PlusIcon } from "../components/icons";

export function Customers() {
  const { business, fmt } = useBusiness();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data: customers, loading } = useLiveQuery<Customer>(
    () => query(customersCol(business.id), orderBy("name"), limit(500)),
    [business.id],
  );
  const { data: openInvoices } = useLiveQuery<Invoice>(
    () =>
      query(invoicesCol(business.id), where("status", "in", ["unpaid", "partial"]), limit(500)),
    [business.id],
  );

  const owedBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const inv of openInvoices) {
      if (inv.customerId) m.set(inv.customerId, (m.get(inv.customerId) ?? 0) + inv.balance);
    }
    return m;
  }, [openInvoices]);

  const needle = q.trim().toLowerCase();
  const shown = customers.filter(
    (c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.includes(needle),
  );

  function save() {
    if (!name.trim()) return;
    addCustomer(business.id, { name, phone });
    setName("");
    setPhone("");
    setAddOpen(false);
  }

  return (
    <div className="anim-fade">
      <PageTitle sub="Everyone you sell to — and who still owes you.">Customers</PageTitle>

      <div className="mb-1 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" />
        <Button onClick={() => setAddOpen(true)} aria-label="Add customer" className="shrink-0">
          <PlusIcon width={18} height={18} /> Add
        </Button>
      </div>

      {!loading && shown.length === 0 ? (
        customers.length === 0 ? (
          <Empty
            title="No customers saved yet."
            body="You don't have to add anyone up front — saving a customer during a sale takes one tap, and walk-in sales need no name at all."
            action={<Button variant="primary" onClick={() => setAddOpen(true)}>Add a customer</Button>}
          />
        ) : (
          <Empty title="No match." body="Try a different name or number." />
        )
      ) : (
        <ul>
          {shown.map((c) => {
            const owed = owedBy.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link to={`/customers/${c.id}`} className="ledger-row hover:bg-card">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.phone && <p className="text-[13px] text-ink-faint">{c.phone}</p>}
                  </div>
                  {owed > 0 && (
                    <Amount className="font-semibold text-amber">{fmt(owed)}</Amount>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add customer">
        <div className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Phone" hint="Used for WhatsApp receipts and polite reminders.">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </Field>
          <Button variant="primary" size="lg" full onClick={save}>
            Save customer
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
