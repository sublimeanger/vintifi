

# Fix Photo Studio Mobile Experience

## Problem
On mobile, tapping a Quick Preset (e.g., "Marketplace Ready") or an operation causes a bottom sheet drawer to appear showing operation configuration. This drawer traps the user -- they can't easily proceed or find the Generate button. The experience feels broken and unusable.

## Root Cause
The `ConfigContainer` component renders a `ConfigDrawer` (vaul bottom sheet) on mobile. When operations or presets are selected, even though code tries to keep the drawer closed, the drawer's config content and the "Customize" button create a confusing flow where users get trapped in a modal overlay.

## Solution: Inline Config on Mobile (No Drawer)

Remove the bottom-sheet drawer pattern entirely on mobile. Instead, show configuration inline in the page flow, matching how desktop already works with a scrollable config panel.

### Changes

**1. `src/pages/Vintography.tsx` -- Mobile layout overhaul**

- Remove the "Customize [Operation]" button (lines 796-804) that opens the drawer
- Remove the `ConfigContainer` / drawer usage on mobile (lines 807-815)  
- Instead, render the config content (`renderActiveConfig()`) inline between the Operation Bar and the Generate button
- Keep the Generate button always visible and never inside a drawer
- Show config as a collapsible/expandable inline section (using Collapsible from Radix) so users can optionally see settings without being trapped
- The mobile layout order becomes:
  1. Canvas (photo preview)
  2. Quick Presets strip
  3. Choose Effect (Operation Bar) + Pipeline Strip
  4. Inline config (collapsible, default expanded for ops with options, collapsed for simple ones like Clean BG / Enhance)
  5. Generate button (always visible, never in a modal)
  6. Result actions

**2. `src/components/vintography/SimpleOperationConfig.tsx`** -- Keep as-is (info-only cards for clean_bg/enhance)

**3. Remove drawer state dependency on mobile** -- The `drawerOpen` state and `SET_DRAWER_OPEN` dispatches for mobile become unnecessary since config is always inline.

### Technical Details

- Use Radix `Collapsible` component (already installed) for the inline config section
- Auto-expand for operations that have configurable options (lifestyle_bg, flatlay, mannequin, ai_model, decrease)
- Auto-collapse for simple operations (clean_bg, enhance) since they just show info text
- The collapsible header shows the operation name + a chevron toggle
- Generate button stays fixed at the bottom of the visible flow, never inside any overlay
- Desktop layout remains completely unchanged

### What This Fixes
- No more trapping drawer on preset/operation selection
- Generate button always visible and reachable
- Users can see and adjust config without modal context switches
- Smooth, native-feeling scroll experience
- One-tap flow: select preset, hit Generate

