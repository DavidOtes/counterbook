# Counterbook — a ledger for small businesses

Sales, receipts, stock, jobs and expenses in one place — built to replace the
paper bookkeeping book, for shops, repairers, tailors and everything between.

**Stack:** React 19 + TypeScript + Vite, Tailwind CSS 4, Firebase (Auth,
Firestore, Storage). Installable PWA, **offline-first**: sales recorded with
no signal sync when the connection returns.

One app serves every business type: onboarding asks "what kind of business?"
and the answer toggles *modules* (stock tracking, job tracking) and
vocabulary — never a separate app. See [docs/SCHEMA.md](docs/SCHEMA.md) for
the data model and the reasoning behind it.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill it in (next section)
npm run dev
```

Without Firebase credentials the app boots to a setup screen with these same
instructions.

### Option A — real Firebase project (recommended)

1. Create a project at <https://console.firebase.google.com> (free Spark plan
   is fine to start).
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode).
4. **Build → Storage → Get started.**
5. Project settings → General → *Your apps* → Web app → copy the config
   values into `.env.local`.
6. Deploy the security rules and indexes (once):

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### Option B — local emulators, no account

```bash
npm i -g firebase-tools        # needs a Java runtime for the Firestore emulator
echo "VITE_USE_EMULATORS=true" > .env.local
npm run emulators              # terminal 1
npm run dev                    # terminal 2
```

Emulator data is in-memory; export/import flags are in the Firebase docs.

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` already serves `dist/` with SPA rewrites. (Vercel/Netlify work
too — it's a static bundle.)

## Project layout

```
src/
  domain/     types, business-type presets, invoice math   ← pure, no Firebase
  data/       collection accessors, live hooks, write ops  ← ALL writes offline-safe
  lib/        firebase init, money/date formatting
  context/    auth + current-business providers
  components/ ui kit, icons, app shell
  screens/    one file per screen
docs/SCHEMA.md      data model & design decisions
firestore.rules     membership-based security
.impeccable.md      design context (audience, tone, principles)
```

## Design language

"A well-kept ledger": warm paper surfaces, deep market-green, ruled-line
lists, amounts always in the receipt face (tabular mono). Light theme on
purpose — this is used in daylight shops on budget phones. Fonts are bundled
locally (Bricolage Grotesque / Hanken Grotesk / Spline Sans Mono) so the PWA
renders offline. Details in `.impeccable.md`.

## Roadmap

- **Phase 2 — the camera becomes the keyboard:** receipt photo → expense
  fields via a vision model; camera barcode scanning (BarcodeDetector) for
  retail; device-label photo → job asset details; WhatsApp debtor reminders
  you already have, made scheduled.
- **Phase 3 — accounting surface:** monthly P&L view, payments-by-method
  report, CSV/PDF export for the accountant, staff accounts with roles,
  paper-ledger import (photograph the old book, AI transcribes it).

## Known gaps (deliberate for v1)

- PWA icons are SVG-only; iOS home-screen wants PNG `apple-touch-icon` sizes.
- Voiding a receipt doesn't auto-restore stock (documented in SCHEMA.md).
- Not a git repo yet — run `git init` when ready.
- **The name "Counterbook" is provisional.** A prior Nigerian app of the same
  name looks defunct (empty site, no store listings), but do a Nigerian
  trademark registry search and try to acquire `counterbook.app` from its
  holder before launch. Fallback candidate: **Balans**.
