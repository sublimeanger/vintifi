
# Sales Recording: Best-in-Class "Mark as Sold" System

## The Problem

The current system has the right database columns (`sale_price`, `sold_at`, `status`) but the experience is broken in four ways:

1. **`sold_at` is never written** — the `saveEdit` function updates `status` and optionally `sale_price`, but never stamps `sold_at`. So there is permanently no record of when anything sold.

2. **No dedicated "Mark as Sold" flow** — selling is buried inside a tiny status dropdown chip. There's no moment to record the actual sale price, confirm the sale date, or celebrate the transaction.

3. **Sold cards look identical to active cards** — no visual distinction, no sale price shown, no days-to-sell displayed.

4. **Dashboard is blind to sales** — no "sold this week", no "this month's revenue", no profit flash.

---

## What Changes

### File 1: `src/pages/Listings.tsx`

#### A. "Mark as Sold" sheet/modal
Replace the buried status dropdown with a proper **"Mark as Sold" bottom sheet** triggered from the card dropdown menu. The sheet contains:
- A pre-filled sale price field (defaults to `current_price`)
- A sale date picker (defaults to today)
- A notes field (optional, e.g. "buyer collected", "posted Royal Mail")
- A "Confirm Sale" button

On confirm, it writes:
```
status: "sold"
sale_price: <entered value>
sold_at: <entered date ISO string>
```

The existing inline status dropdown (`saveEdit`) is also updated to stamp `sold_at: new Date().toISOString()` when changing status to "sold".

#### B. Sold item card visual
When `listing.status === "sold"`, the card shows a distinct visual treatment:
- A green "Sold" badge (already styled as `bg-primary/10 text-primary`)
- The **sale price** shown prominently (not the listed price)
- **Profit** shown inline: `+£12` in success green or `-£3` in red
- **Days to sell**: calculated as `sold_at - created_at` (e.g. "Sold in 4 days") — uses `sold_at` if set, otherwise falls back to `updated_at`
- The date shown under the calendar icon becomes the **sold date**, not the listed date, for sold items

#### C. Filter system additions (extending the approved plan)
Since the filtering plan was approved but not yet implemented, the sold-specific additions slot in naturally:

- `sortBy` gains a `"profit"` option — sort by highest net profit (sale_price minus purchase_price)
- The "sold" status chip already exists — no change needed
- When the "sold" filter is active, the result count line shows total revenue: `"5 sold · £247 total revenue"`

#### D. Date display (from the previously approved plan — implement alongside)
Add `formatAddedDate` helper and show `14d · 4 Feb, 09:41` on desktop. For sold items, show the **sold date** instead of the listed date, with a sold icon instead of the calendar icon.

---

### File 2: `src/pages/ItemDetail.tsx`

#### A. "Mark as Sold" action on the Overview tab
Add a prominent **"Mark as Sold"** button in the quick actions row (alongside Price, Improve, Photos) — shown only when `item.status !== "sold"`.

When clicked, opens the same sale confirmation sheet (shared component or inline state).

#### B. Sold state UI on Item Detail
When `item.status === "sold"`:
- Show a **sold confirmation card** at the top of the Overview tab with: sale price, profit (if cost is known), days to sell, sold date
- The "Price" metric card updates to show sale price instead of listed price, labelled "Sold for"
- The "Profit" metric card shows actual profit (sale_price - purchase_price) if both are known
- The workflow stepper gains a 5th step: "Sold ✓" shown in primary colour

#### C. Edit sale details
On the sold confirmation card, a small "Edit sale" link allows correcting the sale price or date after the fact (opens inline edit state).

---

### File 3: `src/pages/Dashboard.tsx`

Add a third metric card to the existing 2-card row (Active, Attention) — or replace the 2-col grid with a 3-col grid:

**"Sold This Month"** card:
- Queries `listings` where `status = "sold"` and `sold_at >= start of current month` (or `updated_at` as fallback)
- Shows count (e.g. `7`) with total revenue below (e.g. `£183`)
- Tapping it navigates to `/listings?status=sold`
- Styled with success green border-left

The dashboard fetch in `fetchAll` adds a fourth parallel query for this count.

---

## New "Mark as Sold" Sheet Component

A new lightweight component `MarkAsSoldSheet` (or inline sheet state in Listings) containing:

```
Title: "Mark as Sold"
Subtitle: "{item title}"

[Sale price input] — pre-filled with current_price
[Date sold input] — date picker, defaults to today
[Optional notes] — placeholder "e.g. Royal Mail Tracked 48"

[Cancel]  [Confirm Sale ✓]
```

On "Confirm Sale":
1. Updates `listings` row: `status = "sold"`, `sale_price = <input>`, `sold_at = <date>`
2. Shows a toast: "🎉 Sold for £X — profit: +£Y" (if cost is known)
3. Closes sheet and updates local state

---

## Filter & Sort Additions for Sold Items

Inside the filter panel (from the approved plan):

**New sort option:**
- `"profit"` — Sort by highest profit (sale_price - purchase_price). Only meaningful when sold items are visible.

**Revenue summary line:**
When `statusFilter === "sold"`:
```
"5 items · £247 revenue · £89 profit"
```
This replaces the generic "Showing X of Y" line with something sellers actually care about.

---

## `sold_at` Fallback Strategy

Since `sold_at` has never been written for existing sold items, a graceful fallback is needed throughout:
- If `sold_at` is set → use it as the definitive sold date
- If `sold_at` is null but `status === "sold"` → fall back to `updated_at` as an approximation, shown as "~{date}" to indicate it's estimated
- "Days to sell" = `sold_at ?? updated_at` minus `created_at`

---

## Listing Type Update

The `Listing` type in `Listings.tsx` needs one addition:
```typescript
sold_at: string | null;
```

And the `select("*")` query already returns all columns, so no query change is needed.

---

## Summary of Files Changed

| File | What changes |
|------|-------------|
| `src/pages/Listings.tsx` | Mark as Sold sheet, sold card visuals, sold_at stamping in saveEdit, date display, filter plan implementation, sold revenue summary line |
| `src/pages/ItemDetail.tsx` | Mark as Sold button + sheet, sold confirmation card, "Sold for" price display, sold workflow step |
| `src/pages/Dashboard.tsx` | Third metric card — "Sold This Month" with count + revenue |

No schema changes needed — `sold_at`, `sale_price`, and `status` already exist. No new edge functions. No new dependencies.

---

## What This Achieves

| Before | After |
|--------|-------|
| `sold_at` never written | Stamped on every sale going forward; fallback to `updated_at` for existing sold items |
| Status change buried in tiny dropdown | Dedicated "Mark as Sold" sheet with sale price + date capture |
| Sold cards look identical to active | Green sold badge, sale price, profit, days to sell all visible on card |
| Dashboard blind to sales | "Sold This Month" card with count + revenue |
| No profit-sorted view | Sort by profit option in filter panel |
| No revenue summary | "5 sold · £247 revenue" when sold filter is active |
