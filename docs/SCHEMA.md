# Data model

One schema serves every kind of small business. The five primitives:

| Primitive | Collection | What it is |
|---|---|---|
| Parties | `customers` | People you sell to (suppliers later) |
| Items | `items` | Things you sell — products with stock, or services without |
| Documents | `invoices` | The sale record; doubles as receipt, and as a **job card** when `job` is set |
| Payments | `payments` | Money in, each one a row — cash, transfer, POS, part-payments |
| Expenses | `expenses` | Money out, optionally with a receipt photo |

A retailer, a laptop repairer and a tailor differ only in which **modules** are
switched on (`business.modules`) and vocabulary — never in schema.

## Collection tree

```
businesses/{bizId}              ← membership + settings live here
  customers/{customerId}
  items/{itemId}
  invoices/{invoiceId}          ← lines embedded as an array
  payments/{paymentId}
  expenses/{expenseId}
  stockMovements/{movementId}   ← append-only stock audit trail
```

Everything hangs under the business document, so **one membership check
secures all data** (see `firestore.rules`) and a future "export my business"
is a single subtree copy.

## Ground rules

1. **Money is integer minor units** (kobo, cents). Floats never touch storage.
   `lib/format.ts` converts at the UI edge. Zero-decimal currencies (JPY, XOF…)
   use factor 1.
2. **Every write works offline.** Only `setDoc` / `updateDoc` / `writeBatch`
   (they queue in IndexedDB and sync later) — never `runTransaction`, which
   needs a live server. Commits are not awaited; local snapshots update
   instantly. This is why a sale can be recorded in a shop with no signal.
3. **Denormalize what receipts need.** `invoice.customerName` is a snapshot;
   receipts must survive customer edits. `invoice.amountPaid / balance /
   status` are maintained on the invoice so "who owes me" is one indexed query,
   no joins.
4. **Stock changes are increments plus a movement row.** `increment(±n)`
   merges safely when two devices sell concurrently; `stockMovements` is the
   append-only truth for audits ("why is the count 3?").
5. **Never block a sale.** Stock may go negative — that's a signal to recount,
   not a reason to lose revenue. The UI warns but allows.

## Documents

### businesses/{id}
`name, type ('retail'|'services'|'mixed'), currency (ISO 4217), invoicePrefix,
receiptFooter, modules { inventory, jobs }, memberUids: uid[], members: { uid:
'owner'|'staff' }, createdAt`

`memberUids` (array) exists purely so `array-contains` can list "my
businesses" and rules can check membership cheaply; `members` carries roles.

### customers/{id}
`name, phone, email, note, createdAt` — outstanding balance is **not** stored;
it's derived from open invoices (`status in ['unpaid','partial']`), which is
correct-by-construction at MVP scale. Upgrade path when a business has
thousands of open invoices: maintain a counter via Cloud Function.

### items/{id}
`name, kind ('product'|'service'), price (minor), unit, barcode, trackStock,
stockQty, archived, createdAt`

`barcode` is plain text: USB/Bluetooth scanners act as keyboards, so scanning
into the sale form just types the code and the form matches it — no camera
code needed for v1. Camera scanning (BarcodeDetector API) is Phase 2.
Items are archived, never deleted — history references them.

### invoices/{id}
`number, customerId?, customerName, lines[] { itemId?, description, qty,
unitPrice, total }, subtotal, discount, total, amountPaid, balance,
status ('unpaid'|'partial'|'paid'|'void'), issuedAt, dueAt?, note,
job? { stage: 'intake'|'in_progress'|'ready'|'delivered', assetLabel },
createdBy, createdAt`

- Lines are **embedded**: a receipt is read as one unit, never queried line-by-line.
- `number` is `PREFIX-yymmdd-XXXX` (random Crockford suffix): unique with no
  coordination, generated offline. If a tax regime demands strict sequence,
  add a Cloud Function that assigns `seq` on sync — documents are already
  ordered by `issuedAt`.
- A **job is not a separate entity** — it's an invoice with `job` set. This is
  the one-app-many-businesses thesis in one field: the repairer's job card and
  the shop's receipt share lines, payments, balances and reporting.
- `void`: the record stays (ledgers don't erase), excluded from open-balance
  queries. Stock is *not* auto-restored yet — a deliberate MVP simplification;
  restore via item edit. Planned: reversing `stockMovements` on void.

### payments/{id}
`invoiceId, invoiceNumber, customerId?, customerName, amount, method
('cash'|'transfer'|'pos'|'other'), at, note`

Separate collection (not embedded) because part-payments arrive days apart,
and "payments received this week by method" is its own report later.
Recording one batches: payment doc + invoice `amountPaid/balance/status`.

### expenses/{id}
`amount, category, vendor, note, at, receiptPath?, createdAt`

`receiptPath` points into Storage (`receipts/{uid}/{bizId}/…`). The photo
upload is best-effort online; the expense record itself saves offline.
Phase 2: vision-model extraction (photo → amount/vendor/date prefilled).

### stockMovements/{id}
`itemId, itemName, delta (signed), reason ('sale'|'restock'|'adjustment'|'void'),
refId?, at`

## Dashboard queries (and their indexes)

| Question | Query | Index |
|---|---|---|
| Sales today / this week | `issuedAt >= startOfWeek` | single-field (auto) |
| Who owes me | `status in ['unpaid','partial'] orderBy issuedAt` | `status + issuedAt` |
| Customer history | `customerId == X orderBy issuedAt` | `customerId + issuedAt` |
| Open jobs | `job.stage in [...] orderBy issuedAt` | `job.stage + issuedAt` |
| Expenses this month | `at >= startOfMonth` | single-field (auto) |

All composite indexes are declared in `firestore.indexes.json`. Aggregations
are client-side over these bounded result sets — right up to thousands of
docs/month. Beyond that: nightly aggregate docs (`stats/{yyyymm}`) written by
a Cloud Function.

## Security model

- Business doc: readable/updatable by members only; creatable only with
  yourself as sole owner; membership fields immutable from the client.
- Subcollections: one rule — `request.auth.uid in parent.memberUids`.
- Storage: uploads scoped to the uploader's uid path.

## Later phases (designed-for, not built)

- **Receipt OCR**: Cloud Function + vision LLM fills expense fields from the
  photo already stored at `receiptPath`.
- **Label capture**: photo of a device label → `job.assetLabel` (generalizes
  the "scan the laptop" idea to anything with a sticker).
- **Paper ledger import**: photos of the old book → transcribed invoices.
- **Quotes/drafts**: an invoice `status: 'quote'` upstream of `unpaid`.
- **Staff roles**: `members.{uid}: 'staff'` exists; add per-role rules.
- **Sequential numbering / VAT fields** where regulation requires.
