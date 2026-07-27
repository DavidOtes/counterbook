import { useMemo, useState } from "react";
import { limit, orderBy, query } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { expensesCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { addExpense } from "../data/ops";
import { EXPENSE_CATEGORIES } from "../domain/presets";
import { fmtDate, parseMoney } from "../lib/format";
import { downscaleToBase64 } from "../lib/image";
import type { Expense } from "../domain/types";
import { Amount, Button, Empty, Field, Input, PageTitle, Sheet } from "../components/ui";
import { CameraIcon, PlusIcon } from "../components/icons";

export function Expenses() {
  const { user } = useAuth();
  const { business, fmt } = useBusiness();
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const { data: expenses, loading } = useLiveQuery<Expense>(
    () => query(expensesCol(business.id), orderBy("at", "desc"), limit(200)),
    [business.id],
  );

  const groups = useMemo(() => {
    const g = new Map<string, { label: string; total: number; rows: Expense[] }>();
    for (const e of expenses) {
      const d = e.at.toDate();
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const entry = g.get(key) ?? { label, total: 0, rows: [] };
      entry.total += e.amount;
      entry.rows.push(e);
      g.set(key, entry);
    }
    return [...g.values()];
  }, [expenses]);

  /** Photo -> Claude vision (via our Vercel function) -> prefilled fields. */
  async function readWithAI() {
    if (!file) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const { data, mediaType } = await downscaleToBase64(file);
      const resp = await fetch("/api/extract-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mediaType }),
      });
      if (resp.status === 501) {
        setAiNote("AI reading isn't switched on yet — add ANTHROPIC_API_KEY in Vercel settings.");
        return;
      }
      if (!resp.ok) throw new Error(String(resp.status));
      const out = await resp.json();
      if (typeof out.amountMajor === "number" && out.amountMajor > 0) {
        setAmountStr(String(out.amountMajor));
      }
      if (out.vendor) setVendor(String(out.vendor));
      if (typeof out.dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(out.dateISO)) {
        setDate(out.dateISO);
      }
      if (EXPENSE_CATEGORIES.includes(out.category)) setCategory(out.category);
      setAiNote(
        out.confidence === "high"
          ? "Read it — give the fields a quick check, then save."
          : "Read what I could — please double-check the amount.",
      );
    } catch {
      setAiNote("Couldn't read it from here. AI reading works on the live app; typing works everywhere.");
    } finally {
      setAiBusy(false);
    }
  }

  function save() {
    const amount = parseMoney(amountStr, business.currency);
    if (!user || amount <= 0) return;
    addExpense(business.id, user.uid, {
      amount,
      category,
      vendor,
      note: "",
      at: new Date(`${date}T12:00:00`),
      file,
    });
    setAmountStr("");
    setVendor("");
    setFile(null);
    setOpen(false);
  }

  return (
    <div className="anim-fade">
      <PageTitle sub="Money going out — snap the paper receipt and let go of the shoebox.">
        Expenses
      </PageTitle>

      <Button variant="primary" onClick={() => setOpen(true)}>
        <PlusIcon width={18} height={18} /> Add expense
      </Button>

      {!loading && expenses.length === 0 ? (
        <Empty
          title="No expenses recorded."
          body="Rent, fuel, stock purchases, data — record them here and the dashboard shows what the month really cost you."
        />
      ) : (
        groups.map((g) => (
          <section key={g.label} className="mt-7">
            <div className="flex items-baseline justify-between">
              <h2 className="small-caps-label">{g.label}</h2>
              <Amount className="text-[14px] font-semibold text-ink-soft">{fmt(g.total)}</Amount>
            </div>
            <ul>
              {g.rows.map((e) => (
                <li key={e.id} className="ledger-row">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {e.category}
                      {e.receiptPath && (
                        <CameraIcon width={15} height={15} className="ml-1.5 inline text-ink-faint" />
                      )}
                    </p>
                    <p className="text-[13px] text-ink-faint">
                      {e.vendor ? `${e.vendor} · ` : ""}
                      {fmtDate(e.at)}
                    </p>
                  </div>
                  <Amount className="font-semibold">{fmt(e.amount)}</Amount>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Add expense">
        <div className="space-y-4">
          <Field label="Amount">
            <Input
              inputMode="decimal"
              className="money"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
            />
          </Field>
          <div>
            <p className="small-caps-label mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                    category === c
                      ? "bg-brand-tint text-brand-deep"
                      : "border border-line bg-card text-ink-soft"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid to (optional)">
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Receipt photo (optional)" hint="Uploads when you're online; the expense saves either way.">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setAiNote(null);
              }}
              className="block w-full text-[14px] text-ink-soft file:mr-3 file:rounded-md file:border file:border-line file:bg-card file:px-3 file:py-2 file:font-semibold file:text-ink"
            />
          </Field>
          {file && (
            <Button size="sm" onClick={readWithAI} disabled={aiBusy}>
              {aiBusy ? "Reading the receipt…" : "✨ Read it for me"}
            </Button>
          )}
          {aiNote && <p className="text-[13px] text-ink-soft">{aiNote}</p>}
          <Button variant="primary" size="lg" full onClick={save}>
            Save expense
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
