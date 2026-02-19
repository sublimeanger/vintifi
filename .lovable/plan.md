

# Autosave Photo Studio Progress

## What Gets Saved

When you're working in the Photo Studio and need to close your browser or step away, your session will be automatically saved and restored when you come back. This includes:

- Which photo you selected
- Your chosen effects/operations and their settings (e.g., background style, model pose)
- The result photo if one was already generated

## How It Works

- Your progress saves automatically every time you make a change (select a photo, pick a preset, adjust settings)
- When you reopen the Photo Studio, everything is restored exactly where you left off
- A small toast notification confirms your session was restored
- A "Start Fresh" button lets you clear the saved session if you want to begin from scratch
- The save is per-user and stored locally on your device (no extra server calls)

## Technical Details

### Storage Mechanism
- Use `localStorage` with a key like `vintography_draft_{userId}` to persist state
- Save a serializable snapshot: `{ originalPhotoUrl, resultPhotoUrl, pipeline, activePipelineIndex, garmentContext, timestamp }`
- Debounce writes (500ms) so rapid changes don't thrash localStorage

### Save Trigger (`src/pages/Vintography.tsx`)
- Add a `useEffect` that watches `state.originalPhotoUrl`, `state.pipeline`, `state.activePipelineIndex`, and `state.resultPhotoUrl`
- On change, debounce-write the snapshot to localStorage
- Only save when there's an actual photo selected (don't save empty state)

### Restore on Mount (`src/pages/Vintography.tsx`)
- On component mount, check localStorage for a saved draft
- If found and less than 24 hours old, restore the state via dispatches:
  - `SET_ORIGINAL_PHOTO` with the saved URL
  - `REPLACE_PIPELINE` with the saved pipeline
  - `SET_RESULT_PHOTO` if a result existed
- Show a toast: "Session restored"
- If older than 24 hours, discard it (photo URLs may have expired)

### Clear on Completion
- After a successful "Save to Item" action, clear the localStorage draft
- The `RESET_ALL` dispatch should also trigger clearing the draft

### No New Dependencies
- Uses existing `localStorage` API and `useEffect` / `useRef` for debouncing
- No database changes needed — this is device-local persistence

