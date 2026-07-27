import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { Button, Field, Input } from "../components/ui";

const ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/user-not-found": "No account with that email — create one below.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/email-already-in-use": "That email already has an account — sign in instead.",
  "auth/weak-password": "Password needs at least 6 characters.",
  "auth/network-request-failed": "No connection. Signing in needs internet once; after that the app works offline.",
};

export function SignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setMsg({ kind: "error", text: ERRORS[code] ?? "Something went wrong. Please try again." });
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setMsg({ kind: "error", text: "Type your email above first, then tap reset again." });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg({ kind: "info", text: "Reset link sent — check your inbox." });
    } catch {
      setMsg({ kind: "error", text: "Couldn't send the reset email. Check the address." });
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-paper px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <img src="/icon.svg" alt="" width={52} height={52} />
        <p className="small-caps-label mt-4">Counterbook</p>
        <h1 className="mt-2 font-display text-[28px] font-bold leading-tight">
          {mode === "signin" ? "Open your ledger" : "Start your ledger"}
        </h1>
        <p className="mt-1.5 leading-relaxed text-ink-soft">
          Sales, receipts, stock and expenses — one book for your business.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <Field label="Your name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Chukwuemeka Ike"
              />
            </Field>
          )}
          <Field label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
            />
          </Field>

          {msg && (
            <p
              role="alert"
              className={`rounded-md px-3 py-2.5 text-[14px] ${
                msg.kind === "error" ? "bg-clay-tint text-clay" : "bg-brand-tint text-brand-deep"
              }`}
            >
              {msg.text}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" full disabled={busy}>
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-[14px]">
          <button
            className="font-semibold text-brand-deep"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMsg(null);
            }}
          >
            {mode === "signin" ? "New here? Create account" : "Have an account? Sign in"}
          </button>
          {mode === "signin" && (
            <button className="text-ink-soft hover:text-ink" onClick={resetPassword}>
              Forgot password?
            </button>
          )}
        </div>

        <p className="mt-12 text-[12px] text-ink-faint">
          Made by{" "}
          <a
            href="https://fuseonlabs.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:text-ink"
          >
            Fuseon Labs
          </a>
        </p>
      </div>
    </div>
  );
}
