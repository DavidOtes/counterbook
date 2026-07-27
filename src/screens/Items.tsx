import { useState } from "react";
import { limit, orderBy, query } from "firebase/firestore";
import { useBusiness } from "../context/BusinessContext";
import { itemsCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { addItem, adjustStock, updateItem } from "../data/ops";
import { parseMoney, toMajor } from "../lib/format";
import type { Item } from "../domain/types";
import { Amount, Button, Empty, Field, Input, PageTitle, Sheet } from "../components/ui";
import { PlusIcon } from "../components/icons";

interface Draft {
  id: string | null;
  name: string;
  priceStr: string;
  barcode: string;
  unit: string;
  isService: boolean;
  trackStock: boolean;
  stockStr: string;
}

const emptyDraft = (isService: boolean): Draft => ({
  id: null,
  name: "",
  priceStr: "",
  barcode: "",
  unit: "",
  isService,
  trackStock: !isService,
  stockStr: "0",
});

export function Items() {
  const { business, modules, noun, fmt } = useBusiness();
  const currency = business.currency;
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [original, setOriginal] = useState<Item | null>(null);

  const { data: items, loading } = useLiveQuery<Item>(
    () => query(itemsCol(business.id), orderBy("name"), limit(500)),
    [business.id],
  );

  const needle = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      !i.archived &&
      (!needle || i.name.toLowerCase().includes(needle) || i.barcode.toLowerCase().includes(needle)),
  );

  function openEdit(item: Item) {
    setOriginal(item);
    setDraft({
      id: item.id,
      name: item.name,
      priceStr: item.price > 0 ? toMajor(item.price, currency) : "",
      barcode: item.barcode,
      unit: item.unit,
      isService: item.kind === "service",
      trackStock: item.trackStock,
      stockStr: String(item.stockQty),
    });
  }

  function save() {
    if (!draft || !draft.name.trim()) return;
    const base = {
      name: draft.name,
      kind: (draft.isService ? "service" : "product") as Item["kind"],
      price: parseMoney(draft.priceStr, currency),
      unit: draft.unit.trim(),
      barcode: draft.barcode.trim(),
      trackStock: !draft.isService && draft.trackStock,
    };
    const stockQty = Math.round(Number(draft.stockStr) || 0);
    if (draft.id && original) {
      updateItem(business.id, draft.id, base);
      if (base.trackStock && stockQty !== original.stockQty) {
        adjustStock(business.id, original, stockQty);
      }
    } else {
      addItem(business.id, { ...base, stockQty: base.trackStock ? stockQty : 0 });
    }
    setDraft(null);
    setOriginal(null);
  }

  function archive() {
    if (draft?.id) updateItem(business.id, draft.id, { archived: true });
    setDraft(null);
    setOriginal(null);
  }

  return (
    <div className="anim-fade">
      <PageTitle sub="Saved things you sell — with prices ready, sales get faster.">
        {noun}
      </PageTitle>

      <div className="mb-1 flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or barcode"
        />
        <Button onClick={() => setDraft(emptyDraft(!modules.inventory))} className="shrink-0">
          <PlusIcon width={18} height={18} /> Add
        </Button>
      </div>

      {!loading && shown.length === 0 ? (
        <Empty
          title={`No ${noun.toLowerCase()} saved yet.`}
          body="Save the things you sell most, with prices — then a sale is just: tap, tap, receipt. You can also type anything free-hand during a sale."
          action={
            <Button variant="primary" onClick={() => setDraft(emptyDraft(!modules.inventory))}>
              Add your first
            </Button>
          }
        />
      ) : (
        <ul>
          {shown.map((item) => (
            <li key={item.id}>
              <button onClick={() => openEdit(item)} className="ledger-row hover:bg-card">
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-[13px] text-ink-faint">
                    {item.kind === "service" ? "Service" : "Product"}
                    {item.barcode ? ` · ${item.barcode}` : ""}
                  </p>
                </div>
                {item.trackStock && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      item.stockQty <= 0
                        ? "bg-clay-tint text-clay"
                        : item.stockQty <= 3
                          ? "bg-amber-tint text-amber"
                          : "border border-line bg-card text-ink-soft"
                    }`}
                  >
                    {item.stockQty} left
                  </span>
                )}
                <Amount className="font-semibold">{item.price > 0 ? fmt(item.price) : "—"}</Amount>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={draft !== null}
        onClose={() => {
          setDraft(null);
          setOriginal(null);
        }}
        title={draft?.id ? "Edit" : "Add"}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Name">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                autoFocus={!draft.id}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price">
                <Input
                  inputMode="decimal"
                  className="money"
                  value={draft.priceStr}
                  onChange={(e) => setDraft({ ...draft, priceStr: e.target.value })}
                />
              </Field>
              <Field label="Unit (optional)">
                <Input
                  placeholder="pc, kg, hr…"
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                />
              </Field>
            </div>
            {modules.inventory && (
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  className="accent-(--color-brand)"
                  checked={draft.isService}
                  onChange={(e) =>
                    setDraft({ ...draft, isService: e.target.checked, trackStock: !e.target.checked })
                  }
                />
                This is a service (no stock)
              </label>
            )}
            {!draft.isService && modules.inventory && (
              <div className="grid grid-cols-2 items-end gap-3">
                <label className="flex items-center gap-2 pb-3 text-[15px]">
                  <input
                    type="checkbox"
                    className="accent-(--color-brand)"
                    checked={draft.trackStock}
                    onChange={(e) => setDraft({ ...draft, trackStock: e.target.checked })}
                  />
                  Track stock
                </label>
                {draft.trackStock && (
                  <Field label="Stock count">
                    <Input
                      type="number"
                      value={draft.stockStr}
                      onChange={(e) => setDraft({ ...draft, stockStr: e.target.value })}
                    />
                  </Field>
                )}
              </div>
            )}
            <Field
              label="Barcode (optional)"
              hint="Click here and scan with any USB/Bluetooth scanner — it types the code for you. During a sale, scanning fills the line instantly."
            >
              <Input
                value={draft.barcode}
                onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
                className="receipt"
              />
            </Field>
            <Button variant="primary" size="lg" full onClick={save}>
              Save
            </Button>
            {draft.id && (
              <button
                onClick={archive}
                className="mx-auto block text-[13px] font-semibold text-ink-faint hover:text-clay"
              >
                Archive — hide from lists, keep history
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
