

## Fix: Next Actions Inbox — Card Click vs Button Click

### Problem

The "Next Actions" inbox has a single click handler on the entire row. Whether you tap the product image/title or the "Price Check" button, it navigates to the same path: `/price-check?title=...&itemId=...`.

Two issues with this:

1. **Clicking the product card** should navigate to the Item Detail page (`/items/:id`) — not to the Price Check page. Users expect tapping a product to open that product.

2. **The Price Check link passes `title` but not `brand` or `category`** — yet the Price Check page reads `brand` and `category` from URL params to pre-populate the form. Since those are missing, the manual entry fields are empty and the page appears blank/useless.

### Solution

Split the click targets so they behave correctly:

- **Row click (thumbnail + title area):** Always navigates to `/items/:id` — the item's detail hub.
- **Action button click ("Price Check" / "Improve" / "Review"):** Navigates to the action-specific path with proper parameters, and stops event propagation so it doesn't also trigger the row click.

Additionally, fix the Price Check action path to include `brand` and `category` (which are already fetched from the database) so the manual entry form is pre-populated.

### Technical Changes

**File: `src/components/NextActionsInbox.tsx`**

1. Change the row's `onClick` to always navigate to `/items/${item.id}` (the item detail page).

2. On the action `Button`, add an `onClick` with `e.stopPropagation()` that navigates to `item.actionPath`.

3. Update the `actionPath` for "needs_price" items to include `brand` and `category` params:
   - From: `/price-check?title=...&itemId=...`
   - To: `/price-check?brand=...&category=...&itemId=...`

4. Similarly update the "needs_optimise" path to also pass `brand`.

This aligns with the item-centric navigation model where clicking any inventory card always goes to the detail page, and specific action buttons trigger their respective tools with proper context.

