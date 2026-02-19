

## Fix: Ghost Mannequin 500 Error

### Root Cause

The 500 error happens because you're selecting "Mannequin" from the operation bar, then choosing "Ghost / Invisible" type. This sends the operation `mannequin_shot` with `mannequin_type: "ghost"` to the backend -- which triggers a massive prompt (~2000 words) that, combined with the base64 image (~3.3MB), creates a payload too large for the AI gateway to handle.

Meanwhile, the new dedicated `ghost_mannequin` operation (short, focused prompt) works fine -- but it's only reachable via the "Ghost to Clean" preset right now.

### Fix

Automatically reroute at the backend: when the edge function receives `mannequin_shot` with `mannequin_type: "ghost"`, silently swap it to the `ghost_mannequin` operation. This way:

- Users picking "Ghost / Invisible" from the Mannequin config get the better, shorter prompt
- The Ghost to Clean preset keeps working as-is
- No UI changes needed -- the backend just does the right thing

### Technical Changes

**File: `supabase/functions/vintography/index.ts`**

After parsing the request body (around line 430), add a reroute check:

```typescript
// Auto-reroute ghost mannequin type to dedicated operation
if (operation === "mannequin_shot" && parameters?.mannequin_type === "ghost") {
  operation = "ghost_mannequin";
}
```

This is a 3-line change. Then redeploy the edge function.

### Why This Works

- The `ghost_mannequin` prompt is ~200 words vs ~2000 for `mannequin_shot` ghost variant
- Smaller prompt + base64 image stays within gateway limits
- The ghost_mannequin prompt is already optimised for this exact use case
- Credit cost correctly becomes 2 (ghost_mannequin pricing) instead of 1 (mannequin_shot pricing)

### What Stays the Same

- Headless, dress form, and half-body mannequin types still use `mannequin_shot` as before
- All UI components unchanged
- Ghost to Clean preset unchanged
