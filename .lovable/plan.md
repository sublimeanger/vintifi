
# My Listings: Date Added + Comprehensive Filtering System

## What's Being Added

Two clear improvements to `src/pages/Listings.tsx`:

1. **Date Added display** — show the exact date (and local time) each item was listed, replacing the current `{daysListed}d` duration-only display with both the human-readable date and the relative days count.

2. **Filtering system** — a proper, expandable filter panel with multiple filter dimensions beyond the existing status chips: category, condition, price range, sort order, and health score range.

---

## Current State Analysis

### What already exists
- **Status chips** — "all", "active", "needs_optimising", "sold", "reserved", "inactive"
- **Search bar** — searches `title` and `brand` fields
- **`filteredListings`** — a single filter function that combines `searchQuery` + `statusFilter`
- **`getDaysListed()`** — calculates days from `created_at` using `Date.now()`, shows as `{daysListed}d` in a `Calendar` icon row
- **`Listing` type** — already includes `created_at: string`, `category`, `condition`, `current_price`, `health_score`

### What's missing
- No display of the actual `created_at` date/time — only the duration in days
- No filter by category, condition, price range, sort order, health band
- No sort control (currently always sorted by `created_at DESC` from the DB query)

---

## Changes to `Listings.tsx`

### 1. Date Added Display

**Where:** The metrics row on each listing card (line ~781 in the current file), next to the `Calendar` icon.

**Current output:**
```
📅 14d
```

**New output:**
```
📅 14d · 4 Feb, 09:41
```

**Implementation:**

Add a `formatAddedDate` helper function alongside the existing `getDaysListed`:

```tsx
function formatAddedDate(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
    ", " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
```

This uses the browser's `Intl` locale automatically — so a UK user sees "4 Feb, 09:41", a French user sees "4 févr., 09:41". No library required.

The `title` attribute on the calendar span gets the full ISO timestamp so hovering (on desktop) shows the precise moment.

**In the card render, replace:**
```tsx
<span className={`text-[10px] sm:text-xs flex items-center gap-0.5 ...`}>
  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
  {daysListed}d
</span>
```

**With:**
```tsx
<span
  className={`text-[10px] sm:text-xs flex items-center gap-0.5 ...`}
  title={new Date(listing.created_at).toLocaleString()}
>
  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
  {daysListed}d
  <span className="hidden sm:inline text-muted-foreground/70">
    · {formatAddedDate(listing.created_at)}
  </span>
</span>
```

On mobile: still shows `14d` (compact, preserves current mobile density).
On desktop (`sm:` breakpoint): shows `14d · 4 Feb, 09:41`.

---

### 2. Filter Panel

**Design approach:** A collapsible filter panel revealed by a "Filter" button next to the search bar. When any filter is active, the button shows a coloured dot/badge indicator so users know filters are applied. Filters work client-side (no DB round-trips — all data is already fetched).

#### New state variables

```tsx
const [showFilters, setShowFilters] = useState(false);
const [filterCategory, setFilterCategory] = useState<string>("all");
const [filterCondition, setFilterCondition] = useState<string>("all");
const [filterMinPrice, setFilterMinPrice] = useState<string>("");
const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
const [filterHealthBand, setFilterHealthBand] = useState<string>("all");  // all | good | fair | poor
const [sortBy, setSortBy] = useState<string>("newest");  // newest | oldest | price_high | price_low | health | days
```

#### Derived filter options (built from actual data)
Extract unique categories and conditions dynamically from the listings array so the dropdowns only show options that actually exist:

```tsx
const availableCategories = useMemo(() => 
  [...new Set(listings.map(l => l.category).filter(Boolean))].sort(),
  [listings]
);
const availableConditions = useMemo(() => 
  [...new Set(listings.map(l => l.condition).filter(Boolean))].sort(),
  [listings]
);
```

#### Updated `filteredListings` logic

The existing filter function (lines 249–259) is expanded to incorporate all new filters and the sort:

```tsx
const activeFilterCount = [
  filterCategory !== "all",
  filterCondition !== "all",
  filterMinPrice !== "",
  filterMaxPrice !== "",
  filterHealthBand !== "all",
  sortBy !== "newest",
].filter(Boolean).length;

const filteredListings = useMemo(() => {
  let result = listings.filter((l) => {
    // existing
    const matchesSearch = !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const isNeedsOptimising = statusFilter === "needs_optimising";
    if (isNeedsOptimising) return matchesSearch && l.status === "active" && !l.description && l.health_score == null;
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    
    // new filters
    const matchesCategory = filterCategory === "all" || l.category === filterCategory;
    const matchesCondition = filterCondition === "all" || l.condition === filterCondition;
    const price = l.current_price ?? l.recommended_price;
    const matchesMinPrice = filterMinPrice === "" || (price != null && price >= parseFloat(filterMinPrice));
    const matchesMaxPrice = filterMaxPrice === "" || (price != null && price <= parseFloat(filterMaxPrice));
    const matchesHealth = filterHealthBand === "all" ||
      (filterHealthBand === "good" && (l.health_score ?? 0) >= 80) ||
      (filterHealthBand === "fair" && (l.health_score ?? 0) >= 60 && (l.health_score ?? 0) < 80) ||
      (filterHealthBand === "poor" && (l.health_score ?? 0) < 60 && l.health_score != null);
    
    return matchesSearch && matchesStatus && matchesCategory && matchesCondition && matchesMinPrice && matchesMaxPrice && matchesHealth;
  });

  // sort
  result = [...result].sort((a, b) => {
    switch (sortBy) {
      case "oldest":    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "price_high": return (b.current_price ?? b.recommended_price ?? 0) - (a.current_price ?? a.recommended_price ?? 0);
      case "price_low":  return (a.current_price ?? a.recommended_price ?? 0) - (b.current_price ?? b.recommended_price ?? 0);
      case "health":     return (b.health_score ?? -1) - (a.health_score ?? -1);
      case "days":       return getDaysListed(b.created_at) - getDaysListed(a.created_at);
      default:           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest
    }
  });
  return result;
}, [listings, searchQuery, statusFilter, filterCategory, filterCondition, filterMinPrice, filterMaxPrice, filterHealthBand, sortBy]);
```

#### Filter UI — the search/filter row

Replace the current search row (lines 478–491):

```tsx
{/* Search + Filter Bar */}
<div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
  <div className="relative flex-1">
    <Search ... />
    <Input ... />
  </div>
  {/* Filter toggle button — shows dot badge if any filter active */}
  <Button
    variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
    size="icon"
    className="h-10 w-10 shrink-0 rounded-xl relative"
    onClick={() => setShowFilters(v => !v)}
    title="Filter listings"
  >
    <SlidersHorizontal className="w-3.5 h-3.5" />
    {activeFilterCount > 0 && (
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] text-white flex items-center justify-center font-bold">
        {activeFilterCount}
      </span>
    )}
  </Button>
  <Button variant="outline" size="icon" onClick={fetchListings} className="h-10 w-10 shrink-0 rounded-xl">
    <RefreshCw className="w-3.5 h-3.5" />
  </Button>
</div>
```

#### Filter panel (shown below search bar when `showFilters`)

```tsx
{showFilters && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    className="mb-3 sm:mb-4"
  >
    <Card className="p-3 sm:p-4 border-border/60 bg-muted/20">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        
        {/* Sort By */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Sort</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="price_high">Price: High → Low</SelectItem>
              <SelectItem value="price_low">Price: Low → High</SelectItem>
              <SelectItem value="health">Best health score</SelectItem>
              <SelectItem value="days">Listed longest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div>
          <label className="text-[10px] font-semibold ...">Category</label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger ...><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {availableCategories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Condition */}
        <div>
          <label ...>Condition</label>
          <Select value={filterCondition} onValueChange={setFilterCondition}>
            <SelectTrigger ...><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conditions</SelectItem>
              {availableConditions.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Price Min */}
        <div>
          <label ...>Min price (£)</label>
          <Input
            type="number"
            placeholder="0"
            value={filterMinPrice}
            onChange={e => setFilterMinPrice(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {/* Price Max */}
        <div>
          <label ...>Max price (£)</label>
          <Input
            type="number"
            placeholder="Any"
            value={filterMaxPrice}
            onChange={e => setFilterMaxPrice(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {/* Health Score Band */}
        <div>
          <label ...>Health</label>
          <Select value={filterHealthBand} onValueChange={setFilterHealthBand}>
            <SelectTrigger ...><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="good">Excellent (80+)</SelectItem>
              <SelectItem value="fair">Good (60–79)</SelectItem>
              <SelectItem value="poor">Needs work (&lt;60)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clear filters row */}
      {activeFilterCount > 0 && (
        <div className="flex justify-end mt-2 pt-2 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground gap-1.5"
            onClick={() => {
              setFilterCategory("all");
              setFilterCondition("all");
              setFilterMinPrice("");
              setFilterMaxPrice("");
              setFilterHealthBand("all");
              setSortBy("newest");
            }}
          >
            <X className="w-3 h-3" /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </Card>
  </motion.div>
)}
```

#### Result count line (between filter panel and status chips)

When filters are active, show a small "Showing X of Y listings" pill so users know how many results their filters returned:

```tsx
{activeFilterCount > 0 && !loading && (
  <p className="text-xs text-muted-foreground mb-2">
    Showing {filteredListings.length} of {listings.length} listings
  </p>
)}
```

---

## New Imports Needed

- `SlidersHorizontal` from `lucide-react` (filter icon)
- `useMemo` from `react` (for derived filter logic)

---

## What This Does NOT Change

- DB query is unchanged — still fetches all user listings on mount. All filtering is client-side, which is fast and avoids extra round-trips.
- Status chips row is unchanged — still works the same as before.
- Mobile layout is unchanged — the date addition is `sm:inline` only; the filter panel collapses to a 2-column grid on mobile.
- The `selectedIds` and bulk delete logic is unaffected.
- The card click navigation and inline editing are unaffected.

---

## File Changed

| File | Lines affected |
|------|---------------|
| `src/pages/Listings.tsx` | ~10 imports, ~6 new state vars, filter logic (~40 lines), filter UI (~80 lines), date display (~3 lines) |

Total: one file, no schema changes, no edge functions, no new dependencies.
