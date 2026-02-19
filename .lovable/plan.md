

# Switch Photo Studio to Google Gemini API Direct

## Why

The Lovable AI gateway (`ai.gateway.lovable.dev`) is returning 500 errors for all image operations. Your `GOOGLE_AI_API_KEY` secret is already configured, so we can bypass the gateway entirely and call Google's Gemini API directly.

## Changes -- All in `supabase/functions/vintography/index.ts`

### 1. Update MODEL_MAP to Google's native model names

Remove the `google/` prefix from all model names:
- `google/gemini-2.5-flash-image` becomes `gemini-2.5-flash-image`
- `google/gemini-3-pro-image-preview` becomes `gemini-3-pro-image-preview`

### 2. Switch API key from LOVABLE_API_KEY to GOOGLE_AI_API_KEY

Replace the `lovableApiKey` lookup with `googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY")`.

### 3. Replace the AI gateway call with Google's native API

Instead of calling `ai.gateway.lovable.dev/v1/chat/completions` with OpenAI-compatible format, call `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with Google's native format:

- Fetch the source image, convert to base64 in chunks (avoids stack overflow)
- Send as `inlineData` with `mimeType` in Google's `contents/parts` structure
- Use `generationConfig.responseModalities: ["TEXT", "IMAGE"]`
- Auth via `x-goog-api-key` header instead of `Authorization: Bearer`

### 4. Update response parsing

Google returns images in `candidates[0].content.parts[].inlineData.data` (raw base64) instead of `choices[0].message.images[0].image_url.url` (data URL). This means the existing `.replace(/^data:image\/\w+;base64,/, "")` line is no longer needed -- Google gives raw base64 directly.

### 5. Better error handling

- Detect and report safety filter blocks (`finishReason === "SAFETY"`)
- Log text-only responses for debugging when no image is returned
- Handle 429 rate limits from Google's API

## What stays the same

- All prompts (OPERATION_PROMPTS, QUALITY_MANDATE, NO_TEXT, GARMENT_PRESERVE)
- Auth, tier checking, credit logic
- Job creation and status updates
- Image upload to storage
- Credit deduction
- Everything in the frontend

## Technical detail

The key payload difference:

```text
BEFORE (Lovable Gateway - OpenAI format):
  POST ai.gateway.lovable.dev/v1/chat/completions
  { model, messages: [{ role: "user", content: [{ type: "text" }, { type: "image_url" }] }], modalities }

AFTER (Google Direct):
  POST generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
  { contents: [{ parts: [{ text }, { inlineData: { mimeType, data } }] }], generationConfig: { responseModalities } }
```

