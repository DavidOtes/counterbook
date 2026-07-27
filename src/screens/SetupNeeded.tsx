export function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <img src="/icon.svg" alt="" width={48} height={48} />
      <h1 className="mt-4 font-display text-2xl font-bold">Almost there — connect Firebase</h1>
      <p className="mt-2 leading-relaxed text-ink-soft">
        The app is built and running; it just doesn't know which Firebase project to talk
        to yet. Two ways to fix that:
      </p>

      <ol className="mt-6 space-y-5 text-[15px] leading-relaxed">
        <li>
          <p className="font-semibold">1. Use a real Firebase project (recommended)</p>
          <p className="mt-1 text-ink-soft">
            Create a project at console.firebase.google.com, enable <b>Authentication →
            Email/Password</b>, <b>Firestore</b>, and <b>Storage</b>, then copy the web-app
            config into <code className="receipt text-[13px]">.env.local</code> (see{" "}
            <code className="receipt text-[13px]">.env.example</code>) and restart{" "}
            <code className="receipt text-[13px]">npm run dev</code>.
          </p>
        </li>
        <li>
          <p className="font-semibold">2. Or run fully local emulators</p>
          <p className="mt-1 text-ink-soft">
            Set <code className="receipt text-[13px]">VITE_USE_EMULATORS=true</code> in{" "}
            <code className="receipt text-[13px]">.env.local</code>, then run{" "}
            <code className="receipt text-[13px]">npm run emulators</code> in another
            terminal (needs <code className="receipt text-[13px]">npm i -g firebase-tools</code>).
            No account required.
          </p>
        </li>
      </ol>

      <p className="mt-8 border-t border-line pt-4 text-[14px] text-ink-faint">
        Full setup steps are in README.md · data model in docs/SCHEMA.md
      </p>
    </div>
  );
}
