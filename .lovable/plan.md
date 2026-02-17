

# Overhaul AI Prompts for Real Vinted Intelligence

## The Problems

### 1. Price Check AI Insights mention irrelevant things (board games, etc.)
The `ai_insights` field in the price-check prompt is defined only as "2-3 paragraphs explaining the pricing rationale" with zero constraints on what to include or avoid. The AI fills this with generic filler because it has no specific guidance.

### 2. Listing descriptions sound like ChatGPT wrote them
The optimize-listing prompt uses phrasing like "compelling opening that creates desire" and "reference the brand's reputation, the item's rarity, versatility". This practically begs the AI to use words like "elevate", "sophisticated", "timeless", "versatile" -- the exact language that screams AI-generated and turns off savvy Vinted buyers.

### 3. Too many hashtags
The prompt asks for 10-15 hashtags. Real Vinted sellers with 2,000+ transactions say **1-3 compound hashtags max**. Vinted does not work like Instagram. Long hashtag lists look spammy and unprofessional.

### 4. Description structure is robotic
The current structure forces a bulleted "Key Details" section (`Brand: [brand] / Size: [size]`). Top-performing Vinted listings use **full, conversational sentences** that feel like a friend describing the item. Buyers on Vinted respond to authenticity, not corporate product pages.

---

## The Fix

### Changes to `supabase/functions/price-check/index.ts`

**Rewrite the `ai_insights` prompt section** to give the AI extremely specific guidance on what to include:

- Specific, actionable pricing strategy for THIS item (not generic advice)
- When to list (day of week, time) based on the category
- How long to hold the price before dropping
- Whether to accept offers or hold firm
- Competitive positioning (where this item sits vs the market)
- A "seller action plan" in 2-3 sentences

**Add a BANNED WORDS list** to the system prompt:
"NEVER use these words: elevate, sophisticated, timeless, versatile, effortless, staple, wardrobe essential, investment piece, must-have, perfect addition, stunning, gorgeous, absolutely, boasts, game-changer"

**Add STRICT CONSTRAINTS** to the insights:
"Your insights must ONLY reference the specific item being priced and the comparable data provided. Never mention unrelated categories, items, or markets. Every sentence must contain a specific number, date, or actionable recommendation."

**Upgrade the model** from `gemini-3-flash-preview` to `gemini-2.5-pro` for price checks -- this is a high-value action that justifies the better model for accuracy.

### Changes to `supabase/functions/optimize-listing/index.ts`

**Complete rewrite of the description prompt** based on research from sellers with 2,000+ Vinted transactions:

- **Tone**: Conversational, honest, like texting a friend about something you're selling. NOT marketing copy.
- **Structure**: Full flowing sentences. Describe the feel of the fabric, how it fits, what you'd wear it with, and be upfront about condition. No bulleted lists.
- **Measurements prompt**: "If you have measurements, include them. If not, mention fit guidance like 'runs true to size' or 'slightly oversized'."
- **Hashtags reduced to 3-5 compound hashtags** that mirror real buyer search terms (e.g. `#nikecrew`, `#menssweatshirt`, `#streetwearuk`) -- not 10-15 generic tags.
- **Banned words list**: Same list as price check, plus: "boasts", "trendy", "chic", "standout", "stunning", "exquisite", "premium quality", "top-notch", "game-changer", "level up", "take your wardrobe to the next level"
- **Anti-AI phrasing rule**: "Write like a real person selling their own clothes. Use casual British English. Contractions are fine. Short sentences are fine. The buyer should feel like they're reading a message from someone genuine, not a product page."
- **Real examples**: Include 2-3 example descriptions based on the research (conversational full-sentence style)

**Upgrade the model** for photo-based optimisation: keep `gemini-2.5-pro` for photos but upgrade the no-photo path from `gemini-2.5-flash` to `gemini-2.5-pro` as well -- listing quality is the core product.

---

## Technical Details

| File | Change |
|------|--------|
| `supabase/functions/price-check/index.ts` | Rewrite system prompt + ai_insights specification + banned words + upgrade model |
| `supabase/functions/optimize-listing/index.ts` | Rewrite description prompt + reduce hashtags to 3-5 + banned words + anti-AI tone rules + upgrade no-photo model |

### New AI Insights Structure (Price Check)

The `ai_insights` field will be instructed to return exactly 3 focused paragraphs:

1. **Market Position** (2-3 sentences): Where this specific item sits in the current market. Reference actual comparable prices from the data. State whether the market is saturated or underserved for this exact item.

2. **Pricing Strategy** (2-3 sentences): Concrete advice. "List at X for the first 7 days. If no sale, drop to Y. Accept offers above Z." Include best day/time to list based on category (weekday evenings for menswear, Sunday for womenswear).

3. **Seller Edge** (1-2 sentences): One specific insight that gives the seller an advantage. Could be: "Only 3 of these in this size currently listed" or "This brand's resale value has increased 15% in the last quarter" or "Bundle with another Nike item -- bundled listings sell 40% faster on Vinted."

### New Description Style (Optimize Listing)

Instead of the current robotic template, the new prompt will produce descriptions like:

"Really nice Nike crewneck sweatshirt in black, size M. The cotton blend makes it properly warm without being too heavy -- perfect for layering or wearing on its own. Fits true to size with a relaxed but not baggy cut.

In very good condition -- worn a handful of times and well looked after. No marks, no bobbling, just a solid everyday piece.

Comes from a smoke-free home. Happy to answer any questions about fit or bundle with other items for a discount.

Shipped within 1-2 days.

#nikecrew #menssweatshirt #streetwearuk"

This reads like a real person, not an AI. That is the difference.

### No database changes needed
### No frontend changes needed -- prompts are entirely backend

