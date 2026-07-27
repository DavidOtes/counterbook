import { useState, type FormEvent } from "react";
import { useAuth, signOutUser } from "../context/AuthContext";
import { createBusiness } from "../data/ops";
import { BUSINESS_TYPES, CURRENCIES } from "../domain/presets";
import type { BusinessType } from "../domain/types";
import { Button, Field, Input, Select } from "../components/ui";

export function Onboarding() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType>("retail");
  const [currency, setCurrency] = useState("NGN");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    const id = createBusiness(user.uid, { name, type, currency });
    localStorage.setItem("invoice.bizId", id);
    // The live businesses query picks the new doc up from the local cache
    // immediately and the provider swaps this screen for the app shell.
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <img src="/icon.svg" alt="" width={44} height={44} />
      <h1 className="mt-4 font-display text-[26px] font-bold">Set up your business</h1>
      <p className="mt-1 leading-relaxed text-ink-soft">
        One minute, three questions — you can change all of it later in Settings.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-6">
        <Field label="Business name">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ike Phones & Repairs"
          />
        </Field>

        <fieldset>
          <legend className="small-caps-label">What kind of business?</legend>
          <div className="mt-2 space-y-2">
            {BUSINESS_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  type === t.value
                    ? "border-brand bg-brand-tint"
                    : "border-line bg-card hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name="biztype"
                  className="mt-1 accent-(--color-brand)"
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                />
                <span>
                  <span className="block font-semibold">{t.title}</span>
                  <span className="block text-[14px] text-ink-soft">{t.blurb}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-ink-faint">
            This only sets sensible defaults — every feature can be switched on or off later.
          </p>
        </fieldset>

        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" variant="primary" size="lg" full>
          Open my ledger
        </Button>
      </form>

      <button onClick={signOutUser} className="mt-6 text-[14px] text-ink-soft hover:text-ink">
        Sign out
      </button>
    </div>
  );
}
