
# Design System Upgrade — CSS & Config Only

A pure visual refresh. No component logic, page structure, or functionality changes. Only 3 files are touched.

---

## What changes

### 1. `index.html`
- Remove the current Google Fonts link (Plus Jakarta Sans + Inter)
- Add new Google Fonts link: **Sora** (display/headings), **DM Sans** (body), **JetBrains Mono** (mono/prices)
- Update the meta description to be photo-led

### 2. `tailwind.config.ts`
- Update `fontFamily` to use `DM Sans` as `sans`, `Sora` as `display`, `JetBrains Mono` as `mono`
- Add `boxShadow` tokens: `coral` and `coral-hover` (warm coral glow shadows)
- Update `borderRadius` tokens to slightly rounder values (sm: 6px, md/DEFAULT: 10px, lg: 14px, xl: 20px, 2xl: 26px)

### 3. `src/index.css`
- Replace `:root` CSS custom properties: warmer cream background (`30 15% 98%`), slightly warmer charcoal foreground, updated sidebar dark navy, coral primary bumped to `350 80% 58%`
- Replace `.dark` CSS custom properties with matching warm-dark values
- Confirm no hardcoded `font-family: Inter` or `Plus Jakarta Sans` strings remain

---

## What does NOT change
- No `.tsx` component files
- No page layouts or routes
- No edge functions
- No `constants.ts`
- No functionality whatsoever

---

## Technical detail

| Token | Before | After |
|---|---|---|
| `--background` | `220 20% 97%` (cool grey) | `30 15% 98%` (warm cream) |
| `--primary` | `350 75% 55%` | `350 80% 58%` (slightly punchier coral) |
| `font-sans` | Inter | DM Sans |
| `font-display` | Plus Jakarta Sans | Sora |
| `font-mono` | — | JetBrains Mono |
| `borderRadius.lg` | `var(--radius)` | `14px` |
| `--radius` | `0.75rem` | `0.625rem` |
