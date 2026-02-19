

## Fix: Remove Broken Base64 Conversion from Vintography Edge Function

### What Happened

A base64 image conversion was recently added to the edge function to work around a suspected gateway issue. But the conversion code crashes on any image larger than ~65KB due to JavaScript's call stack limit, causing **every** Photo Studio operation to fail silently with "AI did not return an image."

The HEIC conversion is unrelated -- it runs in the browser and is working correctly.

### The Fix

**File: `supabase/functions/vintography/index.ts`**

**Remove the base64 conversion block** (lines ~533-551 from the last diff) that converts `image_url` to a data URL. Revert to sending the original `image_url` directly to the gateway, which is how it worked before.

Specifically, remove:
- The `let imageDataUrl = image_url;` variable
- The entire `if (image_url.startsWith("http"))` block with the fetch/btoa logic
- Change `imageDataUrl` back to `image_url` in the message content

This restores the exact behavior from when everything was working.

**Also verify the MODEL_MAP** is correct:
- `model_shot` -> `google/gemini-3-pro-image-preview` (photorealistic AI models only)
- All other operations -> `google/gemini-2.5-flash-image`

### Deployment

Redeploy the `vintography` edge function after the change.

