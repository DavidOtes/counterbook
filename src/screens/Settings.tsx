import { useState } from "react";
import { useBusiness } from "../context/BusinessContext";
import { updateBusiness } from "../data/ops";
import { CURRENCIES } from "../domain/presets";
import { Button, Field, Input, PageTitle, Select, TextArea } from "../components/ui";

export function Settings() {
  const { business } = useBusiness();
  const [name, setName] = useState(business.name);
  const [prefix, setPrefix] = useState(business.invoicePrefix);
  const [footer, setFooter] = useState(business.receiptFooter);
  const [currency, setCurrency] = useState(business.currency);
  const [inventory, setInventory] = useState(business.modules.inventory);
  const [jobs, setJobs] = useState(business.modules.jobs);
  const [saved, setSaved] = useState(false);

  function save() {
    if (!name.trim()) return;
    updateBusiness(business.id, {
      name: name.trim(),
      invoicePrefix: prefix.trim() || "INV",
      receiptFooter: footer.trim(),
      currency,
      modules: { inventory, jobs },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="anim-fade max-w-lg">
      <PageTitle sub="Everything here can change as your business changes.">Settings</PageTitle>

      <div className="space-y-5">
        <Field label="Business name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Receipt prefix">
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="receipt" />
          </Field>
          <Field label="Currency" hint="Changing this doesn't convert old amounts.">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Receipt footer">
          <TextArea value={footer} onChange={(e) => setFooter(e.target.value)} />
        </Field>

        <fieldset className="border-t border-line pt-4">
          <legend className="small-caps-label">Modules</legend>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 accent-(--color-brand)"
              checked={inventory}
              onChange={(e) => setInventory(e.target.checked)}
            />
            <span>
              <span className="block font-medium">Stock tracking</span>
              <span className="block text-[14px] text-ink-soft">
                Count stock on products; sales reduce the count automatically.
              </span>
            </span>
          </label>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 accent-(--color-brand)"
              checked={jobs}
              onChange={(e) => setJobs(e.target.checked)}
            />
            <span>
              <span className="block font-medium">Job tracking</span>
              <span className="block text-[14px] text-ink-soft">
                For repairs and orders: received → in progress → ready → delivered.
              </span>
            </span>
          </label>
        </fieldset>

        <Button variant="primary" size="lg" onClick={save}>
          {saved ? "Saved ✓" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
