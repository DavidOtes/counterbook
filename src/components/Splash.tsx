export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <div className="anim-fade flex flex-col items-center gap-3">
        <img src="/icon.svg" alt="" width={56} height={56} />
        <p className="small-caps-label">Opening your ledger…</p>
      </div>
    </div>
  );
}
