
# Fix: Kill the Ghost Drawer on Mobile

## Root Cause

Two issues combine to create the bug:

1. **Reducer auto-opens drawer**: `REPLACE_PIPELINE`, `ADD_PIPELINE_STEP`, and `SET_ACTIVE_PIPELINE_INDEX` all set `drawerOpen: true` unconditionally
2. **Portal escapes CSS hiding**: The desktop `ConfigContainer` (line 898) sits inside a `hidden lg:grid` div, but `ConfigDrawer` uses vaul's `Drawer` which portals to `document.body` -- so it renders on mobile regardless of the parent being hidden

## Fix (3 small changes)

### 1. `src/components/vintography/vintographyReducer.ts` -- Stop auto-opening drawer

Change three reducer cases to NOT set `drawerOpen: true`:

- **REPLACE_PIPELINE** (around line 116): change `drawerOpen: true` to `drawerOpen: false`
- **ADD_PIPELINE_STEP** (around line 100): change `drawerOpen: true` to `drawerOpen: false`  
- **SET_ACTIVE_PIPELINE_INDEX** (line 109): change `drawerOpen: true` to `drawerOpen: false`

The desktop code in `Vintography.tsx` already passes `open={true}` hardcoded to `ConfigContainer`, so the desktop panel is always visible regardless of `drawerOpen` state. The explicit `SET_DRAWER_OPEN` dispatch in `handleOpSelect` on desktop still works.

### 2. `src/pages/Vintography.tsx` -- Desktop handleOpSelect cleanup

In `handleOpSelect`, the existing code dispatches `SET_DRAWER_OPEN` for desktop only (`if (!isMobile)`). This stays as-is -- it's already correct.

### 3. `src/pages/Vintography.tsx` -- Remove stale mobile SET_DRAWER_OPEN dispatches

The `handlePresetSelect` and `handleSavedPresetSelect` functions have lines like:
```
if (isMobile) dispatch({ type: "SET_DRAWER_OPEN", open: false });
```
These become unnecessary since the reducer no longer opens the drawer. Remove them to clean up dead code.

## What This Fixes

- Tapping a Quick Preset on mobile no longer triggers a bottom-sheet drawer
- The inline collapsible config + Generate button remain visible and accessible
- Desktop layout is completely unaffected (ConfigContainer uses hardcoded `open={true}`)
- One-tap flow restored: select preset then hit Generate
