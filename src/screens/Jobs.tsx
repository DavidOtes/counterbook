import { Link } from "react-router";
import { limit, orderBy, query, where } from "firebase/firestore";
import { useBusiness } from "../context/BusinessContext";
import { invoicesCol } from "../data/db";
import { useLiveQuery } from "../data/hooks";
import { JOB_STAGES } from "../domain/presets";
import { fmtDateTime } from "../lib/format";
import type { Invoice } from "../domain/types";
import { Amount, Button, Empty, PageTitle } from "../components/ui";

const stageLabel = new Map(JOB_STAGES.map((s) => [s.value, s.label]));

export function Jobs() {
  const { business, fmt } = useBusiness();

  const { data: jobs, loading } = useLiveQuery<Invoice>(
    () =>
      query(
        invoicesCol(business.id),
        where("job.stage", "in", ["intake", "in_progress", "ready"]),
        orderBy("issuedAt", "desc"),
        limit(100),
      ),
    [business.id],
  );

  const open = jobs.filter((j) => j.status !== "void");

  return (
    <div className="anim-fade">
      <PageTitle sub="Work you've taken in and not yet handed back.">Jobs</PageTitle>

      {!loading && open.length === 0 ? (
        <Empty
          title="No open jobs."
          body='When a repair or order comes in, start a New sale and tick "This is a job" — it shows up here until it&apos;s delivered.'
          action={
            <Link to="/invoices/new">
              <Button variant="primary">Take in a job</Button>
            </Link>
          }
        />
      ) : (
        <ul>
          {open.map((j) => (
            <li key={j.id}>
              <Link to={`/invoices/${j.id}`} className="ledger-row hover:bg-card">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {j.job?.assetLabel || j.customerName || j.number}
                  </p>
                  <p className="text-[13px] text-ink-faint">
                    {j.customerName ? `${j.customerName} · ` : ""}
                    {fmtDateTime(j.issuedAt)}
                  </p>
                </div>
                <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[12px] font-semibold text-brand-deep">
                  {stageLabel.get(j.job?.stage ?? "intake")}
                </span>
                {j.balance > 0 && (
                  <Amount className="font-semibold text-amber">{fmt(j.balance)}</Amount>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
