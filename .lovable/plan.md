

# Vintography: AI Photo Studio for Vinted Sellers

## Is It Worth Building?

**Short answer: Yes, absolutely.** Here's why:

### The Problem
Photos are the #1 factor in Vinted sales conversion. Yet most sellers use cluttered backgrounds, poor lighting, and flat-lay shots that make items look cheap. Professional sellers on Depop and eBay use clean white backgrounds and model shots — Vinted sellers don't have access to these tools affordably.

### Market Validation
- **Photoroom** (background removal app) has 150M+ downloads and charges $9.99/month — proving massive demand for this exact use case
- **Vinted's own advice** repeatedly emphasises clean, well-lit photos as the top tip for selling faster
- Sellers report 20-40% faster sales with clean background photos vs cluttered bedroom shots
- "Virtual try-on" and "on-model" features are the hottest trend in e-commerce AI right now

### Strategic Value for VintEdge
- Creates a **sticky daily-use feature** (sellers photograph items constantly)
- Natural **upsell moment** — free tier gets basic background removal, paid tiers get model placement
- Completes the listing workflow: Price Check -> Vintography -> Optimise Listing -> Publish
- **Differentiator** — no Vinted-specific tool offers this today

### Cost Reality Check
- Lovable AI already includes **google/gemini-2.5-flash-image** and **google/gemini-3-pro-image-preview** for image generation — no additional API keys needed
- Background removal via AI image editing is included in the existing Lovable AI quota
- Storage already set up (`listing-photos` bucket with RLS policies)
- Estimated cost per edit: fractions of a penny via Gemini models

**Verdict: High value, low incremental cost, strong differentiation. Build it.**

---

## What Vintography Will Do

### Core Features

| Feature | Description | Tier |
|---------|-------------|------|
| **Background Removal** | Remove cluttered backgrounds, replace with clean white/gradient | Free (3/mo) |
| **Smart Backgrounds** | AI-generated contextual backgrounds (e.g., wooden floor for vintage, studio for designer) | Pro |
| **Virtual Model** | Place garment on an AI-generated model (select gender, pose, body type) | Business |
| **Photo Enhancement** | Auto-adjust lighting, contrast, sharpness for professional look | Free (3/mo) |
| **Batch Processing** | Process multiple photos at once for bulk listings | Business |
| **Vinted-Ready Export** | Crop to Vinted's preferred aspect ratio, optimise file size | All tiers |

### User Flow

```text
Upload/Import Photo(s)
        |
        v
  Choose Enhancement
  [Remove BG] [Smart BG] [Model Shot] [Enhance]
        |
        v
  AI Processing (3-8 seconds)
        |
        v
  Before/After Preview (swipe slider)
        |
        v
  [Download] [Use in Listing Optimiser] [Save to Gallery]
```

---

## Technical Implementation Plan

### 1. New Edge Function: `vintography`

Creates a new backend function that:
- Accepts the original photo URL (from `listing-photos` bucket or remote URL)
- Accepts the operation type: `remove_bg`, `smart_bg`, `model_shot`, `enhance`
- Accepts optional parameters (background style, model gender/pose)
- Calls **Lovable AI** with `google/gemini-2.5-flash-image` (or `gemini-3-pro-image-preview` for model shots)
- Uploads the result to a new `vintography` storage bucket
- Returns the processed image URL
- Deducts a credit from the user's usage

### 2. New Storage Bucket: `vintography`

- Public bucket for processed images
- Same RLS pattern as `listing-photos` (users can only write to their own folder)

### 3. New Database Table: `vintography_jobs`

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Job ID |
| user_id | UUID (FK) | Owner |
| original_url | TEXT | Source image |
| processed_url | TEXT | Result image |
| operation | TEXT | remove_bg / smart_bg / model_shot / enhance |
| parameters | JSONB | Background style, model config, etc. |
| status | TEXT | processing / completed / failed |
| created_at | TIMESTAMPTZ | Timestamp |

### 4. New Page: `/vintography`

- Photo upload area (drag-and-drop + camera on mobile)
- Operation selector (4 cards: Remove BG, Smart BG, Model Shot, Enhance)
- Before/After comparison slider
- Gallery of previous edits
- "Use in Listing" button that navigates to Optimise Listing with the processed photo
- Mobile-first design with large touch targets
- UseCaseSpotlight component for empty state

### 5. Feature Gating

- Add `vintography` to `useFeatureGate` hook
- Free tier: 3 basic edits/month (remove_bg + enhance only)
- Pro tier: 15 edits/month (all operations)
- Business/Scale: 50+ edits/month (all operations + batch)

### 6. Navigation Integration

- Add "Vintography" to sidebar under a new "Studio" group
- Add to mobile bottom nav
- Add Journey Banner connection: Optimise Listing -> "Enhance your photos first?" -> Vintography

### 7. Credit Tracking

- Add `vintography_used` column to `usage_credits` table
- Track per-operation usage

---

## Implementation Sequence

| Step | What | Files Affected |
|------|------|---------------|
| 1 | Create `vintography` storage bucket + `vintography_jobs` table | New migration |
| 2 | Add `vintography_used` to `usage_credits` | Migration |
| 3 | Create `vintography` edge function | `supabase/functions/vintography/index.ts` |
| 4 | Add feature gate config | `src/hooks/useFeatureGate.ts` |
| 5 | Build Vintography page with upload, operation cards, before/after slider | `src/pages/Vintography.tsx` |
| 6 | Add route + sidebar nav item | `src/App.tsx`, `src/pages/Dashboard.tsx` |
| 7 | Add Journey Banner links from Optimise Listing | `src/pages/OptimizeListing.tsx` |
| 8 | Update config.toml | `supabase/config.toml` |

---

## Key Technical Decisions

- **Gemini Flash Image** for background removal and enhancement (fast, cheap)
- **Gemini 3 Pro Image Preview** for model shots (higher quality needed for realistic body rendering)
- All processing server-side via edge function (keeps API keys secure, consistent results)
- Processed images stored in dedicated bucket (not mixed with originals)
- Before/After slider using CSS `clip-path` (no additional dependencies)

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| AI model produces unrealistic model shots | Use specific prompts with clothing-on-mannequin as fallback; let users regenerate |
| Large images slow down processing | Resize to max 1500px before sending to AI; show skeleton loader |
| Users abuse free tier | Rate limit at edge function level; track in database |
| Gemini rate limits | Queue system with retry; show "processing" status |

